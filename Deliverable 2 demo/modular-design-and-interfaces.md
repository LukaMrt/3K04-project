# Modular Design and Interfaces - Part A (Automated Dispensing Cabinet)

## 1. Modules

The modules and their *secrets* are defined in [modular-decomposition.md](modular-decomposition.md). This file documents the **actual public operations** in the Python prototype and states the **intended safety semantics**. When a documented requirement is not enforced in code, the limitation is named rather than hidden. All paths are relative to `ADC_Project_D2/`.

| ID | Module | Code |
| --- | --- | --- |
| 1.1.1 | Local User Interface | `adc_app.py` (`ADCApplication`) |
| 1.1.2 | Lock/Sensor Interface | `hardware_interface.py` (`HardwareInterface`) |
| 1.1.3 | Monitoring Communication Manager | `monitor_communication.py` (`MonitorCommunication`) |
| 1.2.1 | Authentication | `authentication.py` (`Authentication`), password helpers currently in `data_store.py` |
| 1.2.2 | Access Control | `access_control.py` (`AccessControl`) |
| 1.2.3 | Inventory Manager | `inventory.py` (`InventoryManager`) |
| 1.2.4 | Dispensing Controller | `dispensing.py` (`DispensingController`) |
| 1.2.5 | Fault and Mode Manager | `fault_manager.py` (`FaultManager`) |
| 1.3.1 | Event Logger | `event_logger.py` (`EventLogger`) |
| 1.3.2 | Local Database | `data_store.py` (`DataStore`) |

`models.py` contains shared dataclasses/enumerations/utility functions, not a separate module with an independent hidden design decision.

## 2. Interface conventions

- The service class's public methods are the currently exported operations. Methods beginning with `_` are internal. Some methods currently expose mutable objects or implementation structures; this is identified as an information-hiding weakness, not an endorsed public contract.
- **Inputs/outputs:** `User`, `Medication`, `Fault`, `Event`, `Mode`, `Severity` are types from `models.py`; `int` quantities are units of medication, not Part B's “boxes”.
- **Foreseen refusal:** actual Python code generally raises `ValueError` or `PermissionError`, rather than returning a tagged result. An internal/audit failure generally raises `RuntimeError`.
- **Safety rule:** a call may succeed only if its own authorization, inventory, policy, mode, audit and hardware preconditions hold. No caller (including Monitoring) is allowed to skip local checks.
- **Identifiers:** current `new_id(prefix)` returns a prefixed truncated hexadecimal identifier, **not a UUID v4 string**. Part B's D2 files expect UUID v4 on the wire. Reconcile in the communication adapter/data store before integration.
- **Clock:** current code directly accesses `datetime.now()`/`now_iso()` rather than an injected clock; strict timing and deterministic time tests are therefore not currently provided.
- **Persistence:** current `DataStore`, `EventLogger`, fault manager and communication outbox are memory-resident and reset at process restart.

## 3. Module interfaces

### 3.1 Local User Interface — `ADCApplication`

**Uses:** all services at the composition root. **Used by:** local cabinet user. **Hidden secret:** CLI menu, credential prompts, outcomes and feedback.

| Operation | Inputs | Output | Preconditions | Effects | Exceptions / limits |
| --- | --- | --- | --- | --- | --- |
| `__init__()` | None | Application object | Python environment available | Constructs storage, auth, control, inventory, dispensing, fault, hardware, logger and communication objects | In-memory seed data created |
| `run()` | Interactive terminal input | Console session | Terminal available | Displays menu; delegates actions to modules | Catches exceptions and prints rejection; no true event loop |
| `_login()` | Username, password, recovery flag | Console login result | User supplies credentials | Calls `Authentication.login()` | CLI login is **not disabled in Fault Mode** as D1 requires |
| `_touch()` | Implicit current wall clock | None | Called after CLI returns from input | Models inactivity expiry, logs expiry, may raise fault | No asynchronous countdown; can auto-call simulated drawer closure instead of letting user close it |
| `_dispense()`, `_replenish()`, `_correct()`, `_policy()` | User prompts | Console result | Authenticated current user | Delegate to `DispensingController` or `InventoryManager` | `_dispense()` asks quantity confirmation **before** hardware access; interface mismatches required ordering |
| `_logs()`, `_raise_fault()`, `_clear_fault()` | Menu commands | Display/result | Role checks in respective flows | Show logs, simulate and clear faults | `_clear_fault()` marks trigger resolved directly; not independent sensor verification |

Private `_...` methods above are listed only to explain the demonstration; they are **not** intended exported interfaces between policy modules.

### 3.2 Local Database — `DataStore`

**Uses:** `models.py` vocabulary. **Used by:** Authentication, Inventory, Dispensing, Monitor and application. **Hidden secret:** in-memory maps of users, medications, policies and processed IDs.

| Operation | Inputs | Output | Preconditions | Effects | Exceptions / limits |
| --- | --- | --- | --- | --- | --- |
| `get_user(username)` | Username | `User` or `None` | — | Lookup only | Returns mutable record |
| `get_medication(medication_id)` | Medication ID | `Medication` or `None` | — | Lookup only | Returns mutable record |
| `list_medications()` | — | `list[Medication]` | — | Lookup only | Mutable records can escape storage boundary |
| `hash_password(password, salt=None)` *module helper* | Password and optional salt | Salt + PBKDF2 hash string | Valid string input | Compute salted PBKDF2-HMAC-SHA256 verifier | Hash secret should conceptually belong to Authentication |
| `verify_password(password, encoded)` *module helper* | Candidate and saved verifier | Boolean | — | Compare using constant-time digest comparison | Malformed encoded hash is false |
| `password_is_valid(password)` *module helper* | Candidate password | Boolean | — | Length/digit/special-count validation | Used for password change; seeded demo accounts are fixed |

**Missing production boundary:** transactions, persistent records, versioned updates and atomic stock/event commits. `users`, `medications`, `policies`, `completed_requests`, `command_ids` are currently public mutable attributes.

### 3.3 Authentication — `Authentication`

**Uses:** Data Store and Event Logger. **Used by:** Local User Interface. **Hidden secret:** password checks, account identity and failed-login lockout.

| Operation | Inputs | Output | Preconditions | Effects | Exceptions / limits |
| --- | --- | --- | --- | --- | --- |
| `login(username, password, recovery=False)` | Credentials and optional recovery path | `User` | Account may be unknown | Verifies password, audits attempt, updates failed-attempt count/lockout | `PermissionError`, `ValueError`; manual recovery behaviour after timed expiry differs from simple temporary block |
| `clear_lockout(user)` | Authenticated `User` | None | Level ≥2 | Clears failed-attempt and manual-lock flags; logs clear | `PermissionError` |
| `configure(user, attempts, seconds)` | User, positive limit, 1–3600 seconds | None | Level 3 | Replaces threshold/duration; logs change | `PermissionError`, `ValueError`; CLI menu does not expose this method |
| `change_password(user, new_password)` | User and new password | None | Password meets D1 policy | Rehashes password; logs change | `ValueError`; caller-level ownership/administrative control should be tightened |

**D1 gap:** strict session timeout is currently placed in `ADCApplication._touch()`, not in this module, and a blocking CLI read prevents exact timing.

### 3.4 Access Control — `AccessControl`

**Uses:** shared user/medication types. **Used by:** Inventory Manager, Dispensing Controller and UI. **Hidden secret:** minimum levels and medication-specific quantity allowances.

| Operation | Inputs | Output | Preconditions | Effects | Exceptions |
| --- | --- | --- | --- | --- | --- |
| `require_level(user, minimum)` | User and level | None on success | User exists | Enforces `user.level ≥ minimum` | `PermissionError` |
| `require_medication(user, medication, quantity)` | User, medication, requested units | None on success | Valid medication request | Level 1 uses per-medication allowance; Level 2/3 pass | `PermissionError` |
| `can_view_full_logs(user)` | User | None on success | Level 3 | Authorizes full log access | `PermissionError` |

**Important:** the code uses minimum-level checks, not a complete permission matrix. Some CLI views/actions require additional centralization of permission checks.

### 3.5 Inventory Manager — `InventoryManager`

**Uses:** Data Store, Access Control, Event Logger. **Used by:** Local UI, Dispensing Controller. **Hidden secret:** medication records, capacity, location, availability and policy configuration.

| Operation | Inputs | Output | Preconditions | Effects | Exceptions / limits |
| --- | --- | --- | --- | --- | --- |
| `list_medications()` | — | Mutable medication list | Intended caller authorized | Returns stored records | **Current caller authorization not enforced**; patient names can be printed without individual medication permission |
| `add_medication(user,name,strength,patient,quantity,location,policy_group=...)` | Medication details, 0–20 units, location | `Medication` | Level ≥2; free location; <5 records; known policy | Creates new ID/record; logs registration | `PermissionError`, `ValueError`; not exposed in CLI menu; code writes before audit |
| `replenish(user,medication_id,amount)` | User, med ID, positive units | New quantity | Level ≥2, `qty+amount ≤20` | Increase quantity, mark available, log change | `PermissionError`, `ValueError`; **mutation precedes audit** |
| `correct_quantity(user,medication_id,quantity)` | User, med ID, 0–20 units | New quantity | Level ≥2 | Set recorded quantity/available, log previous/new quantity | `PermissionError`, `ValueError`; **mutation precedes audit** |
| `mark_unavailable(user,medication_id)` | User, med ID | None | Level ≥2 | Set available false, log | `PermissionError`, `ValueError`; unconfirmed withdrawal not auto-routed here |
| `set_policy(user,policy_id,max_quantity,window_seconds)` | Policy values | None | Level ≥2; positive values | Store policy and audit | `PermissionError`, `ValueError` |
| `assign_policy_group(user,medication_id,policy_id)` | User, med ID, policy ID | None | Level ≥2; policy exists | Assign group and log | `PermissionError`, `ValueError` |

### 3.6 Dispensing Controller — `DispensingController`

**Uses:** Data Store, Access Control, Inventory Manager, Fault/Mode Manager, Lock/Sensor Interface, Event Logger. **Used by:** Local UI and Monitoring Communication Manager. **Hidden secret:** transaction lifecycle, withdrawal-group limits, duplicate protection and physical access sequencing.

| Operation | Inputs | Output | Preconditions | Effects | Exceptions / limits |
| --- | --- | --- | --- | --- | --- |
| `policy_status(medication_id)` | Medication ID | `(policy, active_withdrawals, remaining)` | Record and assigned policy exist | Calculates recent group withdrawals and remaining allowance | `ValueError`; uses wall clock and in-memory history |
| `dispense(user,medication_id,quantity,request_id,confirmed_quantity=None,repeat_confirmed=False)` | Actor, ID, requested units, request ID, confirmed units, repeat flag | Remaining recorded quantity | Normal mode; audit room; med available; sufficient stock; medication permission; policy allowance; new request ID; confirmed qty valid | Simulated unlock/close; decrement by confirmed qty; record completed ID and audit; warning at 10% threshold | `PermissionError`, `ValueError`, `RuntimeError`; **confirmed quantity supplied before simulated unlock; mutation precedes audit; no real open/close sensor timing** |

**Required contract** is stricter than the current implementation: confirmation must reflect the quantity actually removed *after* access; physical failure and incomplete/unknown quantity must trigger correct fault/unavailable handling; an audit failure cannot leave an unlogged stock change.

### 3.7 Fault and Mode Manager — `FaultManager`

**Uses:** Event Logger. **Used by:** Local UI, Dispensing Controller and Monitoring Communication Manager. **Hidden secret:** severity classification, active faults, recovery authorization and mode transitions.

| Operation | Inputs | Output | Preconditions | Effects | Exceptions / limits |
| --- | --- | --- | --- | --- | --- |
| `active_faults()` | — | List of active `Fault` | — | Read state | Returns mutable objects |
| `raise_fault(severity,fault_type,message,condition_present=True)` | Fault data | `Fault` | Severity valid | Creates fault/audit; Error/Critical set Fault Mode | `RuntimeError` on full log; no measured 3 s deadline |
| `resolve_condition(fault_id)` | Fault ID | None | Active fault exists | Sets `condition_present=False` | `ValueError`; method does **not** verify physical trigger resolution |
| `clear_fault(fault_id,user)` | Fault ID, user | None | Trigger marked resolved; Level ≥2 Error or ≥3 Critical | Clears fault; when no active faults, mode Normal; audit | `ValueError`, `PermissionError`; limited proof of safe state |
| `enter_maintenance(user)` | User | None | Level 3, not in Fault Mode | Set Maintenance; audit | `PermissionError` |
| `exit_maintenance(user)` | User | None | Level 3, in Maintenance | Restore previous mode; audit | `PermissionError`, `ValueError` |

### 3.8 Event Logger — `EventLogger`

**Uses:** shared `Event`/`Fault` types. **Used by:** Authentication, Inventory, Dispensing, Fault Manager, Communication. **Hidden secret:** bounded log storage and acknowledgement/clear rules.

| Operation | Inputs | Output | Preconditions | Effects | Exceptions / limits |
| --- | --- | --- | --- | --- | --- |
| `can_record()` | — | Boolean | — | Checks raw event count below 500 | Does not proactively prune acknowledged entries |
| `record(event_type,user=None,details=None,outcome="SUCCESS")` | Event data | `Event` | Room/eligible pruning | Adds unique event; prunes only oldest acknowledged records if full | `RuntimeError` if full of unacknowledged records |
| `record_fault(fault)` | Fault object | None | Capacity for 100 fault records | Append fault record | `RuntimeError`; `Fault` dataclass lacks persisted `acknowledged` member |
| `events()`, `faults()` | — | Lists | — | Read copies of sequence | Items themselves mutable |
| `acknowledge(record_id)` | Event ID | Boolean | Event known | Marks matching **event** acknowledged | Does not acknowledge separate fault queue records |
| `clear_acknowledged(user)` | User | Removed count | Level 3 | Clears only acknowledged events; logs `LOG_CLEAR` | `PermissionError`; fault records not covered |

### 3.9 Lock/Sensor Interface — `HardwareInterface`

**Uses:** none. **Used by:** Dispensing and UI. **Hidden secret:** simulated drawer/lock implementation.

| Operation | Inputs | Output | Preconditions | Effects | Exceptions / limits |
| --- | --- | --- | --- | --- | --- |
| `unlock(location)` | Container location | Boolean | Requested location authorized by caller | If no simulated failure, sets `open_location=location` | Returns false on injected unlock failure; **no physical feedback** |
| `close_drawer()` | — | Boolean | Door may be open | If no injected failure, sets `open_location=None` | Returns false on injected close failure; no real close sensor/timer |
| `is_open()` | — | Boolean | — | Reports whether simulated `open_location` is set | Cannot distinguish sensor unknown from closed |

Test controls `fail_unlock` and `fail_close` are direct public fields in the demo and should be hidden behind a simulation interface before hardware integration.

### 3.10 Monitoring Communication Manager — `MonitorCommunication`

**Uses:** Event Logger; dynamically receives Dispensing, Data Store, Fault Manager as arguments in `handle_command()`. **Used by:** Local UI. **Hidden secret:** simulated JSON status and event outbox, command markers, retry/acknowledgement.

| Operation | Inputs | Output | Preconditions | Effects | Exceptions / limits |
| --- | --- | --- | --- | --- | --- |
| `build_status(medications,active_faults)` | Records and faults | Dictionary | — | Produces `ADC_STATUS` containing cabinet ID, location, count, faults, sync/link status | No full detailed inventory; not Part B heartbeat schema |
| `enqueue(payload)` | Dictionary | Message ID | — | Appends unacknowledged envelope | In-memory only; ID is not UUID v4 |
| `queue_unacknowledged_events()` | — | None | Event Logger readable | Adds unacknowledged **events** not yet queued | Fault-record queue not handled separately |
| `set_connection(connected)` | Boolean | None | — | Manual link toggle; logs loss/recovery; calls simulated flush on connection | **No automatic network loss detection** |
| `flush_simulated()` | — | Count | `connected=True` | Simulates acknowledging every queued item and marks matching events acknowledged | Not a real network or per-transaction server acknowledgement |
| `pending_count()` | — | Count | — | Counts pending queue items, queues events | In-memory only |
| `status_cycle(medications,faults)` | Medications and faults | Status dictionary | — | Enqueues status and flushes when connected | **Not scheduled** every 30 seconds |
| `handle_command(command,user,dispensing,store,faults)` | Synthetic command and local objects | Accepted/rejected dictionary | Required fields present; link connected; demo markers valid | Rejects duplicate command IDs; for `REMOTE_UNLOCK`, calls locally checked `dispense()`; logs result | Marker `DEMO-VALIDATED` is not authentication; remote code auto-confirms quantity; no HTTP endpoint |
| `export_status_json(...)`, `export_outbox_json(...)` | Output path and/or records | Dictionary / file | Writable local path | Writes JSON for inspection | Not transport/integration |

## 4. External interface (ADC ↔ Monitoring System)

The **system boundary** is the communication adapter, and the expected partner interface is described in Part B's supplied D2 documents. They reference a separate `interface-adc-monitoring.md` contract, **which was not supplied here**. The tables below reproduce the **documented expectations**, without inventing payload fields that have not been seen. Do not claim they are implemented in the current Part A Python prototype.

### 4.1 Provided by Part A (required target behaviour)

| Behaviour / endpoint described by Part B | Part A role | D1 relation | Current prototype status |
| --- | --- | --- | --- |
| ADC sends `POST /api/v1/adcs/register` to Monitoring System with ID, label, contact address, location | On startup and re-register if unknown | FR-COM-01/04 (D1); partner interface expectation | **Not implemented** |
| ADC sends `POST /api/v1/heartbeats` containing state, complete inventory and unacknowledged transactions | 30 s cadence, immediately on new alarm/state change per partner expectation | FR-COM-02/03/14/15 | **Not implemented**; manual `status_cycle()` exports a different status dictionary |
| ADC retains/retransmits unchanged transactions until per-record acknowledgement | Recover from link loss without loss/duplication | FR-COM-11/12/13 | **Partial** simulated in-memory outbox; no durable transaction store or real acknowledgements |
| ADC accepts `POST {contactAddress}/api/v1/commands` | Maintenance commands from authorized Monitoring operators | FR-COM-05/06 | **Not implemented**; only synthetic callable `REMOTE_UNLOCK` |
| ADC accepts `POST {contactAddress}/api/v1/configuration` | Configuration updates, including partner-described time server and screen lock timeout | FR-COM-05/06 | **Not implemented** |
| ADC returns actual command outcome, including command ID and cabinet ID per partner contract | Prevent false success assumptions | FR-COM-08; NFR-REL-07 | **Partial** local dictionary has command ID but not live HTTP response and lacks cabinet ID |
| ADC locally validates any remote unlock before physical lock command | Remote source cannot bypass local safety | FR-COM-07; NFR-SAF-08 | **Partial** local checks exist but demo marker and auto-confirmed physical quantity are unsafe for real use |

### 4.2 Required from Part B (as described in provided Part B files)

| Monitoring-side response or behaviour | ADC must do | Source and validation status |
| --- | --- | --- |
| Registration response: `200` with registration result/period; `400 INVALID_MESSAGE` | Register or correct invalid message; preserve stable cabinet ID | Part B `modular-design-and-interfaces.md` §4.1; exact JSON schema **unverified** |
| Heartbeat response: `200` with per-transaction `received`/`rejected`; `404 ADC_NOT_REGISTERED`; `500` storage failure | Mark only correctly acknowledged records; re-register on 404; retry unacknowledged on failure | Part B D2 §4.1/4.2; **not implemented** |
| Command/configuration request delivered to ADC contact address | Validate source, ID, format, authorization, mode and safety; return actual result | Part B D2 §4.1/4.2; exact message schema **unverified** |
| Partner expects UUID v4 for ADC, med, patient, staff, transaction and command IDs | Adopt agreed identifiers across wire and persist ADC identity | Part B D2 assumptions A-21/A-22; **current IDs incompatible** |
| Partner expects answer in ≤10 s for command/configuration | Return accurate accepted/rejected/failed result | Partner interface expectation; **not tested** |
| Partner expects synchronized hospital time and unchanged retry payloads | Use agreed timestamps and stable record contents | Part B D2 assumptions A-23/A-26; **not established** |

### 4.3 Behaviour when Monitoring System is unavailable

| Situation | Required ADC behaviour | Current demonstration |
| --- | --- | --- |
| Monitoring link lost | Record/display Warning; local operations continue only if local auth, inventory, policy, fault and audit checks pass (FR-COM-09/10; NFR-SAF-09) | Manual `set_connection(False)` logs link loss and displays OFFLINE in CLI; no automatic warning detection |
| Transaction not acknowledged | Retain unique record ID; resend later without changing its logical identity (FR-COM-11–13) | Queued events retained in process memory; lost at restart; simulated ack on reconnect |
| Monitoring link restored | Resume status and retransmission automatically; no restart required (NFR-AVA-02) | `set_connection(True)` invokes simulated flush, but no background status loop |
| Monitoring returns malformed/unauthenticated command | Reject before protected state changes (FR-COM-06) | Synthetic field/demo-marker check only; not cryptographic source validation |
| Remote unlock requested | Independently check all ADC safety guards before any physical unlocking (FR-COM-07) | Local dispense checks called; actual confirmation ordering **not safe for clinical use** |

