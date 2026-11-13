import unittest
from adc_app import ADCApplication
from models import Severity, Mode, new_id

class ADCTests(unittest.TestCase):
    def setUp(self):
        self.app=ADCApplication()
        self.nurse=self.app.store.get_user("nurse1")
        self.pharm=self.app.store.get_user("pharm1")
        self.admin=self.app.store.get_user("admin1")

    def test_level1_cannot_replenish(self):
        with self.assertRaises(PermissionError):
            self.app.inventory.replenish(self.nurse,"MED-001",1)

    def test_level2_can_replenish(self):
        before=self.app.store.get_medication("MED-001").quantity
        self.app.inventory.replenish(self.pharm,"MED-001",1)
        self.assertEqual(before+1,self.app.store.get_medication("MED-001").quantity)

    def test_dispense_requires_confirmation_and_reduces_confirmed(self):
        med=self.app.store.get_medication("MED-001")
        with self.assertRaises(ValueError):
            self.app.dispensing.dispense(self.nurse,"MED-001",2,new_id("REQ"),None,True)
        self.assertEqual(10,med.quantity)
        self.app.dispensing.dispense(self.nurse,"MED-001",2,new_id("REQ"),1,True)
        self.assertEqual(9,med.quantity)

    def test_duplicate_request(self):
        rid=new_id("REQ")
        self.app.dispensing.dispense(self.nurse,"MED-001",1,rid,1,True)
        with self.assertRaises(ValueError):
            self.app.dispensing.dispense(self.nurse,"MED-001",1,rid,1,True)

    def test_fault_blocks_dispensing_and_level2_clears_error(self):
        f=self.app.faults.raise_fault(Severity.ERROR,"DRAWER","test",True)
        with self.assertRaises(PermissionError):
            self.app.dispensing.dispense(self.nurse,"MED-001",1,new_id("REQ"),1,True)
        self.app.faults.resolve_condition(f.fault_id)
        self.app.faults.clear_fault(f.fault_id,self.pharm)
        self.assertEqual(Mode.NORMAL,self.app.faults.mode)

    def test_level1_cannot_enter_maintenance(self):
        with self.assertRaises(PermissionError):
            self.app.faults.enter_maintenance(self.nurse)

    def test_monitor_offline_buffers_and_online_acknowledges(self):
        self.app.logger.record("TEST_EVENT","nurse1",{})
        self.app.monitor.queue_unacknowledged_events()
        self.assertGreater(self.app.monitor.pending_count(),0)
        self.app.monitor.set_connection(True)
        self.assertEqual(0,self.app.monitor.pending_count())

if __name__=="__main__":
    unittest.main(verbosity=2)
