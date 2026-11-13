class AccessControl:
    """Central permission policy. Roles are not inferred from the UI."""
    def require_level(self, user, minimum):
        if user is None or user.level < minimum:
            raise PermissionError("This action requires authorization Level {}.".format(minimum))

    def require_medication(self, user, medication, quantity):
        if user is None:
            raise PermissionError("Authentication required.")
        if user.level >= 2:
            return
        limit = user.medication_permissions.get(medication.medication_id, 0)
        if limit <= 0 or quantity > limit:
            raise PermissionError("Medication/quantity permission denied. Required permission: medication-specific allowance.")

    def can_view_full_logs(self, user):
        self.require_level(user, 3)
