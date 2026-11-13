import json
from pathlib import Path
from models import new_id, now_iso

class MonitorCommunication:
    """Protocol-hiding adapter. Transport is simulated; JSON contract is transport-independent."""
    STATUS_INTERVAL_SECONDS = 30

    def __init__(self, logger, cabinet_id="ADC-DEMO-001", location="Demo Room"):
        self.logger, self.cabinet_id, self.location = logger, cabinet_id, location
        self.connected = False
        self._outbox = []
        self._last_status = None
        self._seen_commands = set()

    def build_status(self, medications, active_faults):
        return {
            "message_type": "ADC_STATUS", "cabinet_id": self.cabinet_id,
            "location": self.location, "timestamp": now_iso(),
            "occupied_locations": len(medications), "empty_locations": max(0, 5-len(medications)),
            "active_faults": [{"fault_id": f.fault_id, "severity": f.severity.value,
                               "type": f.fault_type, "message": f.message} for f in active_faults],
            "log_sync_status": "PENDING" if self._outbox else "CURRENT",
            "communication_status": "CONNECTED" if self.connected else "OFFLINE"
        }

    def enqueue(self, payload):
        envelope = {"record_id": new_id("MSG"), "timestamp": now_iso(), "payload": payload, "acknowledged": False}
        self._outbox.append(envelope)
        return envelope["record_id"]

    def queue_unacknowledged_events(self):
        known = {item["payload"].get("record_id") for item in self._outbox}
        for event in self.logger.events():
            if not event.acknowledged and event.record_id not in known:
                self.enqueue({"message_type": "ADC_EVENT", "record_id": event.record_id,
                              "event_type": event.event_type, "user": event.user,
                              "timestamp": event.timestamp, "details": event.details,
                              "outcome": event.outcome})

    def set_connection(self, connected):
        previous = self.connected
        self.connected = bool(connected)
        if previous != self.connected:
            self.logger.record("MONITOR_COMMUNICATION_RESTORED" if connected else "MONITOR_COMMUNICATION_LOST")
            if connected: self.flush_simulated()

    def flush_simulated(self):
        if not self.connected: return 0
        self.queue_unacknowledged_events()
        sent = 0
        for item in self._outbox:
            if not item["acknowledged"]:
                # Demo transport: simulated receiver acknowledges each unique message ID.
                item["acknowledged"] = True
                rid = item["payload"].get("record_id")
                if rid: self.logger.acknowledge(rid)
                sent += 1
        return sent

    def pending_count(self):
        self.queue_unacknowledged_events()
        return sum(not x["acknowledged"] for x in self._outbox)

    def status_cycle(self, medications, faults):
        status = self.build_status(medications, faults)
        self._last_status = status
        self.enqueue(status)
        if self.connected: self.flush_simulated()
        return status

    def handle_command(self, command, user, dispensing, store, faults):
        required = {"command_id", "source", "command_type", "medication_id", "quantity", "authorization"}
        if not isinstance(command, dict) or not required.issubset(command):
            return {"accepted": False, "reason": "Malformed command."}
        cid = command["command_id"]
        if cid in self._seen_commands: return {"accepted": False, "command_id": cid, "reason": "Duplicate command."}
        self._seen_commands.add(cid)
        if not self.connected: return {"accepted": False, "command_id": cid, "reason": "Monitoring link unavailable."}
        if command["source"] != "MONITORING_SYSTEM" or command["authorization"] != "DEMO-VALIDATED":
            self.logger.record("REMOTE_COMMAND_REJECTED", user.username if user else None, {"command_id": cid, "reason": "source/authorization invalid"}, "REJECTED")
            return {"accepted": False, "command_id": cid, "reason": "Source or authorization validation failed."}
        if command["command_type"] != "REMOTE_UNLOCK":
            return {"accepted": False, "command_id": cid, "reason": "Unsupported command."}
        try:
            request_id = "REMOTE-" + cid
            # A remote command may unlock a drawer, but it must NOT assume a
            # quantity was withdrawn. On-site confirmation is still mandatory.
            location = dispensing.start_dispense(user, command["medication_id"],
                                                int(command["quantity"]), request_id, True)
            result = {"accepted": True, "command_id": cid,
                      "outcome": "UNLOCKED_PENDING_LOCAL_CONFIRMATION",
                      "location": location}
        except Exception as exc:
            result = {"accepted": False, "command_id": cid, "reason": str(exc)}
        self.enqueue({"message_type": "COMMAND_RESULT", **result})
        self.logger.record("REMOTE_COMMAND_RESULT", user.username if user else None, result)
        return result

    def export_status_json(self, medications, active_faults, path="adc_status.json"):
        status = self.build_status(medications, active_faults)
        Path(path).write_text(json.dumps(status, indent=2), encoding="utf-8")
        return status

    def export_outbox_json(self, path="adc_outbox.json"):
        Path(path).write_text(json.dumps(self._outbox, indent=2), encoding="utf-8")
