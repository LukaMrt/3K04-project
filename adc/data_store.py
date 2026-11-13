import hashlib, hmac, os
from models import User, Medication, WithdrawalPolicy

def hash_password(password, salt=None):
    salt = salt or os.urandom(16)
    digest = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt, 200000)
    return salt.hex() + "$" + digest.hex()

def verify_password(password, encoded):
    try:
        salt_hex, digest_hex = encoded.split("$", 1)
        actual = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"),
                                     bytes.fromhex(salt_hex), 200000).hex()
        return hmac.compare_digest(actual, digest_hex)
    except (ValueError, TypeError):
        return False

def password_is_valid(password):
    return (len(password) >= 8 and sum(c.isdigit() for c in password) >= 3
            and sum(not c.isalnum() for c in password) >= 3)

class DataStore:
    """Storage abstraction. Replacing this class changes persistence, not business rules."""
    def __init__(self):
        self.users = {}
        self.medications = {}
        self.policies = {"POLICY-DEFAULT": WithdrawalPolicy("POLICY-DEFAULT", 20, 86400)}
        self.completed_requests = set()
        self.command_ids = set()
        self._seed()

    def _seed(self):
        self.users["nurse1"] = User("nurse1", hash_password("Nurse123!!!"), 1,
                                    {"MED-001": 10, "MED-002": 10})
        self.users["pharm1"] = User("pharm1", hash_password("Pharm123!!!"), 2, {})
        self.users["admin1"] = User("admin1", hash_password("Admin123!!!"), 3, {})
        self.medications["MED-001"] = Medication(
            "MED-001", "Demo medication", "10 mg", "Patient A", 10, "Container 1", 10)
        self.medications["MED-002"] = Medication(
            "MED-002", "Demo medication B", "5 mg", "Patient B", 8, "Container 2", 8)

    def get_user(self, username): return self.users.get(username)
    def get_medication(self, medication_id): return self.medications.get(medication_id)
    def list_medications(self): return list(self.medications.values())
