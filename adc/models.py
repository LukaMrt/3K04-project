from dataclasses import dataclass, field, asdict
from datetime import datetime, timezone
from enum import Enum
from typing import Optional, Dict, Any
import uuid

def now_iso():
    return datetime.now(timezone.utc).astimezone().isoformat(timespec="seconds")

def new_id(prefix):
    return "{}-{}".format(prefix, uuid.uuid4().hex[:12].upper())

class Mode(str, Enum):
    NORMAL = "NORMAL"
    MAINTENANCE = "MAINTENANCE"
    FAULT = "FAULT"

class Severity(str, Enum):
    INFO = "INFO"
    WARNING = "WARNING"
    ERROR = "ERROR"
    CRITICAL = "CRITICAL"

@dataclass
class User:
    username: str
    password_hash: str
    level: int
    medication_permissions: Dict[str, int] = field(default_factory=dict)

@dataclass
class Medication:
    medication_id: str
    name: str
    strength: str
    patient_name: str
    quantity: int
    location: str
    initial_quantity: int
    insertion_date: str = field(default_factory=now_iso)
    last_access_date: Optional[str] = None
    last_access_user: Optional[str] = None
    policy_group: str = "POLICY-DEFAULT"
    available: bool = True

@dataclass
class WithdrawalPolicy:
    policy_id: str
    max_quantity: int
    window_seconds: int

@dataclass
class Fault:
    fault_id: str
    severity: Severity
    fault_type: str
    message: str
    active: bool = True
    condition_present: bool = True
    timestamp: str = field(default_factory=now_iso)

@dataclass
class Event:
    record_id: str
    event_type: str
    user: Optional[str]
    timestamp: str
    details: Dict[str, Any]
    outcome: str = "SUCCESS"
    acknowledged: bool = False

