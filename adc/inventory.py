from models import Medication, Mode, new_id


class InventoryManager:
    """Inventory rules. Every protected mutation is audited before state changes."""

    def __init__(self, store, access, logger, faults, hardware):
        self.store, self.access, self.logger = store, access, logger
        self.faults, self.hardware = faults, hardware

    def _require_safe_mode(self):
        # This check belongs here, not only in the CLI: direct callers also
        # have to respect Fault/Maintenance Mode and drawer interlocks.
        if self.faults.mode != Mode.NORMAL:
            raise PermissionError("Inventory operations require Normal Mode; current mode: {}.".format(self.faults.mode.value))
        if self.hardware.is_open():
            raise PermissionError("Inventory changes are blocked while a drawer is open.")

    def list_medications(self):
        return self.store.list_medications()

    def add_medication(self, user, name, strength, patient, quantity, location, policy_group="POLICY-DEFAULT"):
        self.access.require_level(user, 2)
        self._require_safe_mode()
        if not isinstance(quantity, int) or quantity < 0 or quantity > 20:
            raise ValueError("Each container holds 0-20 units.")
        if len(self.store.medications) >= 5:
            raise ValueError("All five storage containers are assigned.")
        if any(m.location == location for m in self.store.list_medications()):
            raise ValueError("Storage location already has an active medication record.")
        if policy_group not in self.store.policies:
            raise ValueError("Unknown withdrawal policy group.")
        med_id = new_id("MED")
        med = Medication(med_id, name, strength, patient, quantity, location, quantity,
                         policy_group=policy_group)
        # Audit FIRST. If the logger cannot save this event, stock is unchanged.
        self.logger.record("MEDICATION_REGISTERED", user.username,
                           {"medication_id": med_id, "quantity": quantity, "location": location})
        self.store.medications[med_id] = med
        return med

    def replenish(self, user, medication_id, amount):
        self.access.require_level(user, 2)
        self._require_safe_mode()
        med = self._get(medication_id)
        if not isinstance(amount, int) or amount <= 0 or med.quantity + amount > 20:
            raise ValueError("Amount must be positive and container total cannot exceed 20.")
        previous = med.quantity
        new_quantity = previous + amount
        self.logger.record("REPLENISHMENT", user.username,
                           {"medication_id": medication_id, "previous": previous,
                            "new": new_quantity})
        med.quantity = new_quantity
        med.available = True
        return med.quantity

    def correct_quantity(self, user, medication_id, quantity):
        self.access.require_level(user, 2)
        self._require_safe_mode()
        med = self._get(medication_id)
        if not isinstance(quantity, int) or quantity < 0 or quantity > 20:
            raise ValueError("Quantity must be 0-20.")
        previous = med.quantity
        self.logger.record("INVENTORY_CORRECTION", user.username,
                           {"medication_id": medication_id, "previous": previous,
                            "corrected": quantity})
        med.quantity = quantity
        med.available = True
        return med.quantity

    def mark_unavailable(self, user, medication_id):
        self.access.require_level(user, 2)
        self._require_safe_mode()
        med = self._get(medication_id)
        self.logger.record("INVENTORY_UNCERTAIN", user.username,
                           {"medication_id": medication_id})
        med.available = False

    def set_policy(self, user, policy_id, max_quantity, window_seconds):
        self.access.require_level(user, 2)
        self._require_safe_mode()
        if not isinstance(max_quantity, int) or not isinstance(window_seconds, int) or max_quantity < 1 or window_seconds < 1:
            raise ValueError("Policy values must be positive.")
        from models import WithdrawalPolicy
        policy = WithdrawalPolicy(policy_id, max_quantity, window_seconds)
        self.logger.record("POLICY_CONFIGURED", user.username,
                           {"policy_id": policy_id, "max_quantity": max_quantity,
                            "window_seconds": window_seconds})
        self.store.policies[policy_id] = policy

    def assign_policy_group(self, user, medication_id, policy_id):
        self.access.require_level(user, 2)
        self._require_safe_mode()
        med = self._get(medication_id)
        if policy_id not in self.store.policies:
            raise ValueError("Unknown policy.")
        self.logger.record("POLICY_GROUP_ASSIGNED", user.username,
                           {"medication_id": medication_id, "policy_id": policy_id})
        med.policy_group = policy_id

    def _get(self, medication_id):
        med = self.store.get_medication(medication_id)
        if med is None:
            raise ValueError("Medication record not found.")
        return med
