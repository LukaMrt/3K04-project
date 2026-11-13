from data_store import verify_password, password_is_valid, hash_password
from models import now_iso

class Authentication:
    def __init__(self, store, logger, max_attempts=3, lockout_seconds=60):
        self.store, self.logger = store, logger
        self.max_attempts, self.lockout_seconds = max_attempts, lockout_seconds
        self.failed_attempts = 0
        self.locked_until = None
        self._lockout_manual = False

    def login(self, username, password, recovery=False):
        user = self.store.get_user(username)
        if self.locked_until and not recovery:
            from datetime import datetime
            if datetime.now().astimezone() < self.locked_until:
                raise PermissionError("Login temporarily locked until {}.".format(self.locked_until.isoformat(timespec="seconds")))
            if self._lockout_manual:
                raise PermissionError("Manual lockout remains. Level 2/3 recovery authorization is required.")
            self.locked_until = None
        valid = user is not None and verify_password(password, user.password_hash)
        self.logger.record("LOGIN_ATTEMPT", username, {"success": valid, "recovery_path": recovery},
                           "SUCCESS" if valid else "FAILED")
        if valid:
            if recovery and self._lockout_manual:
                if user.level < 2:
                    raise PermissionError("Recovery requires Level 2 or Level 3.")
                self.clear_lockout(user)
            elif not self._lockout_manual:
                self.failed_attempts = 0
            return user
        self.failed_attempts += 1
        if self.failed_attempts >= self.max_attempts:
            from datetime import datetime, timedelta
            self.locked_until = datetime.now().astimezone() + timedelta(seconds=self.lockout_seconds)
            self._lockout_manual = True
            self.logger.record("LOGIN_LOCKOUT", username, {"attempts": self.failed_attempts}, "LOCKED")
        raise ValueError("Invalid username or password.")

    def clear_lockout(self, user):
        if user.level < 2:
            raise PermissionError("Only Level 2 or Level 3 can clear login lockout.")
        self.failed_attempts = 0
        self.locked_until = None
        self._lockout_manual = False
        self.logger.record("LOGIN_LOCKOUT_CLEARED", user.username)

    def configure(self, user, attempts, seconds):
        if user.level < 3: raise PermissionError("Level 3 required.")
        if attempts < 1 or seconds < 1 or seconds > 3600: raise ValueError("Invalid lockout configuration.")
        self.max_attempts, self.lockout_seconds = attempts, seconds
        self.logger.record("LOCKOUT_CONFIGURED", user.username, {"attempts": attempts, "seconds": seconds})

    def change_password(self, user, new_password):
        if not password_is_valid(new_password): raise ValueError("Password must have 8+ chars, 3+ digits and 3+ special characters.")
        user.password_hash = hash_password(new_password)
        self.logger.record("PASSWORD_CHANGED", user.username)
