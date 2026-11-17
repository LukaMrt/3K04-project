"""Regression tests for Deliverable 2 demo safety fixes."""
import time
import unittest

from adc_app import ADCApplication
from models import Mode, Severity, new_id


class SafetyRegressionTests(unittest.TestCase):
    def setUp(self):
        self.app = ADCApplication()
        self.nurse = self.app.store.get_user("nurse1")
        self.pharm = self.app.store.get_user("pharm1")
        self.admin = self.app.store.get_user("admin1")
        self.med = self.app.store.get_medication("MED-001")

    def fill_event_log(self, capacity=1):
        self.app.logger.EVENT_CAPACITY = capacity
        for index in range(capacity):
            self.app.logger.record("FILL", None, {"index": index})

    def test_full_audit_log_cannot_modify_stock_by_replenishment(self):
        self.fill_event_log()
        with self.assertRaises(RuntimeError):
            self.app.inventory.replenish(self.pharm, "MED-001", 1)
        self.assertEqual(10, self.med.quantity)
        self.assertEqual(1, len(self.app.logger.events()))

    def test_full_audit_log_cannot_modify_stock_by_correction(self):
        self.fill_event_log()
        with self.assertRaises(RuntimeError):
            self.app.inventory.correct_quantity(self.pharm, "MED-001", 3)
        self.assertEqual(10, self.med.quantity)

    def test_full_audit_log_cannot_modify_availability(self):
        self.fill_event_log()
        with self.assertRaises(RuntimeError):
            self.app.inventory.mark_unavailable(self.pharm, "MED-001")
        self.assertTrue(self.med.available)

    def test_full_audit_log_cannot_register_medication_or_policy(self):
        self.fill_event_log()
        with self.assertRaises(RuntimeError):
            self.app.inventory.add_medication(self.pharm, "X", "1 mg", "P", 1, "Container 3")
        self.assertEqual(2, len(self.app.store.medications))
        with self.assertRaises(RuntimeError):
            self.app.inventory.set_policy(self.pharm, "POLICY-NEW", 1, 100)
        self.assertNotIn("POLICY-NEW", self.app.store.policies)

    def test_fault_mode_blocks_all_normal_inventory_mutations(self):
        fault = self.app.faults.raise_fault(Severity.ERROR, "DRAWER", "test")
        ops = (
            lambda: self.app.inventory.replenish(self.pharm, "MED-001", 1),
            lambda: self.app.inventory.correct_quantity(self.pharm, "MED-001", 3),
            lambda: self.app.inventory.mark_unavailable(self.pharm, "MED-001"),
            lambda: self.app.inventory.add_medication(self.pharm, "X", "1mg", "P", 1, "Container 3"),
            lambda: self.app.inventory.set_policy(self.pharm, "NEW", 1, 10),
            lambda: self.app.inventory.assign_policy_group(self.pharm, "MED-001", "POLICY-DEFAULT"),
        )
        for op in ops:
            with self.assertRaises(PermissionError):
                op()
        self.assertEqual(10, self.med.quantity)
        self.assertTrue(self.med.available)
        self.app.faults.resolve_condition(fault.fault_id)
        self.app.faults.clear_fault(fault.fault_id, self.pharm)
        self.app.inventory.replenish(self.pharm, "MED-001", 1)
        self.assertEqual(11, self.med.quantity)

    def test_maintenance_blocks_normal_inventory_mutations(self):
        self.app.faults.enter_maintenance(self.admin)
        with self.assertRaises(PermissionError):
            self.app.inventory.replenish(self.pharm, "MED-001", 1)
        self.app.faults.exit_maintenance(self.admin)
        self.assertEqual(Mode.NORMAL, self.app.faults.mode)

    def test_open_drawer_blocks_inventory_mutation(self):
        rid = new_id("REQ")
        self.app.dispensing.start_dispense(self.nurse, "MED-001", 2, rid)
        self.assertTrue(self.app.hardware.is_open())
        self.assertEqual(10, self.med.quantity)
        with self.assertRaises(PermissionError):
            self.app.inventory.replenish(self.pharm, "MED-001", 1)
        self.app.dispensing.close_dispense_drawer(self.nurse)
        self.assertFalse(self.app.hardware.is_open())
        self.assertEqual(10, self.med.quantity)
        self.app.dispensing.complete_dispense(self.nurse, 1)
        self.assertEqual(9, self.med.quantity)
        self.assertIn(rid, self.app.store.completed_requests)
        event = self.app.logger.events()[-1]
        self.assertEqual("DISPENSE_COMPLETED", event.event_type)
        self.assertEqual("SUCCESS", event.outcome)

    def test_unconfirmed_withdrawal_marks_inventory_unavailable(self):
        self.app.dispensing.start_dispense(self.nurse, "MED-001", 1, "REQ-CANCEL")
        self.app.dispensing.close_dispense_drawer(self.nurse)
        self.app.dispensing.cancel_dispense(self.nurse)
        self.assertEqual(10, self.med.quantity)
        self.assertFalse(self.med.available)
        self.assertIsNone(self.app.dispensing.pending_dispense())
        with self.assertRaises(ValueError):
            self.app.dispensing.dispense(self.nurse, "MED-001", 1, "REQ-NEXT", 1)
        self.app.inventory.correct_quantity(self.pharm, "MED-001", 10)
        self.assertTrue(self.med.available)

    def test_failed_close_enters_fault_and_quarantines_inventory(self):
        self.app.dispensing.start_dispense(self.nurse, "MED-001", 1, "REQ-CLOSE")
        self.app.hardware.fail_close = True
        with self.assertRaises(RuntimeError):
            self.app.dispensing.close_dispense_drawer(self.nurse)
        self.assertEqual(Mode.FAULT, self.app.faults.mode)
        self.assertFalse(self.med.available)
        self.assertEqual(10, self.med.quantity)
        self.assertIsNone(self.app.dispensing.pending_dispense())
        self.assertTrue(self.app.hardware.is_open())

    def test_failed_unlock_enters_fault_before_logging_exception(self):
        self.app.hardware.fail_unlock = True
        with self.assertRaises(RuntimeError):
            self.app.dispensing.start_dispense(self.nurse, "MED-001", 1, "REQ-UNLOCK")
        self.assertEqual(Mode.FAULT, self.app.faults.mode)
        self.assertFalse(self.app.hardware.is_open())
        self.assertEqual(10, self.med.quantity)

    def test_full_log_prevents_hardware_unlock(self):
        self.fill_event_log()
        with self.assertRaises(RuntimeError):
            self.app.dispensing.start_dispense(self.nurse, "MED-001", 1, "REQ-FULL")
        self.assertFalse(self.app.hardware.is_open())
        self.assertEqual(10, self.med.quantity)

    def test_last_audit_slot_supports_completion_without_extra_record(self):
        self.app.logger.EVENT_CAPACITY = 1
        self.app.dispensing.start_dispense(self.nurse, "MED-001", 1, "REQ-ONE")
        self.app.dispensing.close_dispense_drawer(self.nurse)
        self.app.dispensing.complete_dispense(self.nurse, 1)
        self.assertEqual(9, self.med.quantity)
        self.assertEqual(1, len(self.app.logger.events()))
        self.assertEqual("DISPENSE_COMPLETED", self.app.logger.events()[0].event_type)

    def test_unlogged_fault_still_forces_fault_mode(self):
        self.fill_event_log()
        with self.assertRaises(RuntimeError):
            self.app.faults.raise_fault(Severity.ERROR, "UNLOGGABLE", "test")
        self.assertEqual(Mode.FAULT, self.app.faults.mode)
        self.assertEqual(1, len(self.app.faults.active_faults()))

    def test_full_log_prevents_clear_and_keeps_fault_active(self):
        fault = self.app.faults.raise_fault(Severity.ERROR, "DRAWER", "test")
        self.app.faults.resolve_condition(fault.fault_id)
        self.app.logger.EVENT_CAPACITY = len(self.app.logger.events())
        with self.assertRaises(RuntimeError):
            self.app.faults.clear_fault(fault.fault_id, self.pharm)
        self.assertTrue(fault.active)
        self.assertEqual(Mode.FAULT, self.app.faults.mode)

    def test_clearing_last_error_resumes_normal_even_with_warning(self):
        self.app.faults.raise_fault(Severity.WARNING, "COM", "offline", False)
        error = self.app.faults.raise_fault(Severity.ERROR, "DRAWER", "failed", True)
        self.app.faults.resolve_condition(error.fault_id)
        self.app.faults.clear_fault(error.fault_id, self.pharm)
        self.assertEqual(Mode.NORMAL, self.app.faults.mode)

    def test_remote_unlock_does_not_assume_withdrawal_quantity(self):
        self.app.monitor.set_connection(True)
        response = self.app.monitor.handle_command(
            {"command_id": "REMOTE-1", "source": "MONITORING_SYSTEM",
             "command_type": "REMOTE_UNLOCK", "medication_id": "MED-001",
             "quantity": 2, "authorization": "DEMO-VALIDATED"},
            self.nurse, self.app.dispensing, self.app.store, self.app.faults)
        self.assertTrue(response["accepted"])
        self.assertEqual("UNLOCKED_PENDING_LOCAL_CONFIRMATION", response["outcome"])
        self.assertEqual(10, self.med.quantity)
        self.assertTrue(self.app.hardware.is_open())
        self.app.dispensing.close_dispense_drawer(self.nurse)
        self.app.dispensing.complete_dispense(self.nurse, 1)
        self.assertEqual(9, self.med.quantity)


class AvailabilityRegressionTests(unittest.TestCase):
    """SR-ADC-05 (D3): the cabinet must not lock out its staff (F-ADC-05, F-ADC-06)."""

    def setUp(self):
        self.app = ADCApplication()
        self.auth = self.app.auth

    def fail_logins(self, username, times=3):
        for _ in range(times):
            with self.assertRaises(ValueError):
                self.auth.login(username, "wrong password")

    def test_failed_logins_lock_only_that_account(self):
        self.fail_logins("nurse1")
        with self.assertRaises(PermissionError):
            self.auth.login("nurse1", "Nurse123!!!")
        self.assertEqual("admin1", self.auth.login("admin1", "Admin123!!!").username)

    def test_lockout_ends_after_its_duration(self):
        self.auth.lockout_seconds = 1
        self.fail_logins("nurse1")
        time.sleep(1.1)
        self.assertEqual("nurse1", self.auth.login("nurse1", "Nurse123!!!").username)

    def test_level2_recovery_login_clears_the_lockout(self):
        self.fail_logins("nurse1")
        self.auth.login("pharm1", "Pharm123!!!", recovery=True)
        self.assertEqual("nurse1", self.auth.login("nurse1", "Nurse123!!!").username)

    def test_level1_recovery_login_is_refused(self):
        self.fail_logins("pharm1")
        with self.assertRaises(PermissionError):
            self.auth.login("nurse1", "Nurse123!!!", recovery=True)

    def nearly_full_faults(self):
        return [f for f in self.app.faults.active_faults() if f.fault_type == "AUDIT_LOG_NEARLY_FULL"]

    def test_audit_log_warns_once_at_90_percent_without_blocking(self):
        self.app.logger.EVENT_CAPACITY = 20
        for index in range(17):
            self.app.logger.record("FILL", None, {"index": index})
        self.assertEqual([], self.nearly_full_faults())
        self.app.logger.record("FILL", None, {"index": 17})  # 18 of 20 records
        self.assertEqual(1, len(self.nearly_full_faults()))
        self.assertEqual(Severity.WARNING, self.nearly_full_faults()[0].severity)
        self.assertEqual(Mode.NORMAL, self.app.faults.mode)
        self.app.logger.record("FILL", None, {"index": 19})
        self.assertEqual(1, len(self.nearly_full_faults()))


if __name__ == "__main__":
    unittest.main(verbosity=2)
