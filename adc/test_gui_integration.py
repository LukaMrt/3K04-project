"""GUI integration tests. Run with a display (Windows/macOS or xvfb-run on Linux).

The original Python safety modules remain the source of truth. These tests
exercise GUI buttons and pages with the actual backend to catch wiring errors.
"""
import os
import tkinter as tk
import unittest

from adc_gui import ADCDesktopApp
from models import Severity, Mode


def descendants(widget):
    for child in widget.winfo_children():
        yield child
        yield from descendants(child)


def button_named(root, name):
    buttons = [w for w in descendants(root)
               if isinstance(w, tk.Button) and name in w.cget("text")]
    if not buttons:
        raise AssertionError("Button not found: " + name)
    return buttons[0]


class DesktopWorkflowTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        try:
            r = tk.Tk()
            r.withdraw()
            r.destroy()
        except tk.TclError as exc:
            raise unittest.SkipTest("No graphical display available: " + str(exc))

    def setUp(self):
        self.root = tk.Tk()
        self.root.withdraw()
        self.gui = ADCDesktopApp(self.root, auto_status=False)
        self.root.update_idletasks()

    def tearDown(self):
        self.gui._closing = True
        self.root.destroy()

    def login(self, user, password):
        self.gui.app.current_user = self.gui.app.auth.login(user, password)
        self.gui.page = "Overview"
        self.gui._draw()
        self.root.update_idletasks()

    def test_all_nurse_pages_open_and_restricted_navigation(self):
        self.login("nurse1", "Nurse123!!!")
        for page in ("Overview", "Inventory", "Dispense", "Faults", "Monitoring"):
            self.gui._navigate(page)
            self.root.update_idletasks()
        self.assertEqual(str(self.gui.nav_buttons["Audit Log"].cget("state")), "disabled")
        self.assertEqual(str(self.gui.nav_buttons["Settings"].cget("state")), "disabled")

    def test_full_dispense_via_gui_buttons_and_textfield(self):
        self.login("nurse1", "Nurse123!!!")
        self.gui._navigate("Dispense")
        button_named(self.root, "Validate and unlock").invoke()
        self.assertTrue(self.gui.app.hardware.is_open())
        self.assertIsNotNone(self.gui.app.dispensing.pending_dispense())
        button_named(self.root, "Close simulated drawer").invoke()
        self.assertFalse(self.gui.app.hardware.is_open())
        # The confirmed amount is one by default; user must deliberately finish.
        button_named(self.root, "Confirm actual quantity").invoke()
        self.assertEqual(self.gui.app.store.get_medication("MED-001").quantity, 9)
        self.assertIsNone(self.gui.app.dispensing.pending_dispense())

    def test_cancel_quarantines_inventory(self):
        self.login("nurse1", "Nurse123!!!")
        self.gui._navigate("Dispense")
        button_named(self.root, "Validate and unlock").invoke()
        button_named(self.root, "Cancel / quantity uncertain").invoke()
        self.assertFalse(self.gui.app.store.get_medication("MED-001").available)
        self.assertFalse(self.gui.app.hardware.is_open())

    def test_fault_close_failure_recovery_closes_drawer(self):
        self.login("pharm1", "Pharm123!!!")
        self.gui.app.hardware.fail_close = True
        self.gui.app.dispensing.start_dispense(self.gui.app.current_user, "MED-001", 1, "GUI-FAULT-1")
        with self.assertRaises(RuntimeError):
            self.gui.app.dispensing.close_dispense_drawer(self.gui.app.current_user)
        self.assertTrue(self.gui.app.hardware.is_open())
        self.assertEqual(self.gui.app.faults.mode, Mode.FAULT)
        self.gui._navigate("Faults")
        trees = [w for w in descendants(self.root) if isinstance(w, __import__('tkinter.ttk').ttk.Treeview)]
        self.assertTrue(trees)
        tree = trees[0]
        self.assertTrue(tree.get_children())
        tree.selection_set(tree.get_children()[0])
        button_named(self.root, "Simulate cause resolved").invoke()
        self.assertFalse(self.gui.app.hardware.is_open())
        # Rebuilt page needs the corresponding active fault selected again.
        tree = [w for w in descendants(self.root) if isinstance(w, __import__('tkinter.ttk').ttk.Treeview)][0]
        tree.selection_set(tree.get_children()[0])
        button_named(self.root, "Clear selected fault").invoke()
        self.assertEqual(self.gui.app.faults.mode, Mode.NORMAL)
        self.assertFalse(self.gui.app.faults.active_faults())

    def test_admin_pages_and_maintenance(self):
        self.login("admin1", "Admin123!!!")
        self.gui._navigate("Settings")
        button_named(self.root, "Enter Maintenance").invoke()
        self.assertEqual(self.gui.app.faults.mode, Mode.MAINTENANCE)
        button_named(self.root, "Exit Maintenance").invoke()
        self.assertEqual(self.gui.app.faults.mode, Mode.NORMAL)
        self.gui._navigate("Audit Log")

    def test_session_expiry_cancels_pending_and_quarantines(self):
        self.login("nurse1", "Nurse123!!!")
        self.gui.app.dispensing.start_dispense(self.gui.app.current_user, "MED-001", 1, "GUI-EXPIRY-1")
        self.gui._expire_session()
        self.assertIsNone(self.gui.app.current_user)
        self.assertIsNone(self.gui.app.dispensing.pending_dispense())
        self.assertFalse(self.gui.app.store.get_medication("MED-001").available)

    def test_monitor_status_cycle_and_simulated_ack(self):
        self.login("admin1", "Admin123!!!")
        self.gui._navigate("Monitoring")
        button_named(self.root, "Send status cycle").invoke()
        self.assertGreater(self.gui.app.monitor.pending_count(), 0)
        button_named(self.root, "Toggle simulated connection").invoke()
        self.assertTrue(self.gui.app.monitor.connected)
        self.assertEqual(self.gui.app.monitor.pending_count(), 0)


if __name__ == "__main__":
    unittest.main()
