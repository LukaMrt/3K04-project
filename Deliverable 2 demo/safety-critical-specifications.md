# Safety-Critical Functions - Part A (Automated Dispensing Cabinet)

## 1. Scope and conventions

The five groupings below are safety-critical because an incorrect decision can expose medication to the wrong user, cause excess withdrawal, corrupt the recorded quantity, permit repeated access, or leave a hazardous fault unresolved. They are **black-box behavioural contracts** and describe required behaviour rather than the control flow of the Python demo.

| Function | Hazard if incorrect | D1 basis | Specification items |
| --- | --- | --- | --- |
| Authentication, authorization and session expiry | Unauthorized person obtains medication or privileged functions | FR-AUTH-01–10, FR-FAULT-09; NFR-SEC-01/03/04/06, NFR-SAF-07 | SPEC-AUTH-01/02/03 |
| Safe dispensing and controlled unlock, including remote requests | Wrong drawer opened; excess/unauthorized medication accessed | FR-DISP-01–04/06/08–12, FR-COM-06/07; NFR-SAF-01/02/05/08 | SPEC-DISP-01/02/03, SPEC-COM-03, SPEC-LOG-01 |
| Duplicate request/command protection | One request causes more than one completed medication withdrawal | FR-DISP-05, FR-COM-13; NFR-SAF-03, NFR-REL-06 | SPEC-DISP-04, SPEC-COM-03 |
| Inventory integrity and auditable changes | Incorrect inventory remains available or stock mutation is not logged | FR-INV-03/05–08/11, FR-LOG-12; NFR-SAF-04, NFR-REL-02/03 | SPEC-INV-01/02, SPEC-LOG-01 |
| Fault response, lockdown and recovery | Normal medication access continues despite hazardous physical/software fault | FR-FAULT-01–06/09/11, FR-MODE-02/05; NFR-SAF-06/07 | SPEC-FAULT-01/02/03, SPEC-MODE-01 |

Notation and conventions:

- `v'` is a value after an operation; a variable not mentioned is unchanged.
- `⊥` means absent/unknown. **Unknown safety evidence does not satisfy a guard.**
- `now` is the instant used to evaluate a decision. All quantities are integer medication units, not boxes.
- An operation that is rejected must not cause the protected state mutation or a new physical unlock. Required rejection/audit events may still be recorded.
- A required audit event is reserved/committable **before** taking the protected physical action; inventory and its resulting audit event commit as one logical outcome (FR-LOG-12, NFR-REL-03). This is a **required design property**, not a claim of atomic storage in the current demo.
- State and operation names align conceptually with [module interfaces](modular-design-and-interfaces.md); they are not claims that every operation has a matching public function already in code.

## 2. Authentication and authorization — `Authentication.login()` / `AccessControl.require_*()`

**Modules:** Authentication / Access Control; local presentation in `ADCApplication`. **Realizes:** SPEC-AUTH-01/02/03. **Refines:** FR-AUTH-01–10, FR-FAULT-09, FR-LOG-01, NFR-SEC-01/03–06, NFR-SAF-07, NFR-USA-01/02.

**State:** `session ∈ {LoggedOut, Active, Countdown, Expired}`; `user ∈ UserId ∪ {⊥}`; `level ∈ {1,2,3} ∪ {⊥}`; `failedAttempts ∈ ℕ`; `lockUntil ∈ Time ∪ {⊥}`; `countdownLength ∈ [1,900]`; `lastInput ∈ Time`; `door(loc) ∈ {Open, Closed, Unknown}`; `permissions(u,op,med)`.

**State invariants**

- **INV-AUTH-1:** `protectedOperationAccepted ⇒ session = Active ∧ user ≠ ⊥ ∧ authorized(user, operation, medication)`. Receiving a remote command is **not** itself authorization of a local user or drawer.
- **INV-AUTH-2:** `session ∈ {LoggedOut, Expired} ⇒ user = ⊥ ∧ no protected operation is permitted`.
- **INV-AUTH-3:** `level = 1 ⇒ no replenishment, correction, configuration, maintenance, full-log access or fault clear is permitted`.
- **INV-AUTH-4:** `lockActive ⇒ ordinary login cannot create a session`; navigating away from the login screen does not reset the lockout state.
- **INV-AUTH-5:** unauthenticated users cannot view the patient name (NFR-SEC-08).
- **INV-AUTH-6:** an open door never becomes mechanically impossible to **close** merely because a session expires (NFR-SAF-07).

**Pre-conditions**

1. A login request supplies a user identifier and password; no credential verification may be skipped.
2. A protected operation supplies the requested action and, where applicable, medication ID and quantity.
3. The decision depends on available, non-corrupt account/permission information. If required authorization data cannot be trusted, reject and raise a Critical fault (FR-FAULT-11).

**Post-conditions: local login**

| State and credential guard | `session'` | `failedAttempts'` | Other effects |
| --- | --- | --- | --- |
| Lockout active and no authorized recovery | No active session | Unchanged | Reject without protected access; preserve lockout |
| Not locked, individual account/password valid | Active for that account and its level | 0 | Record login success; grant/reject response within 3 s |
| Not locked, credentials invalid, new count below limit | LoggedOut | Old count + 1 | Record login failure |
| Not locked, credentials invalid, new count reaches limit | LoggedOut | Old count + 1 | Start configured temporary block; record failure/lockout |

Only Level 3 may configure attempt threshold/duration. Manual lockout-state clearing requires a separately authenticated Level 2/3 user (FR-AUTH-06).

**Post-conditions: authorization decision**

| Session active | Level and medication permission | Result |
| --- | --- | --- |
| No | Any | Reject; no protected state change |
| Yes | Insufficient | Reject; display required level/permission without password information |
| Yes | Sufficient | Pass authorization gate; other safety gates still apply |

**Post-conditions: inactivity**

| Elapsed inactivity / event | Required state |
| --- | --- |
| `< 15 s` without input | Active, no countdown |
| `≥ 15 s`, countdown in progress | Countdown displayed; input before expiry cancels and returns Active |
| Countdown expires with door closed | Expired; all protected operations denied until re-authentication |
| Countdown expires with door open | Expired; allow physical closure without authentication; when door closes, enter Error Fault Mode |

**Exceptions:** unreadable authorization records or unsafe session state ⇒ Critical fault/no protected access; failure to record a required authentication/security event is reported, not silently ignored. A CLI input-blocking limitation is an implementation gap, not an allowed exception to the required inactivity behaviour.

**Current code:** `authentication.py:Authentication.login(), clear_lockout(), configure()`; `access_control.py:AccessControl.require_level(), require_medication()`; `adc_app.py:ADCApplication._touch(), _login()`. The demo does not implement a continuously ticking, interruptible idle timer. `authentication.py` uses a manual-recovery flag that persists after timed lockout expiry; review against D1's temporarily blocked login requirement.

## 3. Safe dispensing and remote-unlock gating — `DispensingController.dispense()`

**Modules:** Dispensing Controller; Access Control; Inventory Manager; Fault Manager; Event Logger; Hardware Interface; Monitoring Communication Manager for remote commands. **Realizes:** SPEC-DISP-01/02/03, SPEC-COM-03, SPEC-LOG-01. **Refines:** FR-DISP-01–04/06–12, FR-COM-06/07/08, FR-LOG-02/12, FR-INV-06, NFR-SAF-01/02/05/08, NFR-REL-03, NFR-AUD-07.

**State:** `mode ∈ {Normal, Maintenance, Fault}`; `activeBlockingFault`; `med(m).available`; `med(m).qty ∈ [0,20]`; `med(m).location`; `policyRemaining(group,t)`; `auditWritable`; `drawerState`; `requestState(id) ∈ {New, Validated, AccessGranted, AwaitingConfirmation, Incomplete, Completed, Rejected}`; `confirmedQty ∈ ℕ ∪ {⊥}`.

Define a single local gate:

`G = activeLocalIdentity ∧ medPermission ∧ medAvailable ∧ 0 < requestedQty ≤ recordedQty ∧ groupPolicyAllows ∧ mode = Normal ∧ ¬activeBlockingFault ∧ knownSafeHardwareState ∧ auditWritable ∧ requestIdNotCompleted`.

For remote access add `R = authenticatedMonitoringSource ∧ validCommandId ∧ validFormat ∧ validAuthorizationDetails ∧ commandNotExecuted`. **Remote gate = `R ∧ G`**. Remote identity is not a replacement for local medication permission.

**State invariants**

- **INV-DISP-1:** `unlockIssued(m) ⇒ G`; for remote requests, `unlockIssued(m) ⇒ R ∧ G`.
- **INV-DISP-2:** for request `r` targeting medication `m`, *only* `med(m).location` may receive the corresponding unlock command.
- **INV-DISP-3:** `mode ≠ Normal ∨ activeBlockingFault ⇒ no normal dispensing unlock`.
- **INV-DISP-4:** `med(m).available = false ⇒ no accepted dispense for m`.
- **INV-DISP-5:** `Completed(r) ⇒ confirmedQty(r) ≠ ⊥ ∧ qAfter(m) = qBefore(m) − confirmedQty(r)` and the event record carries the same outcome.
- **INV-DISP-6:** no inventory reduction and no “Completed” state is inferred solely from a remote unlock, drawer opening or accepted request.
- **INV-DISP-7:** group-policy consumption includes **all** records assigned to that group (FR-DISP-12).

**Pre-conditions**

1. `requestId` identifies one request; `medicationId`, `requestedQty`, actor/source and applicable policy are present and valid.
2. `G` is evaluated immediately before opening the drawer; if a prerequisite is unknown it fails.
3. For a repeated withdrawal inside a policy window, the user has been shown prior withdrawal time/quantity, remaining allowance and reset time, and intentionally confirms a repeat when within the limit (FR-DISP-09/10).
4. The audit record is possible; the required event and final stock update can be committed consistently.
5. A remote command additionally satisfies `R` and is locally revalidated; no remote command directly actuates the physical lock.

**Post-conditions**

| Decision and physical outcome | Required state and effects |
| --- | --- |
| `¬G` (or remote `¬R`) | Reject; no new unlock, no quantity change; log required rejection; return reason and command ID when remote |
| `G` but hardware unlock fails / is unknown | Do not mark completed; record fault and enter appropriate blocking Fault Mode |
| `G`, selected drawer successfully unlocked | Record pending access for only its location; await actual user withdrawal and later confirmation |
| Actual quantity confirmed, within allowed/physically handled bounds; drawer safely closed; inventory/audit commit succeeds | Commit `q' = q − actualConfirmed`; record responsible user/time/request ID/outcome; mark completed once |
| Confirmation missing/ambiguous; drawer opened | Mark operation incomplete; **do not assume** `requestedQty` was physically removed; mark quantity unavailable when it cannot be confirmed pending Level 2/3 correction |
| Door fails to close or safety cannot be determined | No normal completion; detect fault; prevent further normal access |

**Withdrawal-policy specification.** For group `g`, `used(g,t) = Σ confirmedQty(x)` for all completed withdrawals `x` belonging to records assigned to `g` whose time is in the configured active window; `remaining(g,t) = max(0, maxQty(g) − used(g,t))`. `requestedQty > remaining` ⇒ reject/log. An explicit Level 2/3 replenish/correction override must be selected and logged and must not silently apply to ordinary Level 1 dispensing.

**Exceptions:** a logger/storage failure, corrupt authorization/policy, unknown lock state or failed actuator response must **not** lead to an unrecorded completed dispense. The safe response is refusal or Fault Mode, with an unresolved physical withdrawal marked for reconciliation.

**Current code:** `dispensing.py:DispensingController.dispense(), policy_status()`; `hardware_interface.py:HardwareInterface.unlock(), close_drawer()`; `monitor_communication.py:MonitorCommunication.handle_command()`. **Material mismatch:** the CLI obtains “Did you withdraw…?” and quantity confirmation **before** it calls `dispense()` (which then unlocks and closes immediately); remote demo code supplies `confirmedQty = requestedQty` automatically. These sequences **do not prove FR-DISP-06/FR-COM-07's physical confirmation safety**. The design specification is the target, not a claim about the implementation.

## 4. Duplicate dispensing and remote-command prevention

**Modules:** Dispensing Controller (request identity), Monitoring Communication Manager (command identity), Data Store (identity history). **Realizes:** SPEC-DISP-04, SPEC-COM-03. **Refines:** FR-DISP-05, FR-COM-13, NFR-SAF-03, NFR-REL-06, NFR-SEC-09/10.

**State:** `requests[id]` with status and confirmed outcome; `completedIds` set; `commands[id]` with validation/execution/outcome; `executedCommandIds` set. Identities must persist sufficiently to distinguish a retransmission from a new operation.

**State invariants**

- **INV-ID-1:** for every request ID `r`, `count(completed dispense operations with ID r) ≤ 1`.
- **INV-ID-2:** `r ∈ completedIds ⇒ later occurrence of r` causes no second drawer access or stock change.
- **INV-ID-3:** for every command ID `k`, `count(executions of k) ≤ 1`; returning an earlier outcome is not re-execution.
- **INV-ID-4:** retries of a recorded event/fault retain the same record ID; acknowledgement of ID does not create a new event.

**Pre-conditions:** a request has a non-empty stable ID; remote state-changing commands include command ID, source and authorization information; the system can reliably determine whether an ID has already completed/executed. If identity history is unavailable after an interruption, no speculative re-execution is allowed.

**Post-conditions**

| ID state | Required effect |
| --- | --- |
| Never seen and other safety checks pass | May begin, then record outcome; can reach Completed once |
| Already completed/executed | Return duplicate/prior outcome, with **no unlock, quantity change or second completion** |
| Seen but outcome unknown or interruption suspected | Hold/refuse until reconciled; do not assume safe to retry physical access |
| Record retransmitted but already acknowledged | Do not create another logical event; retain/reuse identity |

**Exceptions:** inability to access the identity history causes a safe refusal. An interrupted transaction cannot be treated as new merely because the process restarted.

**Current code:** `data_store.py:DataStore.completed_requests`, `dispensing.py:DispensingController.dispense()`, `monitor_communication.py:MonitorCommunication._seen_commands`. The in-memory sets provide same-process duplicate checks; **restart-safe replay protection is absent**. Prefixed IDs produced by `models.new_id()` are not UUID v4 strings as described in Part B's D2 documentation.

## 5. Inventory integrity and audit-commit safety — `InventoryManager`

**Modules:** Inventory Manager; Access Control; Event Logger; Data Store. **Realizes:** SPEC-INV-01/02, SPEC-LOG-01/02. **Refines:** FR-INV-01–09/11, FR-LOG-03/07/09–12, NFR-SAF-04, NFR-REL-01–03, NFR-AUD-04/05/07.

**State:** for each active medication `m`, `id(m)`, `location(m)`, `q(m) ∈ [0,20]`, `available(m) ∈ {true,false}`, `initialQty(m)`, `lastAccessUser/Time`; for each inventory operation, `auditOutcome`, `auditWritable`, associated event ID; set of active locations `L`.

**State invariants**

- **INV-INV-1:** `m1 ≠ m2 ⇒ id(m1) ≠ id(m2)` for active medication records.
- **INV-INV-2:** `location(m1) = location(m2) ⇒ m1 = m2` for active medication records. At most five active locations.
- **INV-INV-3:** `0 ≤ q(m) ≤ 20` for every active record.
- **INV-INV-4:** `available(m) = false ⇒ dispense(m)` is not authorized; Level 1 cannot restore availability.
- **INV-INV-5:** `q` changes **only** after an authorized registration, replenishment, correction or confirmed completed dispense, with a matching attributable audit record.
- **INV-INV-6:** after any completed inventory-changing operation, `audit.resultingQty = qAfter` and `audit.outcome` matches the committed outcome.
- **INV-INV-7:** local storage must not overwrite unacknowledged records, and protected actions cannot proceed when required audit storage is unavailable.

**Pre-conditions for registration/replenishment/correction**

1. Actor's session is valid and authorization level is **2 or 3**.
2. The target location is free for new registration or already assigned to the record being replenished/corrected; no second active record is assigned there.
3. The confirmed new quantity is a whole number within `[0,20]`. For replenishment, the added quantity is positive and resulting total ≤20.
4. Audit capacity exists, and stock and corresponding audit record will commit as one logical operation.
5. Correction/restoration of an uncertain record is explicitly confirmed by Level 2/3.

**Post-conditions**

| Change request / guard | Required `q'`, availability, and records |
| --- | --- |
| Valid registration | Generate stable unique ID; associate one free location; store required metadata, confirmed `q`, and audit |
| Invalid/occupied location or sixth container | Reject; leave stock/location map unchanged |
| Replenish with `a > 0` and `q + a ≤ 20` | `q' = q + a`; matching replenishment audit with user/time and resulting qty |
| Replenish would exceed 20 | **Reject entire addition**; `q' = q` (FR-INV-11/A-16) |
| Valid correction by Level 2/3 | `q' = correctedQty`; previous and resulting quantity, actor/time recorded; availability restored only upon confirmation |
| Quantity incorrect/unconfirmed | `available' = false`; no further dispense until verified by Level 2/3 |
| Valid completed dispense with actual confirmation | `q' = q − actualConfirmed`; matching one-time event and last-access details |
| Any required audit record cannot be created | **Reject before mutation**; stock and availability unchanged |

**Exceptions:** missing/corrupt medication state ⇒ no dispensing; if safe inventory cannot be determined, raise Critical fault (FR-FAULT-11). A missing audit write or storage failure does not justify unlogged stock changes.

**Current code:** `inventory.py:InventoryManager.add_medication(), replenish(), correct_quantity(), mark_unavailable()`; `event_logger.py:EventLogger.record(), can_record()`; `data_store.py`. **Material mismatch:** `InventoryManager.replenish()`/`correct_quantity()` update the medication object **before** calling `logger.record()`; the implementation has no transaction rollback. If logging fails at that point, `INV-INV-5/6` may be violated. The Level 2-only “mark unavailable” CLI path does not automatically handle every unconfirmed physical withdrawal.

## 6. Fault response, lockdown and recovery — `FaultManager`

**Modules:** Fault Manager (faults and mode in current prototype), Hardware Interface (sensor state), Authentication/Access Control, Event Logger, Local UI. **Realizes:** SPEC-FAULT-01/02/03, SPEC-MODE-01. **Refines:** FR-FAULT-01–12, FR-MODE-01–07, FR-AUTH-05; NFR-SAF-06/07, NFR-REL-04, NFR-PERF-02.

**State:** `mode ∈ {Normal, Maintenance, Fault}`; active faults `F`, each with `severity ∈ {INFO,WARNING,ERROR,CRITICAL}`, `type`, trigger condition and ID; `causePresent(f) ∈ {true,false,unknown}`; current `doorState`; `safeStateKnown`.

**State invariants**

- **INV-FAULT-1:** active Error or Critical ⇒ `mode = Fault`; mode transition within 3 s after fault detection (FR-MODE-02).
- **INV-FAULT-2:** `mode = Fault ⇒ normalLogin/normalMedicationOperation disabled ∧ restrictedFaultClearAuthentication available`. Physical door *closure* remains possible when required by FR-AUTH-05.
- **INV-FAULT-3:** `causePresent(f) ≠ false ⇒ fault f cannot be cleared`.
- **INV-FAULT-4:** Error clear requires Level 2/3; Critical clear requires Level 3.
- **INV-FAULT-5:** safe state unknown, corrupt authorization or unusable required inventory ⇒ Critical blocking fault.
- **INV-FAULT-6:** INFO/WARNING alone do not force Fault Mode. A Warning can coexist with Fault Mode caused by another active Error/Critical condition.
- **INV-FAULT-7:** while any blocking fault remains active, normal medication access remains disabled, even if the Monitoring System is offline.

**Pre-conditions**

1. The hardware/sensor or internal software condition to classify is observed as a current input, or explicitly classified unknown/unsafe.
2. Clearing requires an authenticated user through the restricted path with required level and verification that original trigger no longer exists.
3. Maintenance requires authenticated Level 3 and no blocking fault; maintenance must not permit normal dispensing.

**Post-conditions: fault detection/mode**

| Detected condition | New mode | Required effect |
| --- | --- | --- |
| INFO/WARNING; no other blocking fault | Normal | Record and display; warnings transmitted when link available |
| ERROR or CRITICAL | Fault within 3 s | Prevent normal access, command locks where possible, show severity/type/required level, log and notify |
| Safe state unknown / auth corrupt / inventory unusable | Fault within 3 s (Critical) | Same lockdown; never guess safety status |
| No new fault and blocking fault remains active | Fault | Preserve lockdown; no automatic clearing |

**Post-conditions: clearFault(f,user)**

| `causePresent(f)` | User level sufficient? | Required effect |
| --- | --- | --- |
| True or unknown | Any | Reject; fault remains active |
| False | No | Reject; fault remains active |
| False | Yes (L2/3 Error; L3 Critical) | Mark cleared; audit actor/time; if **no other blocking fault and safe state known**, return Normal; otherwise remain Fault |

**Door timeout exception:** if a door is open at session expiry, it must remain closable, **then** enter Error lockdown after closure. It must not be forcibly treated as closed when the hardware has not proved closure.

**Current code:** `fault_manager.py:FaultManager.raise_fault(), resolve_condition(), clear_fault(), enter_maintenance(), exit_maintenance()`; `hardware_interface.py`; `adc_app.py:_touch(), _clear_fault()`. The demo can simulate unlock/close failures but **does not** monitor a real door-close timeout, does not prove trigger resolution from actual sensors, and allows a normal login interface while Fault Mode is active. `_clear_fault()` calls `resolve_condition()` directly before clearing; this is not independent verification of the cause. These are safety limitations to disclose.

## 7. Verification and demonstration pointers

| Safety-critical grouping | Existing automated tests | Required additional verification before full conformance claim |
| --- | --- | --- |
| Authentication/authorization | Level 1 cannot replenish; Level 2 can replenish | Timed idle countdown, lockout time/recovery, permission-visibility, corrupted account state |
| Safe dispensing | Confirmed quantity used; Fault Mode rejects dispense | Actual after-unlock confirmation, unconfirmed removal, wrong location hardware test, audit-commit failure, remote command identity |
| Duplicate protection | Duplicate dispense request rejected | Interrupted/restarted request, duplicate remote command replay across restart |
| Inventory integrity | Level 2 replenishment, quantity reduction | Replenish-over-20 boundary, atomic audit failure, unknown inventory and restoration |
| Fault response | Error blocks dispense and Level 2 clears; Level 1 cannot enter Maintenance | Trigger still present, real sensor status, 3 s timed response, full Fault Mode lockdown |

Run the existing prototype tests from `ADC_Project_D2/` with `python -m unittest -v`. Existing passing tests are **evidence only for their tested paths**, not a proof of all D1 safety and timing obligations. See [implementation-notes.md](implementation-notes.md) for source and limitation details.
