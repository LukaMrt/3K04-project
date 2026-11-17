"""Network link between this ADC and the Hospital Monitoring System (Part B).

Implements the ADC side of the ADC <-> Monitoring interface contract v1.0
(docs/part-b/interface-adc-monitoring.md):
- registration at start-up, and again when a heartbeat gets 404 ADC_NOT_REGISTERED (section 3.1);
- a heartbeat every 30 s, and at once when the mode or the active faults change (sections 3.2, 4.1);
- each transaction kept until the Monitoring System answers "received" or "rejected" (section 7);
- the endpoints POST /api/v1/commands and POST /api/v1/configuration (section 4).

The link only reads the ADC modules and calls their public operations, so the rest of the ADC is
unchanged; the simulated MonitorCommunication of the D2 prototype is left as it was. The D3 decisions
D3-A-01 (one unit = one box) and D3-D-01 to D3-D-04 (no patient name, no remote unlock, no
low-inventory alarm, fault -> alarm types) are applied here. Standard library only.
"""
import json
import threading
import time
import uuid
from datetime import datetime, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import error as urlerror
from urllib import request as urlrequest

from models import Mode, User

HEARTBEAT_PERIOD_SECONDS = 30
REQUEST_TIMEOUT_SECONDS = 10
MAX_LABEL_LENGTH = 128

# Contract section 5.1
STATES = {Mode.NORMAL: "online", Mode.MAINTENANCE: "maintenance", Mode.FAULT: "fault"}
# D3-D-04: fault types of the ADC -> alarm types of contract section 5.2; any other -> hardware_fault
ALARM_TYPES = {"DRAWER_UNLOCK": "dispensing_failure", "DRAWER_CLOSE": "dispensing_failure",
               "SESSION_DOOR_OPEN": "door_left_open"}
# D3-D-03: the Monitoring System computes low stock from the inventory itself
NOT_SENT_AS_ALARMS = {"LOW_INVENTORY"}
# Remote commands are recorded in the ADC audit log under this name. It has no password hash
# and is not in the DataStore, so nobody can log in with it.
MONITORING_USER = User("monitoring-system", "", 3)


class LinkError(Exception):
    """The Monitoring System could not be reached or refused a request."""


def utc_timestamp(moment=None):
    """RFC 3339, UTC, with milliseconds and the Z suffix (contract section 2)."""
    moment = (moment or datetime.now(timezone.utc)).astimezone(timezone.utc)
    return moment.strftime("%Y-%m-%dT%H:%M:%S.") + "{:03d}Z".format(moment.microsecond // 1000)


def label(text):
    return str(text)[:MAX_LABEL_LENGTH]


def error_body(code, message):
    return {"error": {"code": code, "message": message}}


class Identity:
    """The adcId and the UUID v4 given to each ADC identifier, kept across restarts (contract section 2).

    The ADC uses its own identifiers (MED-001, usernames, EVT-…); the contract wants UUID v4. Each
    one gets a random UUID the first time it crosses the interface, stored in a JSON file, so that
    the same medication, staff member or transaction always has the same UUID.
    """

    def __init__(self, path):
        self.path = Path(path)
        self._lock = threading.Lock()
        data = json.loads(self.path.read_text(encoding="utf-8")) if self.path.exists() else {}
        self.adc_id = data.get("adcId") or str(uuid.uuid4())
        self._ids = data.get("ids", {})
        self._save()

    def uuid_for(self, kind, key):
        name = "{}:{}".format(kind, key)
        with self._lock:
            if name not in self._ids:
                self._ids[name] = str(uuid.uuid4())
                self._save()
            return self._ids[name]

    def _save(self):
        self.path.write_text(json.dumps({"adcId": self.adc_id, "ids": self._ids}, indent=2),
                             encoding="utf-8")


class MonitorLink:
    def __init__(self, app, monitoring_url, contact_address, adc_label, floor, location,
                 listen=("127.0.0.1", 8701), identity_path="adc_identity.json",
                 period=HEARTBEAT_PERIOD_SECONDS):
        self.app = app
        self.monitoring_url = monitoring_url.rstrip("/")
        self.contact_address = contact_address.rstrip("/")
        self.adc_label, self.floor, self.location = label(adc_label), int(floor), location
        self.listen, self.period = listen, period
        self.identity = Identity(identity_path)
        self.registered = False
        self.last_heartbeat_at = None   # time of the last heartbeat answered 200
        self.last_error = None
        self.rejected = []              # (ADC record ID, acknowledgement) of rejected transactions
        self._done = set()              # ADC record IDs acknowledged "received" or "rejected"
        self._applied = set()           # commandId / configurationId already applied
        self._apply_lock = threading.Lock()
        self._snapshot = None
        self._stop = threading.Event()
        self._server = None

    # ------------------------------------------------------------------ lifecycle

    def start(self):
        """Starts the command server and the heartbeat loop, each in a daemon thread."""
        handler = type("Handler", (_RequestHandler,), {"link": self})
        self._server = ThreadingHTTPServer(self.listen, handler)
        threading.Thread(target=self._server.serve_forever, daemon=True).start()
        threading.Thread(target=self._run, daemon=True).start()

    def stop(self):
        self._stop.set()
        if self._server:
            self._server.shutdown()
            self._server.server_close()

    def _run(self):
        next_due = 0.0
        while not self._stop.is_set():
            if time.monotonic() >= next_due or self._state_snapshot() != self._snapshot:
                self.cycle()
                next_due = time.monotonic() + self.period
            self._stop.wait(1)

    def cycle(self):
        """One period: register if needed, then send one heartbeat. Errors wait for the next period."""
        try:
            if not self.registered:
                self.register()
            self.send_heartbeat()
            self.last_error = None
        except LinkError as exc:
            self.last_error = str(exc)

    def status_text(self):
        if self.last_error:
            return "Monitoring: " + self.last_error
        if self.last_heartbeat_at is None:
            return "Monitoring: connecting…"
        return "Monitoring: connected, last heartbeat {}".format(
            self.last_heartbeat_at.astimezone().strftime("%H:%M:%S"))

    # ------------------------------------------------------------------ ADC -> Monitoring

    def register(self):
        status, answer = self._post("/api/v1/adcs/register", {
            "adcId": self.identity.adc_id,
            "label": self.adc_label,
            "contactAddress": self.contact_address,
            "location": {"floor": self.floor, "description": self.location},
        })
        if status != 200:
            raise LinkError("registration refused ({}: {})".format(status, _error_code(answer)))
        self.registered = True

    def send_heartbeat(self, retry_after_registration=True):
        # The snapshot is taken before sending, so that a failed heartbeat waits for the next
        # period instead of being retried every second.
        self._snapshot = self._state_snapshot()
        pending = self._pending_transactions()
        status, answer = self._post("/api/v1/heartbeats", {
            "adcId": self.identity.adc_id,
            "sentAt": utc_timestamp(),
            "state": STATES[self.app.faults.mode],
            "inventory": self._inventory(),
            "transactions": [payload for _, payload in pending],
        })
        if status == 404 and retry_after_registration:
            # Contract section 6.1: register again, then send a heartbeat
            self.registered = False
            self.register()
            return self.send_heartbeat(retry_after_registration=False)
        if status != 200:
            # Contract section 7: the transactions are kept and sent again at the next period
            raise LinkError("heartbeat refused ({}: {})".format(status, _error_code(answer)))
        record_ids = {payload["transactionId"]: record_id for record_id, payload in pending}
        acknowledgements = answer.get("acknowledgements", []) if isinstance(answer, dict) else []
        for ack in acknowledgements:
            record_id = record_ids.get(ack.get("transactionId"))
            if record_id is None or ack.get("status") not in ("received", "rejected"):
                continue
            self._done.add(record_id)
            self._mark_acknowledged(record_id)
            if ack["status"] == "rejected":
                self.rejected.append((record_id, ack))
        self.last_heartbeat_at = datetime.now(timezone.utc)

    def _state_snapshot(self):
        return self.app.faults.mode, tuple(sorted(f.fault_id for f in self.app.faults.active_faults()))

    def _inventory(self):
        # Complete inventory (contract section 3.2); one ADC unit is one box (D3-A-01)
        return [{"medicationId": self.identity.uuid_for("medication", med.medication_id),
                 "medicationName": _medication_name(med),
                 "quantityInBoxes": med.quantity}
                for med in self.app.store.list_medications()]

    def _pending_transactions(self):
        pending = []
        for event in self.app.logger.events():
            if event.record_id in self._done:
                continue
            payload = self._transaction_for(event)
            if payload is not None:
                pending.append((event.record_id, payload))
        return pending

    def _transaction_for(self, event):
        """The contract transaction for an ADC audit event, or None if the event is not sent.

        A dispense is audited as DISPENSE_STARTED and the same event becomes DISPENSE_COMPLETED
        when the withdrawal is confirmed, so it is only sent once completed: a transaction sent
        again must be identical to the first sending (Part B A-26).
        """
        transaction_id = self.identity.uuid_for("transaction", event.record_id)
        timestamp = utc_timestamp(datetime.fromisoformat(event.timestamp))
        details = event.details
        if event.event_type == "DISPENSE_COMPLETED" and details.get("confirmed_quantity", 0) >= 1:
            med = self.app.store.get_medication(details["medication_id"])
            if med is None:
                return None
            return {
                "type": "dispensing",
                "transactionId": transaction_id,
                "timestamp": timestamp,
                "medicationId": self.identity.uuid_for("medication", med.medication_id),
                "medicationName": _medication_name(med),
                "quantityInBoxes": details["confirmed_quantity"],
                # D3-D-01: the patient name stays in the ADC
                "patientId": self.identity.uuid_for("patient", med.patient_name),
                "staffMemberId": self.identity.uuid_for("staff", event.user),
                "staffMemberName": label(event.user),
            }
        if event.event_type == "FAULT_RAISED" and details.get("type") not in NOT_SENT_AS_ALARMS:
            return {
                "type": "alarm",
                "transactionId": transaction_id,
                "timestamp": timestamp,
                "alarmType": ALARM_TYPES.get(details.get("type"), "hardware_fault"),
                "severity": str(details.get("severity", "")).lower(),
                "description": details.get("message"),
            }
        return None

    def _mark_acknowledged(self, record_id):
        # Same effect as EventLogger.acknowledge(), on a copy of the event list: the
        # logger's deque may be appended to by the GUI thread at the same time.
        for event in self.app.logger.events():
            if event.record_id == record_id:
                event.acknowledged = True

    def _post(self, path, body):
        req = urlrequest.Request(self.monitoring_url + path, data=json.dumps(body).encode("utf-8"),
                                 method="POST", headers={"Content-Type": "application/json",
                                                         "Accept": "application/json"})
        try:
            with urlrequest.urlopen(req, timeout=REQUEST_TIMEOUT_SECONDS) as response:
                return response.status, _read_json(response.read())
        except urlerror.HTTPError as exc:
            try:
                return exc.code, _read_json(exc.read())
            finally:
                exc.close()
        except (urlerror.URLError, OSError) as exc:
            raise LinkError("unreachable ({})".format(getattr(exc, "reason", exc)))

    # ------------------------------------------------------------------ Monitoring -> ADC

    def handle_request(self, path, body):
        """Answers POST /api/v1/commands and /api/v1/configuration (contract section 4).

        Returns (HTTP status, JSON body). A commandId or configurationId received twice is
        acknowledged again without being applied twice.
        """
        if path not in ("/api/v1/commands", "/api/v1/configuration"):
            return 404, error_body("NOT_FOUND", "Unknown path.")
        id_field = "commandId" if path == "/api/v1/commands" else "configurationId"
        if not isinstance(body, dict) or not isinstance(body.get(id_field), str) \
                or not isinstance(body.get("adcId"), str):
            return 400, error_body("INVALID_MESSAGE", "Field '{}' or 'adcId' is missing.".format(id_field))
        if body["adcId"] != self.identity.adc_id:
            return 409, error_body("ADC_ID_MISMATCH", "This address belongs to another ADC.")
        acknowledgement = {id_field: body[id_field], "adcId": self.identity.adc_id, "status": "applied"}
        with self._apply_lock:
            if body[id_field] in self._applied:
                return 200, acknowledgement
            if id_field == "commandId":
                refusal = self._apply_command(body)
            else:
                refusal = self._apply_configuration(body)
            if refusal:
                return refusal
            self._applied.add(body[id_field])
        return 200, acknowledgement

    def _apply_command(self, body):
        if body.get("command") != "set_maintenance_mode":
            return 400, error_body("UNKNOWN_COMMAND", "Only set_maintenance_mode is supported.")
        enabled = (body.get("parameters") or {}).get("enabled")
        if not isinstance(enabled, bool):
            return 400, error_body("INVALID_MESSAGE", "parameters.enabled must be true or false.")
        faults, mode = self.app.faults, self.app.faults.mode
        if mode == Mode.FAULT:
            return 409, error_body("COMMAND_NOT_APPLICABLE", "The ADC is in fault.")
        if enabled and (self.app.hardware.is_open() or self.app.dispensing.pending_dispense()):
            return 409, error_body("COMMAND_NOT_APPLICABLE", "A dispense is in progress.")
        try:
            # Applying the state the ADC is already in is not an error (contract section 4.1)
            if enabled and mode != Mode.MAINTENANCE:
                faults.enter_maintenance(MONITORING_USER)
            elif not enabled and mode == Mode.MAINTENANCE:
                faults.exit_maintenance(MONITORING_USER)
        except (PermissionError, ValueError) as exc:
            return 409, error_body("COMMAND_NOT_APPLICABLE", str(exc))
        except RuntimeError as exc:  # audit log full: the ADC refuses protected operations
            return 500, error_body("INTERNAL_ERROR", str(exc))
        return None

    def _apply_configuration(self, body):
        settings = body.get("settings")
        if not isinstance(settings, dict):
            return 400, error_body("INVALID_MESSAGE", "Field 'settings' is required.")
        unknown = set(settings) - {"timeServer", "screenLockTimeoutSeconds"}
        if unknown:
            return 400, error_body("UNKNOWN_SETTING", "Unknown setting: {}.".format(", ".join(sorted(unknown))))
        server = settings.get("timeServer")
        if "timeServer" in settings and (not isinstance(server, str) or not server.strip() or len(server) > 253):
            return 400, error_body("INVALID_SETTING_VALUE", "timeServer must be a host name.")
        delay = settings.get("screenLockTimeoutSeconds")
        if "screenLockTimeoutSeconds" in settings and (
                isinstance(delay, bool) or not isinstance(delay, int) or not 15 <= delay <= 600):
            return 400, error_body("INVALID_SETTING_VALUE", "screenLockTimeoutSeconds must be 15-600.")
        try:
            # Audit first, as every protected ADC operation; the whole configuration or none of it
            self.app.logger.record("REMOTE_CONFIGURATION", MONITORING_USER.username,
                                   {"configuration_id": body["configurationId"], "settings": settings})
        except RuntimeError as exc:
            return 500, error_body("INTERNAL_ERROR", str(exc))
        if "screenLockTimeoutSeconds" in settings:
            # Length of the lock countdown, which starts after 15 s without input (Part A FR-AUTH-04)
            self.app.inactivity_timeout = delay
        if "timeServer" in settings:
            self.app.time_server = server
        return None


class _RequestHandler(BaseHTTPRequestHandler):
    link = None  # set by MonitorLink.start()

    def do_POST(self):
        length = int(self.headers.get("Content-Length") or 0)
        body = _read_json(self.rfile.read(length))
        status, answer = self.link.handle_request(self.path, body)
        data = json.dumps(answer).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)

    def log_message(self, *args):
        pass  # keep the console of the ADC quiet


def _medication_name(med):
    return label("{} {}".format(med.name, med.strength).strip())


def _read_json(data):
    try:
        return json.loads(data.decode("utf-8")) if data else {}
    except (ValueError, UnicodeDecodeError):
        return {}


def _error_code(answer):
    return (answer.get("error") or {}).get("code", "no error code") if isinstance(answer, dict) else "invalid answer"
