from datetime import datetime, timedelta
from data_store import verify_password, password_is_valid, hash_password
from models import now_iso

class Authentication:
    """Login, lockout and passwords.

    Lockouts are kept per account (SR-ADC-05, D3): failed logins block only the account that
    failed, until the configured duration has passed or a Level 2/3 user clears it.
    """
    def __init__(self, store, logger, max_attempts=3, lockout_seconds=60):
        self.store, self.logger = store, logger
        self.max_attempts, self.lockout_seconds = max_attempts, lockout_seconds
        self._failed = {}        # username -> consecutive failed logins
        self._locked_until = {}  # username -> end of its lockout

    def login(self, username, password, recovery=False):
        user = self.store.get_user(username)
        until = self._locked_until.get(username)
        if until and not recovery:
            if datetime.now().astimezone() < until:
                raise PermissionError("Login temporarily locked until {}.".format(until.isoformat(timespec="seconds")))
            # The lockout duration has passed: the account can log in again
            del self._locked_until[username]
            self._failed.pop(username, None)
        valid = user is not None and verify_password(password, user.password_hash)
        self.logger.record("LOGIN_ATTEMPT", username, {"success": valid, "recovery_path": recovery},
                           "SUCCESS" if valid else "FAILED")
        if valid:
            if recovery and self._locked_until:
                if user.level < 2:
                    raise PermissionError("Recovery requires Level 2 or Level 3.")
                self.clear_lockout(user)
            self._failed.pop(username, None)
            return user
        self._failed[username] = self._failed.get(username, 0) + 1
        if self._failed[username] >= self.max_attempts:
            self._locked_until[username] = datetime.now().astimezone() + timedelta(seconds=self.lockout_seconds)
            self.logger.record("LOGIN_LOCKOUT", username, {"attempts": self._failed[username]}, "LOCKED")
        raise ValueError("Invalid username or password.")

    def clear_lockout(self, user):
        """Clears the lockout of every account (FR-AUTH-06)."""
        if user.level < 2:
            raise PermissionError("Only Level 2 or Level 3 can clear login lockout.")
        self._failed.clear()
        self._locked_until.clear()
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
