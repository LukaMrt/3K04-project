from models import Fault, Severity, Mode, new_id


class FaultManager:
    """Owns cabinet mode, fault state, and restricted recovery transitions."""

    def __init__(self, logger):
        self.logger = logger
        self._faults = {}
        self.mode = Mode.NORMAL
        self.maintenance_previous_mode = Mode.NORMAL

    def active_faults(self):
        return [fault for fault in self._faults.values() if fault.active]

    def raise_fault(self, severity, fault_type, message, condition_present=True):
        fault = Fault(new_id("FLT"), severity, fault_type, message, True, condition_present)
        # Safety first: even if audit storage is exhausted, a serious fault
        # must not leave the cabinet in NORMAL mode.
        self._faults[fault.fault_id] = fault
        if severity in (Severity.ERROR, Severity.CRITICAL):
            self.mode = Mode.FAULT
        self.logger.record_fault(fault)
        self.logger.record("FAULT_RAISED", None,
                           {"fault_id": fault.fault_id, "severity": severity.value,
                            "type": fault_type, "message": message})
        return fault

    def resolve_condition(self, fault_id):
        """Simulated sensor repair; this does NOT clear the fault or exit Fault Mode."""
        fault = self._faults.get(fault_id)
        if not fault or not fault.active:
            raise ValueError("Active fault not found.")
        fault.condition_present = False

    def check_clear_permission(self, fault_id, user):
        fault = self._faults.get(fault_id)
        if not fault or not fault.active:
            raise ValueError("Active fault not found.")
        required = 3 if fault.severity == Severity.CRITICAL else 2
        if user is None or user.level < required:
            raise PermissionError("Fault clear requires Level {}.".format(required))
        return fault

    def clear_fault(self, fault_id, user):
        fault = self.check_clear_permission(fault_id, user)
        if fault.condition_present:
            raise PermissionError("Fault condition must be resolved before clearing.")
        # If audit capacity is exhausted, the fault stays active.
        self.logger.record("FAULT_CLEARED", user.username, {"fault_id": fault_id})
        fault.active = False
        if not any(f.active and f.severity in (Severity.ERROR, Severity.CRITICAL)
                   for f in self._faults.values()):
            self.mode = Mode.NORMAL

    def enter_maintenance(self, user):
        if user is None or user.level < 3:
            raise PermissionError("Level 3 required for Maintenance Mode.")
        if self.mode == Mode.FAULT:
            raise PermissionError("Resolve active faults before maintenance.")
        if self.mode == Mode.MAINTENANCE:
            raise ValueError("Already in Maintenance Mode.")
        self.logger.record("MAINTENANCE_ENTERED", user.username)
        self.maintenance_previous_mode = self.mode
        self.mode = Mode.MAINTENANCE

    def exit_maintenance(self, user):
        if user is None or user.level < 3:
            raise PermissionError("Level 3 required.")
        if self.mode != Mode.MAINTENANCE:
            raise ValueError("Not in Maintenance Mode.")
        self.logger.record("MAINTENANCE_EXITED", user.username)
        self.mode = self.maintenance_previous_mode
