# Part A D2 — code safety patch notes

This patch is based on the existing `ADC_Project_D2.zip` Python prototype. It fixes the reproduced demo issues without changing the project's overall architecture or adding external packages.

## Replace these Python files

| File | What changed |
| --- | --- |
| `inventory.py` | Injects `FaultManager` and `HardwareInterface`; blocks normal inventory changes in Fault/Maintenance Mode or with an open drawer; validates, writes the audit record, then changes stock/policy state. |
| `dispensing.py` | New staged `start_dispense`, `close_dispense_drawer`, `complete_dispense`, `cancel_dispense` API; no inventory change before post-access confirmation; uncertain withdrawal quarantined; audit reservation via an existing PENDING event; preserves `dispense(...)` as a legacy synchronous test helper. |
| `fault_manager.py` | Serious faults enter Fault Mode even if recording them raises an error; fault clearance and mode transitions are logged before state changes; exposes `check_clear_permission`. |
| `adc_app.py` | Wires the additional `InventoryManager` dependencies; CLI now unlocks, waits for simulated withdrawal and close, then asks for actual quantity; checks clearance permissions before modifying fault conditions. |
| `monitor_communication.py` | Remote unlock now invokes `start_dispense`, returns `UNLOCKED_PENDING_LOCAL_CONFIRMATION`, and does **not** automatically count the requested quantity as removed. |
| `event_logger.py` | Capacity check accounts for prunable acknowledged head records; clearing acknowledged events is itself audited before removals. |
| `test_safety_regressions.py` | 16 new safety regression tests (original `test_adc.py` unchanged). |

## Running it

From the extracted `ADC_Project_D2` directory:

```bash
python main.py
python -m unittest discover -p "test_*.py" -v
```

Expected results: **23 tests pass** (7 original + 16 regression). The updated `DEMO_GUIDE.md` describes the new prompt order.

## Important implementation limits

- **Audit/state atomicity:** audit-before-mutation is safe for the specific tested in-memory single-threaded code paths, not a durable ACID transaction; power loss, concurrency and real hardware require more design.
- **Uncertain inventory:** once a drawer was opened and actual removal cannot be verified, the affected record is marked unavailable; an authorized Level 2/3 quantity correction in Normal Mode is required.
- **Fault logging exhaustion:** a serious fault still enters Fault Mode when audit storage is unavailable, but its separate fault/audit record may not be saved. Real deployment needs reliable reserved fault capacity and recovery.
- **Remote operation:** this remains simulated, not compatible with Part B's HTTPS/UUID registration/heartbeat contract. The `DEMO-VALIDATED` marker is not secure authentication.
- **Other existing gaps:** no durable persistence, physical sensors, background 30-second heartbeat scheduler, or asynchronous inactivity watchdog. Replenishment still lacks simulated physical confirmation.
- **Documentation consistency:** if submitting the previously generated Part A D2 Markdown design, revise references stating that inventory mutation precedes audit, or that remote commands auto-confirm withdrawals. Use the new methods in `dispensing.py` in the module interface description.

Do not use this prototype to manage or dispense actual medication.
