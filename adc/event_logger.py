from collections import deque
from models import Event, new_id, now_iso

class EventLogger:
    """Bounded audit store; unacknowledged events are never silently overwritten."""
    EVENT_CAPACITY = 500
    FAULT_CAPACITY = 100
    NEARLY_FULL = 0.9

    def __init__(self, on_nearly_full=None):
        self._events = deque()
        self._faults = deque()
        # SR-ADC-05 (D3): called once when the log reaches 90 % of its capacity, so that it
        # is archived before it blocks the cabinet; called again after it went back below.
        self.on_nearly_full = on_nearly_full
        self._warned = False

    def can_record(self):
        return len(self._events) < self.EVENT_CAPACITY or bool(self._events and self._events[0].acknowledged)

    def record(self, event_type, user=None, details=None, outcome="SUCCESS"):
        if len(self._events) >= self.EVENT_CAPACITY:
            # Preserve all unacknowledged records. Only acknowledged oldest records may be pruned.
            while self._events and self._events[0].acknowledged:
                self._events.popleft()
            if len(self._events) >= self.EVENT_CAPACITY:
                raise RuntimeError("Audit storage full; protected operation refused.")
        event = Event(new_id("EVT"), event_type, user, now_iso(), details or {}, outcome)
        self._events.append(event)
        self._check_capacity()
        return event

    def _check_capacity(self):
        used = len(self._events)
        if used < self.EVENT_CAPACITY * self.NEARLY_FULL:
            self._warned = False
        elif not self._warned and used < self.EVENT_CAPACITY and self.on_nearly_full:
            # Only while there is still room to record the warning itself
            self._warned = True
            try:
                self.on_nearly_full(used, self.EVENT_CAPACITY)
            except RuntimeError:
                pass  # the warning could not be recorded; the event above is kept

    def record_fault(self, fault):
        if len(self._faults) >= self.FAULT_CAPACITY:
            while self._faults and getattr(self._faults[0], "acknowledged", False):
                self._faults.popleft()
            if len(self._faults) >= self.FAULT_CAPACITY:
                raise RuntimeError("Fault log full; cannot discard unacknowledged fault.")
        self._faults.append(fault)

    def events(self): return list(self._events)
    def faults(self): return list(self._faults)

    def acknowledge(self, record_id):
        for event in self._events:
            if event.record_id == record_id:
                event.acknowledged = True
                return True
        return False

    def clear_acknowledged(self, user):
        if user.level < 3:
            raise PermissionError("Only Level 3 may clear local records.")
        removed = 0
        kept = deque()
        for event in self._events:
            if event.acknowledged: removed += 1
            else: kept.append(event)
        self.record("LOG_CLEAR", user.username, {"removed_acknowledged_records": removed})
        self._events = deque(e for e in self._events if not e.acknowledged)
        return removed
