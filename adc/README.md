# ADC Part A – Deliverable 2 prototype

## NEW — Graphical interface for the technical demo

Run **`python gui_main.py`** (or on Windows, double-click **`Launch_ADC_GUI.bat`**) to open the ADC Control Center graphical desktop interface. It runs on Python standard-library Tkinter, retains the original backend safety modules and adds screens for Login, Overview, Inventory, Dispensing, Faults, Monitoring, Audit Logs and Level-3 Settings. For a full walkthrough, see [GUI_README.md](GUI_README.md) and [GUI_DESIGN_UPDATE.md](GUI_DESIGN_UPDATE.md). The command **`python main.py`** still launches the original terminal version. GUI status cycles are scheduled in the Tkinter event loop while the application is open; there is still no live Part B network interface.

Run **`python -m unittest discover -p "test_*.py" -v`** on a graphical desktop (original 23 backend tests + 7 new GUI integration tests). GUI integration tests are skipped on headless environments without a graphical display.


## Run in VS Code (Python 3.9+)
1. Extract `ADC_Project_D2_Updated.zip` (or replace the changed `.py` files in your existing project).
2. Open the extracted `ADC_Project_D2` folder in VS Code.
3. Open Terminal → New Terminal.
4. Run `python main.py` (Windows may use `py main.py`).
5. Run all tests with `python -m unittest discover -p "test_*.py" -v` (23 tests: 7 original + 16 regression tests).

No third-party packages are required.

## Demo accounts
| Role | Username | Password |
|---|---|---|
| Level 1 nurse | `nurse1` | `Nurse123!!!` |
| Level 2 pharmacist | `pharm1` | `Pharm123!!!` |
| Level 3 administrator | `admin1` | `Admin123!!!` |

These are fictional demo accounts. Do not use real patient information.

## Implemented prototype behaviour
- Individual password authentication using salted PBKDF2-HMAC-SHA256 hashes.
- Three authorization levels; Level 1 medication-specific quantity allowance; Level 2 operational administration; Level 3 maintenance/configuration.
- Failed-login lockout and restricted Level 2/3 recovery; Level 3 configurable attempt threshold and lockout duration.
- Five-container model; maximum 20 units per container; generated medication IDs; unique active location; replenishment, correction, unavailable flag.
- Dispensing preconditions; staged unlock → simulated withdrawal → drawer close → actual-quantity confirmation; unique request IDs; duplicate protection; shared policy groups and time-window allowance.
- Inventory mutations check Normal Mode and drawer status, and write their audit entry before changing the in-memory state. Failed or unconfirmed withdrawal quarantines uncertain inventory.
- Audit events with unique IDs, timestamps, outcomes, bounded event/fault capacities, acknowledgement state, and no silent overwrite of unacknowledged records.
- Fault severities; Error/Critical enter Fault Mode; fault cause must be resolved before clearing; Level 2 clears Error and Level 3 clears Critical.
- Normal, Maintenance and Fault modes.
- Simulated drawer unlock/close failures.
- JSON status and event messages, 30-second status-cycle operation exposed as a callable interface, offline outbox, simulated acknowledgements, duplicate remote command detection, remote unlock rechecks local safety rules but does not auto-confirm a withdrawal.

## Important limitations (do not claim these are production-ready)
- This is a teaching prototype, not a clinically deployable ADC.
- Hardware is simulated; no real locks, drawers, sensors, or actuators are connected.
- Monitoring System transport and acknowledgements are simulated. The status-cycle method is called manually in this CLI; there is no background 30-second scheduler or network socket.
- Data is in memory and resets on exit; FR-INV-10 and FR-MODE-09 persistence are optional and not implemented.
- CLI inactivity expiry is checked when control returns to the application; it does not asynchronously interrupt a blocking terminal input call. A GUI/event loop or watchdog would be needed for strict timeout timing.
- Remote command authentication uses a demo token placeholder, not production cryptographic mutual authentication.
- The audit-before-mutation guarantee assumes this in-memory, single-process prototype. It is NOT a durable database transaction or a guarantee against power loss.
- Replenishment/correction currently updates record quantities without a physical restocking/correction drawer workflow.
- The demo does not provide clinical validation or real patient data handling.
- The demo's login lockout uses a configurable threshold and manual recovery; timed expiry is modelled but manual recovery remains required after lockout.

## Architecture
- `data_store.py`: hides user, medication, policy and request storage.
- `authentication.py`: password verification, lockout and password changes.
- `access_control.py`: role and medication-specific authorization policy.
- `inventory.py`: medication records, replenishment, correction and policy configuration.
- `dispensing.py`: staged start/close/complete/cancel interfaces, policy checks, hardware access, confirmed withdrawal and idempotency.
- `fault_manager.py`: fault lifecycle and operating modes.
- `event_logger.py`: bounded audit/fault records and acknowledgement.
- `hardware_interface.py`: replaceable simulated hardware adapter.
- `monitor_communication.py`: protocol/transport adapter and JSON boundary.
- `adc_app.py`: CLI composition root and user interaction.
- `models.py`: domain types and identifiers.

## Four-variable model (summary)
- Monitored variables: drawer open/closed and unlock result (simulated), user identity/level, medication quantity/availability, active fault set, communication link state, elapsed inactivity.
- Controlled variables: drawer unlock command, inventory quantity, session state, ADC operating mode, outgoing message queue.
- Inputs: login credentials, dispense/replenish/correction requests, user confirmation, simulated sensor outcomes, Monitoring System commands/acknowledgements.
- Outputs: authorization/rejection, drawer actuator command, displayed inventory/mode/fault, audit records, status/event/command-result JSON.
- NAT: software observes simulated hardware, user and communication inputs and updates internal state.
- REQ: only unlock when authentication, medication permission, stock, policy, Normal Mode and audit capacity checks pass; confirmed quantity alone updates stock; Error/Critical faults block dispensing; offline communication does not disable otherwise-safe local operation.
