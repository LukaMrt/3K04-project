from getpass import getpass
from datetime import datetime, timedelta
from data_store import DataStore, password_is_valid
from event_logger import EventLogger
from fault_manager import FaultManager
from authentication import Authentication
from access_control import AccessControl
from hardware_interface import HardwareInterface
from inventory import InventoryManager
from dispensing import DispensingController
from monitor_communication import MonitorCommunication
from models import Severity, new_id, Mode

class ADCApplication:
    def __init__(self):
        self.store = DataStore()
        self.logger = EventLogger()
        self.faults = FaultManager(self.logger)
        self.auth = Authentication(self.store, self.logger)
        self.access = AccessControl()
        self.hardware = HardwareInterface()
        self.inventory = InventoryManager(self.store, self.access, self.logger, self.faults, self.hardware)
        self.dispensing = DispensingController(self.store, self.access, self.inventory, self.faults, self.hardware, self.logger)
        self.monitor = MonitorCommunication(self.logger)
        self.current_user = None
        self.last_activity = datetime.now().astimezone()
        self.inactivity_grace = 15
        self.inactivity_timeout = 60
        self.session_expired = False

    def _touch(self):
        now = datetime.now().astimezone()
        if self.current_user and (now-self.last_activity).total_seconds() > self.inactivity_grace + self.inactivity_timeout:
            self.current_user = None
            self.session_expired = True
            if self.hardware.is_open():
                self.hardware.close_drawer()
                self.faults.raise_fault(Severity.ERROR, "SESSION_DOOR_OPEN", "Session expired while drawer was open.", False)
            self.logger.record("SESSION_EXPIRED")
            print("Session expired. Please log in again.")
        self.last_activity = now

    def run(self):
        print("\\n=== ADC PART A – D2 DEMONSTRATION PROTOTYPE ===")
        print("Demo accounts: nurse1 / Nurse123!!! | pharm1 / Pharm123!!! | admin1 / Admin123!!!")
        print("Prototype only: simulated hardware and Monitoring System transport.")
        while True:
            if self.current_user is None:
                if not self._login(): return
                continue
            self._touch()
            u = self.current_user
            print("\\nUser: {} (Level {}) | Mode: {} | Monitor: {}".format(u.username,u.level,self.faults.mode.value,"ONLINE" if self.monitor.connected else "OFFLINE"))
            print("1 Inventory  2 Dispense  3 Replenish  4 Correct inventory  5 Mark unavailable")
            print("6 Configure policy  7 View logs  8 Simulate hardware fault  9 Resolve/clear fault")
            print("10 Toggle Monitor link  11 Send status cycle  12 Export JSON  13 Maintenance Mode")
            print("14 Exit Maintenance  15 Configure inactivity  16 Clear login lockout  17 Logout  0 Quit")
            try:
                choice=input("Select: ").strip()
                self._touch()
                if self.current_user is None:
                    continue
                u = self.current_user
                if choice=="1": self._show_inventory()
                elif choice=="2": self._dispense()
                elif choice=="3": self._replenish()
                elif choice=="4": self._correct()
                elif choice=="5": self._unavailable()
                elif choice=="6": self._policy()
                elif choice=="7": self._logs()
                elif choice=="8": self._raise_fault()
                elif choice=="9": self._clear_fault()
                elif choice=="10":
                    self.monitor.set_connection(not self.monitor.connected)
                    print("Monitoring System:", "CONNECTED" if self.monitor.connected else "OFFLINE")
                elif choice=="11":
                    status=self.monitor.status_cycle(self.inventory.list_medications(),self.faults.active_faults())
                    print("Status cycle created:",status)
                elif choice=="12":
                    self.monitor.export_status_json(self.inventory.list_medications(),self.faults.active_faults())
                    self.monitor.export_outbox_json()
                    print("Exported adc_status.json and adc_outbox.json")
                elif choice=="13": self.faults.enter_maintenance(u)
                elif choice=="14": self.faults.exit_maintenance(u)
                elif choice=="15": self._configure_inactivity()
                elif choice=="16": self.auth.clear_lockout(u); print("Login lockout cleared.")
                elif choice=="17": self.current_user=None
                elif choice=="0": print("Goodbye."); return
                else: print("Invalid choice.")
            except Exception as exc: print("OPERATION REJECTED:",exc)

    def _login(self):
        print("\\n--- LOGIN ---")
        username=input("Username (or quit): ").strip()
        if username.lower()=="quit": return False
        recovery=input("Is this a Level 2/3 lockout recovery login? (y/N): ").strip().lower()=="y"
        password=getpass("Password: ")
        try:
            self.current_user=self.auth.login(username,password,recovery=recovery)
            self.last_activity=datetime.now().astimezone()
            self.session_expired=False
            print("Login successful.")
            return True
        except Exception as exc:
            print("Login failed:",exc)
            return True

    def _show_inventory(self):
        for m in self.inventory.list_medications():
            print("{} | {} {} | patient={} | qty={}/20 | location={} | policy={} | available={}".format(
                m.medication_id,m.name,m.strength,m.patient_name,m.quantity,m.location,m.policy_group,m.available))

    def _select_med(self):
        self._show_inventory()
        return input("Medication ID: ").strip()

    def _dispense(self):
        pending = self.dispensing.pending_dispense()
        if pending:
            if pending["username"] != self.current_user.username:
                raise PermissionError("Another user's dispense is still in progress.")
            print("Resuming pending request:", pending["request_id"])
        else:
            mid = self._select_med()
            qty = int(input("Requested quantity: "))
            policy, active, remaining = self.dispensing.policy_status(mid)
            print("Policy {}: max {}, remaining {}. Prior withdrawals: {}".format(
                policy.policy_id, policy.max_quantity, remaining,
                [(t.isoformat(timespec="seconds"), q) for t, q in active]))
            repeat = input("Confirm intentional repeat withdrawal if applicable? (y/N): ").lower() == "y"
            request_id = new_id("REQ")
            print("Request ID:", request_id)
            location = self.dispensing.start_dispense(self.current_user, mid, qty, request_id, repeat)
            print("SIMULATED DRAWER UNLOCKED:", location)
        try:
            if not self.dispensing.pending_dispense()["drawer_closed"]:
                input("Simulate withdrawing medication, then press Enter to close the drawer: ")
                self.dispensing.close_dispense_drawer(self.current_user)
                print("SIMULATED DRAWER CLOSED.")
            answer = input("Can you confirm the ACTUAL quantity removed? (y/N): ").strip().lower()
            if answer != "y":
                self.dispensing.cancel_dispense(self.current_user)
                print("Withdrawal not confirmed. Inventory marked unavailable pending Level 2/3 correction.")
                return
            actual = int(input("Actual quantity withdrawn (0 or more): "))
            remaining_stock = self.dispensing.complete_dispense(self.current_user, actual)
            print("Dispensing completed. Remaining stock:", remaining_stock)
        except Exception:
            if self.dispensing.pending_dispense():
                self.dispensing.cancel_dispense(self.current_user, "dispense interrupted before confirmation")
            raise

    def _replenish(self):
        mid=self._select_med(); amount=int(input("Quantity to add: "))
        print("New quantity:",self.inventory.replenish(self.current_user,mid,amount))

    def _correct(self):
        mid=self._select_med(); qty=int(input("Corrected quantity: "))
        print("New quantity:",self.inventory.correct_quantity(self.current_user,mid,qty))

    def _unavailable(self):
        mid=self._select_med(); self.inventory.mark_unavailable(self.current_user,mid); print("Medication marked unavailable.")

    def _policy(self):
        self.access.require_level(self.current_user,2)
        pid=input("Policy ID (e.g. POLICY-001): ").strip()
        maximum=int(input("Maximum quantity: ")); window=int(input("Window in seconds: "))
        self.inventory.set_policy(self.current_user,pid,maximum,window)
        mid=input("Medication ID to assign to this policy group: ").strip()
        self.inventory.assign_policy_group(self.current_user,mid,pid)
        print("Policy configured and assigned.")

    def _logs(self):
        if self.current_user.level<2: raise PermissionError("Level 2 required for operational records.")
        events=self.logger.events()
        if self.current_user.level<3:
            events=[e for e in events if e.event_type in ("FAULT_RAISED","FAULT_CLEARED","REPLENISHMENT","INVENTORY_CORRECTION","DISPENSE_COMPLETED","INVENTORY_UNCERTAIN")]
        for e in events: print(e.record_id,e.timestamp,e.event_type,e.user,e.outcome,e.details)

    def _raise_fault(self):
        kind=input("Fault type [DRAWER_CLOSE/DRAWER_UNLOCK/SOFTWARE]: ").strip().upper() or "DRAWER_CLOSE"
        if kind=="DRAWER_CLOSE": self.hardware.fail_close=True
        elif kind=="DRAWER_UNLOCK": self.hardware.fail_unlock=True
        severity=Severity.CRITICAL if kind=="SOFTWARE" else Severity.ERROR
        fault=self.faults.raise_fault(severity,kind,"Simulated {} fault.".format(kind),True)
        print("Fault raised:",fault.fault_id,"Mode:",self.faults.mode.value)

    def _clear_fault(self):
        for f in self.faults.active_faults(): print(f.fault_id,f.severity.value,f.fault_type,f.message,"condition_present=",f.condition_present)
        fid=input("Fault ID: ").strip()
        self.faults.check_clear_permission(fid, self.current_user)
        self.faults.resolve_condition(fid)
        self.faults.clear_fault(fid,self.current_user)
        self.hardware.fail_close=False; self.hardware.fail_unlock=False
        print("Fault cleared. Mode:",self.faults.mode.value)

    def _configure_inactivity(self):
        if self.current_user.level<3: raise PermissionError("Level 3 required.")
        grace=int(input("Grace period in seconds (15 or greater): "))
        timeout=int(input("Countdown duration 1-900 seconds: "))
        if grace<15 or not 1<=timeout<=900: raise ValueError("Invalid inactivity settings.")
        self.inactivity_grace=grace; self.inactivity_timeout=timeout
        self.logger.record("INACTIVITY_CONFIGURED",self.current_user.username,{"grace":grace,"timeout":timeout})
        print("Inactivity configuration updated. The CLI checks expiry when control returns to the application.")

