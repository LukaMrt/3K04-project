from datetime import datetime, timedelta
from models import Mode, Severity, now_iso


class DispensingController:
    """Safe, staged dispensing: validate -> unlock -> close -> confirm -> commit.

    The start event reserves audit evidence before a drawer is unlocked. Finishing
    updates that same event, so an audit-capacity failure cannot occur after
    medication quantity has changed. The demo is single-process/in-memory.
    """

    def __init__(self, store, access, inventory, faults, hardware, logger):
        self.store, self.access, self.inventory = store, access, inventory
        self.faults, self.hardware, self.logger = faults, hardware, logger
        self._withdrawals = {}  # policy_id -> [(timestamp, quantity)]
        self._pending = None
        self._started_requests = set()

    def policy_status(self, medication_id):
        med = self.store.get_medication(medication_id)
        if med is None:
            raise ValueError("Medication not found.")
        policy = self.store.policies[med.policy_group]
        cutoff = datetime.now().astimezone() - timedelta(seconds=policy.window_seconds)
        history = self._withdrawals.get(policy.policy_id, [])
        active = [(t, q) for t, q in history if t >= cutoff]
        used = sum(q for _, q in active)
        return policy, active, max(0, policy.max_quantity - used)

    def pending_dispense(self):
        """Read-only summary for the CLI and remote-command integration."""
        if self._pending is None:
            return None
        return {k: self._pending[k] for k in
                ("request_id", "medication_id", "requested_quantity", "username", "drawer_closed")}

    def start_dispense(self, user, medication_id, quantity, request_id, repeat_confirmed=False):
        if self._pending is not None or self.hardware.is_open():
            raise PermissionError("Another drawer is open or a dispense is awaiting confirmation.")
        if self.faults.mode != Mode.NORMAL:
            raise PermissionError("Dispensing is available only in Normal Mode.")
        if not self.logger.can_record():
            raise RuntimeError("No audit capacity; protected operation refused.")
        if not isinstance(request_id, str) or not request_id.strip():
            raise ValueError("A unique request ID is required.")
        if request_id in self._started_requests or request_id in self.store.completed_requests:
            raise ValueError("Duplicate request ID: request already started or completed.")
        med = self.store.get_medication(medication_id)
        if med is None or not med.available:
            raise ValueError("Medication unavailable.")
        if not isinstance(quantity, int) or quantity <= 0 or quantity > med.quantity:
            raise ValueError("Requested quantity exceeds available stock.")
        self.access.require_medication(user, med, quantity)
        policy, active, remaining = self.policy_status(medication_id)
        if quantity > remaining:
            self.logger.record("DISPENSE_REJECTED", user.username,
                               {"request_id": request_id, "medication_id": medication_id,
                                "quantity": quantity, "reason": "withdrawal policy exceeded"},
                               "REJECTED")
            raise PermissionError("Withdrawal policy exceeded. Remaining allowed quantity: {}.".format(remaining))
        if active and not repeat_confirmed:
            raise PermissionError("Repeat withdrawal confirmation required. Previous withdrawals: {}; remaining allowance: {}.".format(
                [(t.isoformat(timespec="seconds"), q) for t, q in active], remaining))

        # Commit an audit entry BEFORE physical access. Its type and outcome
        # become final once the operation finishes or aborts.
        event = self.logger.record("DISPENSE_STARTED", user.username,
                                   {"request_id": request_id,
                                    "medication_id": medication_id,
                                    "requested_quantity": quantity,
                                    "location": med.location}, "PENDING")
        self._started_requests.add(request_id)
        if not self.hardware.unlock(med.location):
            event.event_type = "DISPENSE_FAILED"
            event.outcome = "FAILED"
            event.details["reason"] = "drawer failed to unlock"
            self.faults.raise_fault(Severity.ERROR, "DRAWER_UNLOCK", "Drawer failed to unlock.", True)
            raise RuntimeError("Drawer failed to unlock; ADC entered Fault Mode.")

        self._pending = {"request_id": request_id, "medication_id": medication_id,
                         "requested_quantity": quantity, "username": user.username,
                         "policy_id": policy.policy_id, "event": event,
                         "drawer_closed": False}
        return med.location

    def _pending_for(self, user):
        pending = self._pending
        if pending is None:
            raise ValueError("No dispense is awaiting confirmation.")
        if user is None or user.username != pending["username"]:
            raise PermissionError("Only the initiating user can finish this dispense.")
        return pending

    def close_dispense_drawer(self, user):
        """Simulate closing the drawer after withdrawal, before confirming amount."""
        pending = self._pending_for(user)
        if pending["drawer_closed"]:
            return
        if not self.hardware.close_drawer():
            med = self.store.get_medication(pending["medication_id"])
            med.available = False  # Physical withdrawal quantity is uncertain.
            event = pending["event"]
            event.event_type = "DISPENSE_FAILED"
            event.outcome = "UNCERTAIN"
            event.details["reason"] = "drawer failed to close; inventory quarantined"
            self._pending = None
            self.faults.raise_fault(Severity.ERROR, "DRAWER_CLOSE", "Drawer failed to close.", True)
            raise RuntimeError("Drawer failed to close; ADC entered Fault Mode and medication is unavailable.")
        pending["drawer_closed"] = True

    def cancel_dispense(self, user, reason="actual quantity not confirmed"):
        """Fail closed: uncertain quantities become unavailable until L2/3 corrects them."""
        pending = self._pending_for(user)
        if not pending["drawer_closed"]:
            # Closing can raise a fault; that path also marks inventory uncertain.
            self.close_dispense_drawer(user)
            pending = self._pending_for(user)
        med = self.store.get_medication(pending["medication_id"])
        med.available = False
        event = pending["event"]
        event.event_type = "DISPENSE_INCOMPLETE"
        event.outcome = "UNCERTAIN"
        event.details["reason"] = reason
        event.details["inventory_available"] = False
        self._pending = None

    def complete_dispense(self, user, confirmed_quantity):
        pending = self._pending_for(user)
        if not pending["drawer_closed"]:
            raise PermissionError("Drawer must be closed before withdrawal confirmation.")
        if self.faults.mode != Mode.NORMAL:
            self.cancel_dispense(user, "cabinet entered a non-Normal mode")
            raise PermissionError("Fault/Maintenance Mode prevented completion; inventory quarantined.")
        requested = pending["requested_quantity"]
        if not isinstance(confirmed_quantity, int) or not 0 <= confirmed_quantity <= requested:
            raise ValueError("Confirmed quantity must be between 0 and requested quantity.")
        med = self.store.get_medication(pending["medication_id"])
        if not med.available or med.quantity < confirmed_quantity:
            self.cancel_dispense(user, "stock became unavailable during access")
            raise RuntimeError("Inventory cannot be safely confirmed; inventory quarantined.")

        previous = med.quantity
        med.quantity -= confirmed_quantity
        med.last_access_date = now_iso()
        med.last_access_user = user.username
        self.store.completed_requests.add(pending["request_id"])
        self._withdrawals.setdefault(pending["policy_id"], []).append(
            (datetime.now().astimezone(), confirmed_quantity))
        # This is an in-place finalization of the already-recorded audit event:
        # no additional logger capacity is needed after stock is updated.
        event = pending["event"]
        event.event_type = "DISPENSE_COMPLETED"
        event.outcome = "SUCCESS"
        event.details.update({"confirmed_quantity": confirmed_quantity,
                              "previous_quantity": previous,
                              "remaining_quantity": med.quantity,
                              "policy_id": pending["policy_id"]})
        self._pending = None

        if med.initial_quantity and med.quantity <= med.initial_quantity * .10:
            try:
                self.faults.raise_fault(Severity.WARNING, "LOW_INVENTORY",
                                        "Medication quantity is at or below 10% of initial quantity.", False)
            except RuntimeError as exc:
                # Dispense is already audited; don't claim it was rolled back.
                event.details["warning_audit_error"] = str(exc)
        return med.quantity

    def dispense(self, user, medication_id, quantity, request_id, confirmed_quantity=None,
                 repeat_confirmed=False):
        """Legacy synchronous test interface; not used for the interactive CLI.

        The caller explicitly provides the measured amount. In the real CLI,
        start/close/complete are separate, in that order.
        """
        if confirmed_quantity is None:
            raise ValueError("Actual withdrawn quantity must be confirmed; inventory has not changed.")
        if not isinstance(confirmed_quantity, int) or not 0 <= confirmed_quantity <= quantity:
            raise ValueError("Confirmed quantity must be between 0 and requested quantity.")
        self.start_dispense(user, medication_id, quantity, request_id, repeat_confirmed)
        self.close_dispense_drawer(user)
        return self.complete_dispense(user, confirmed_quantity)
