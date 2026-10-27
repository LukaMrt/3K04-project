# Safety-Critical Functions - Part B (Hospital Monitoring System)

## 1. Scope and conventions

A function is safety-critical when its failure can hurt a patient without anybody noticing. Five functions of the Monitoring System are in that case:

| Function | What goes wrong if it fails | Hazard (D1) |
| --- | --- | --- |
| Offline detection | A cabinet stops communicating and nobody is warned; nobody goes to check it | FR-HLT-04, NFR-SAF-04 |
| Alarm reception | A temperature or fault alarm raised by a cabinet is never shown | NFR-SAF-04, NFR-PRF-01 |
| Alarm acknowledgement | An alarm disappears without anybody having seen it, or nobody knows who handled it | NFR-SAF-02, NFR-AUD-01 |
| Command sending | A cabinet is believed to be in maintenance mode, or reconfigured, when it is not | FR-COM-06, NFR-AUD-05 |
| Status and stock display | A silent cabinet is shown as working, or its old stock figures as current; a nurse is sent to a cabinet that is down or empty | NFR-SAF-01, NFR-SAF-03 |

The [precise specification](precise-specification.md), section 3, already gives **what** these functions must do, as function tables from monitored to controlled variables (SPEC-HLT-01, SPEC-HLT-02, SPEC-COM-03, SPEC-ALM-01, SPEC-ALM-02, SPEC-COM-04, SPEC-COM-05, SPEC-INV-01, SPEC-INV-02). This document specifies, as a black box, the module operations that realize these functions: for each one, the state it works on, its state invariants, its pre-conditions, its post-conditions and its exceptions. It says what holds before and after each call, never how the code computes it. Operations and modules are those of [modular-design-and-interfaces.md](modular-design-and-interfaces.md).

Notation:

- `now` is `clock.now()` at the call (D-29). `silence(a) = now − lastContact(a)`, in seconds.
- `v'` is the value of state variable `v` after the operation; a variable not mentioned keeps its value.
- `⊥` means "no value".
- Post-conditions are function tables read as in the precise specification: the conditions of a table are disjoint and complete.
- A row "nothing changes" means every state variable keeps its value, nothing is stored, audited or announced.

## 2. Offline detection - `CabinetHealthService.checkTimeouts()`

**Module:** Cabinet Health Monitor. **Realizes:** SPEC-HLT-02 (columns "`silence(a)` reaches 45 s / 75 s"), SPEC-HLT-01. **Refines:** FR-HLT-02, FR-HLT-03, FR-HLT-04, NFR-SAF-01, NFR-SAF-03 (D-01, D-03, D-15).

**State**, for each registered ADC `a`: `lastContact(a)` (time), `conn(a) ∈ {Reachable, Unreachable, Offline}`.

Let `expected(s)` be `Reachable` if `s < 45`, `Unreachable` if `45 ≤ s < 75`, `Offline` if `s ≥ 75`.

What the user then sees of `conn(a)` (never `ONLINE` while silent, stale labels) is specified in section 6.

**State invariants**

- **INV-HLT-1** (connectivity follows silence): after every call, `conn(a) = expected(silence(a))` for every ADC `a` that received no heartbeat since. Between two calls, `conn(a)` is at most one scheduler period late (1 s).
- **INV-HLT-2** (one alarm per loss of communication, D-15): the number of communication loss alarms raised for `a` equals the number of times `conn(a)` entered `Offline`.
- **INV-HLT-3** (FR-HLT-07): no operation of this module acknowledges or removes an alarm; a heartbeat that brings `a` back to `Reachable` leaves its communication loss alarm unacknowledged.

**Pre-conditions:** no other call of `checkTimeouts` is running. The scheduler calls the operation every second and skips a call while the previous one still runs (`start/scheduler.ts`).

**Post-conditions**, for each registered ADC `a`, with `s = silence(a)`:

| `conn(a)` | `s` | `conn'(a)` | Other effects |
| --- | --- | --- | --- |
| `Reachable` | `s < 45` | `Reachable` | None |
| `Reachable` | `45 ≤ s < 75` | `Unreachable` | Status change recorded (FR-HIS-03); `statusChanged` announced |
| `Reachable` | `s ≥ 75` | `Offline` | As the last row of `Unreachable` (a call was missed and the silence jumped past 75 s) |
| `Unreachable` | `s < 75` | `Unreachable` | None |
| `Unreachable` | `s ≥ 75` | `Offline` | `alarms.raiseCommunicationLoss(a)` called; status change recorded; `statusChanged` announced |
| `Offline` | any | `Offline` | None: the alarm is not raised again (INV-HLT-2) |

`s < 45` is not possible while `conn(a) ≠ Reachable`: only a heartbeat (`recordHeartbeat`) brings `lastContact(a)` forward, and it sets `conn(a) := Reachable` at the same time.

**Exceptions:** `StorageUnavailableError`. For an ADC whose change cannot be stored, `conn'(a) = conn(a)`, so the next call tries the same transition again. The alarm is stored before `conn(a)` becomes `Offline` (D-38): if the storage fails in between, the next call may raise a second alarm for the same loss, but never leaves an offline ADC without an alarm. A heartbeat received while a call is running keeps its last contact; if the call then writes `Unreachable` or `Offline`, the next heartbeat (at most 30 s later, NAT-03) brings the ADC back to `Reachable`: the error is on the safe side, never `ONLINE` while silent.

**Communication loss alarm** - `AlarmService.raiseCommunicationLoss(a)`. Pre: called by `checkTimeouts` only, when `a` enters `Offline`. Post: one new alarm `x` stored with `id(x)` a new UUID v4, `adc(x) = a`, `time(x) = now`, type `communication_loss`, severity `error`, source `communication_loss`, `ack(x) = ⊥`; then `raised(x)` announced with no repetition; returns `id(x)`. The description of the alarm does not mention the thresholds, which are the secret of this module ([modular decomposition](modular-decomposition.md), section 4).

**Code:** `checkTimeouts` and the transition table `ON_SILENCE` in `monitoring/app/modules/cabinet_health/cabinet_health_service.ts`, called by `monitoring/start/scheduler.ts`; `raiseCommunicationLoss` in `monitoring/app/modules/alarms/alarms_service.ts`. Tested in `tests/unit/cabinet_health/cabinet_health_service.spec.ts`, `tests/unit/alarms/alarms_service.spec.ts`, and end to end in `tests/functional/communication_loss.spec.ts`.

## 3. Alarm reception - `AdcCommunicationService.receiveHeartbeat()` and `AlarmService.recordFromAdc()`

**Modules:** ADC Communication Manager (accepts or rejects each transaction), Alarm Manager (records and announces alarms). **Realizes:** SPEC-COM-02, SPEC-COM-03, SPEC-ALM-02. **Refines:** FR-COM-08, FR-COM-10, FR-ALM-01 to 04, FR-REQ-01, NFR-SAF-04, NFR-PRF-01 (D-07, D-08, D-27, D-28, A-14).

**State** of the Alarm Manager: the set `alarms` of stored alarms, each `x` with `id(x)`, `adc(x)`, `time(x)`, `type(x)`, `severity(x)`, `source(x)` and `ack(x) ∈ {⊥} ∪ (UserId × time)`; the set `listeners` of subscribed functions. `ids` is the set of transaction identifiers already stored, alarms and dispensing activities together (D-28).

**State invariants**

- **INV-ALM-1** (each transaction at most once, D-28): no two stored alarms or dispensing activities share an identifier. Enforced by the Historical Data Store, which checks and stores in one database transaction.
- **INV-ALM-2** (an acknowledgement is final, NFR-SAF-02): for every operation and every stored `x`, `ack(x) ≠ ⊥ ⇒ ack'(x) = ack(x)`; and `ack(x)` goes from `⊥` to a value only through `acknowledge` (section 4).
- **INV-ALM-3** (announce what is stored, D-27): every `raised` or `acknowledged` event is about a change already stored, so the Dashboard never shows an alarm that a restart would lose.
- **INV-COM-1** (an acknowledged transaction is stored, FR-REQ-01): the ADC receives `received` for a transaction only in a `200` response, which is sent after every transaction of the heartbeat is stored. The ADC deletes a transaction only after that answer (NAT-04), so no alarm is lost between the two systems.

### 3.1 `receiveHeartbeat(payload)` (ADC Communication Manager)

**Pre-conditions:** none: any request received on `POST /api/v1/heartbeats`.

**Post-conditions** for the heartbeat as a whole: SPEC-COM-02 (invalid envelope → `400`, nothing stored; unknown ADC → `404`, discard logged, nothing stored). For a valid heartbeat `h` from a registered ADC `a`, each transaction `x` of `h`, in the order of `h`:

| Condition on `x` | Stored | Acknowledgement of `x` |
| --- | --- | --- |
| `x` is rejected by a row of SPEC-COM-03 with reason `r` (unknown type, missing field, invalid severity, invalid value, including the type `communication_loss` sent by an ADC) | Nothing; the rejection in the system log | `rejected(r)` |
| `x` is accepted by SPEC-COM-03 ∧ `x.type = alarm` | Whatever `recordFromAdc(x)` stores (section 3.2) | `received` |
| `x` is accepted by SPEC-COM-03 ∧ `x.type = dispensing` | The dispensing activity, unless its identifier is in `ids` (D-28) | `received` |

The response is `200` with these acknowledgements, and only once every transaction of `h` is handled; the inventory of `a` is then replaced and the heartbeat counts as a contact of `a`.

### 3.2 `recordFromAdc(alarm)` (Alarm Manager)

**Pre-conditions:** `alarm` is accepted by SPEC-COM-03 (section 3.1); `alarm.adcId` is registered.

**Post-conditions**, with `id = alarm.transactionId`:

| Condition | `alarms'` | Result | Announced |
| --- | --- | --- | --- |
| `id ∉ ids` | `alarms ∪ {x}` with `id(x) = id`, the ADC's own timestamp (A-14), its type, severity and description, source `adc`, `ack(x) = ⊥` | `recorded` | `raised(x)`, with a cue repeated every 60 s if `severity(x) = critical`, played once otherwise (SPEC-ALM-02) |
| `id ∈ ids` | `alarms` | `duplicate` | Nothing |

Both results are acknowledged to the ADC as `received` (FR-COM-08): the ADC sent the alarm again because it lost the first answer (D-07).

**Exceptions:** `StorageUnavailableError`. Nothing is stored; `receiveHeartbeat` answers `500`, acknowledges no transaction and does not count the heartbeat as a contact (FR-COM-03). The ADC keeps the alarm and sends it again (NAT-04); the transactions of the same heartbeat that were already stored are then answered `duplicate`.

**A failing listener** (for example, a Dashboard that cannot push the event) is logged and does not change the result: the alarm stays stored and the other listeners are still called (D-36). Otherwise the ADC would get an error, resend the alarm, and the second sending would be a duplicate that is never announced.

**Code:** `handleTransaction` in `monitoring/app/modules/adc_communication/adc_communication_service.ts` and `readTransaction` in `protocol.ts` (section 3.1, tested in `tests/functional/adc_protocol.spec.ts`); `recordFromAdc` in `monitoring/app/modules/alarms/alarms_service.ts` (section 3.2, tested in `tests/unit/alarms/alarms_service.spec.ts`).

## 4. Alarm acknowledgement - `AlarmService.acknowledge(actor, alarmId)`

**Module:** Alarm Manager. **Realizes:** SPEC-ALM-01. **Refines:** FR-ALM-05, FR-ALM-06, NFR-SAF-02, NFR-SEC-02, NFR-AUD-01 (D-09, D-26, D-30, D-31).

**State:** as in section 3, plus the audit log `audit` of the Historical Data Store. Invariants INV-ALM-1 to INV-ALM-3 hold.

**Pre-conditions:** `role(actor) ∈ {nurse, pharmacist, technician}` (D-09). The Dashboard checks it with User Management before the call (SPEC-USR-01, D-31); a refused user never reaches this operation, sees the permission message and is not audited (D-26).

**Post-conditions**, with `u = actor.userId` and `x` the alarm identified by `alarmId`:

| Condition | `ack'(x)` | `audit'` | Announced | Result |
| --- | --- | --- | --- | --- |
| No stored alarm has identifier `alarmId` | - | `audit` | Nothing | Throws `UnknownAlarmError` |
| `ack(x) = ⊥` | `(u, now)` | `audit` + one entry (`u`, `acknowledge_alarm`, `adc(x)`, `acknowledged alarmId`, `now`) | `acknowledged(x, u, now)` | `acknowledged(now)` |
| `ack(x) = (v, t')` | `(v, t')` | `audit` | Nothing | `alreadyAcknowledged(v, t')` |

On `acknowledged(x, …)`, the Dashboard removes `x` from `c_alarmList` and stops the repetition of its cue (SPEC-ALM-01, last row). The third row is how FR-ALM-06 is met: the refusal names who acknowledged the alarm and when.

**Two acknowledgements at the same time.** Both callers may read `ack(x) = ⊥`. The Historical Data Store keeps at most one acknowledgement per alarm (primary key `alarm_id`); the second write fails with `AlarmAlreadyAcknowledgedError`, which the operation catches and answers with the third row, naming the winner. So for every alarm: at most one acknowledgement, one audit entry and one `acknowledged` event.

**Exceptions:** `UnknownAlarmError` (the caller passed an identifier that was never stored, D-30); `StorageUnavailableError` (nothing changes). Known limit: the acknowledgement and its audit entry are two writes. If the storage fails between them, the acknowledgement stays without its audit entry. Both writes go to the same database, so in practice they fail together, and the operation reports the error.

**Code:** `acknowledge` in `monitoring/app/modules/alarms/alarms_service.ts`; `recordAcknowledgement` in `monitoring/app/modules/history/history_service.ts`. Tested in `tests/unit/alarms/alarms_service.spec.ts` (acknowledgement, second acknowledgement, race, unknown alarm) and `tests/unit/history/history_service.spec.ts` (one acknowledgement per alarm).

## 5. Command sending - `AdcCommunicationService.sendCommand()` and `sendConfiguration()`

**Module:** ADC Communication Manager. **Realizes:** SPEC-COM-04, SPEC-COM-05. **Refines:** FR-COM-04, FR-COM-05, FR-COM-06, FR-COM-11, FR-COM-12, NFR-SEC-02, NFR-AUD-01, NFR-AUD-05 (D-04, D-10, D-26, D-31).

**State:** the contact address of each registered ADC (D-32); the audit log. The status of the target ADC is read from the Cabinet Health Monitor.

**State invariants**

- **INV-CMD-1** (nothing sent to an offline ADC, FR-COM-12): no message leaves for `a` while `c_displayedStatus(a) = OFFLINE`. The status is the one computed by the last `checkTimeouts` (INV-HLT-1), so a command can still leave during the second in which `silence(a)` reaches 75 s.
- **INV-CMD-2** (delivered means confirmed, D-04): the outcome is `delivered` only for a `200` answer, received within 10 s, that carries the identifier of this message and the identifier of `a`.
- **INV-CMD-3** (every sending is traceable, NFR-AUD-05): the audit entry of a sending is written before the message leaves, and exactly one outcome entry follows it. A sending without outcome in the audit log therefore shows a crash during the wait.
- **INV-CMD-4** (no automatic retry, D-04): each call sends at most one message.

**Pre-conditions:** `permitted(actor, k)`, checked by the Dashboard (D-31): a command requires the technician or administrator role, a configuration the administrator role (D-10). For a configuration, the settings respect interface §4.2 (time server URL, screen lock timeout from 15 to 600 s).

**Post-conditions**, with `u = actor.userId`, `a` the target ADC and `k` a new UUID v4 for the message:

| Condition | Sent to `a` | Audit entries added (`u`, action, `a`, outcome, `now`) | Result |
| --- | --- | --- | --- |
| `c_displayedStatus(a) = OFFLINE` | Nothing | `refused: ADC offline` | `refusedOffline` |
| Not offline ∧ answer `200` within 10 s ∧ answer id = `k` ∧ answer ADC = `a` | `k` | `sent k`, then `delivered k` | `delivered` |
| Not offline ∧ answer `200` within 10 s ∧ (answer id ≠ `k` ∨ answer ADC ≠ `a`) | `k` | `sent k`, then `failed k: ID_MISMATCH` | `failed(ID_MISMATCH)` |
| Not offline ∧ error answer (4xx, 5xx) within 10 s | `k` | `sent k`, then `failed k: <code>` | `failed(code, message)`, with the ADC's code and message |
| Not offline ∧ no answer within 10 s, or connection error | `k` | `sent k`, then `failed k: TIMEOUT` | `failed(TIMEOUT)` |

The action is `send_command` or `send_configuration`. An unreachable ADC (`45 ≤ silence(a) < 75`) still receives the message (interface §7). The Dashboard shows the result to the sender (SPEC-COM-05).

**Exceptions:** `UnknownAdcError` (`a` is not registered, or has no contact address): nothing sent, nothing audited. `StorageUnavailableError` if the first audit entry cannot be written: nothing sent.

**Code:** `sendCommand`, `sendConfiguration` and `deliver` in `monitoring/app/modules/adc_communication/adc_communication_service.ts`; `readDeliveryAnswer` in `protocol.ts`. Tested in `tests/functional/adc_commands.spec.ts`.

## 6. Status and stock display - `CabinetHealthService.getStatus()` and `listAdcs()`

**Modules:** Cabinet Health Monitor (computes the status), Inventory Supervisor (dates the stock), Operator Dashboard (shows both). **Realizes:** SPEC-HLT-01, SPEC-INV-01 (sources), SPEC-INV-02. **Refines:** FR-HLT-01, FR-HLT-05, FR-HLT-06, FR-DSH-01, FR-INV-02, FR-INV-04, NFR-SAF-01, NFR-SAF-03, NFR-USA-02 (D-02, D-03, D-16, D-21, D-22, D-23).

**State:** as in section 2 (`lastContact(a)`, `conn(a)`), plus `reported(a)`, the state carried by the latest valid heartbeat of `a`, or `⊥` before the first one; and, in the Inventory Supervisor, the latest inventory of `a` with the time `heartbeatAt(a)` of the heartbeat it comes from.

**State invariants**

- **INV-DSP-1** (NFR-SAF-03): `displayedStatus(a) = ONLINE ⇒ conn(a) = Reachable`. A silent cabinet is never shown as working.
- **INV-DSP-2** (D-03): `stale(a) ⇔ conn(a) ≠ Reachable`, and a stale status always comes with `lastContact(a)`.
- **INV-DSP-3** (NFR-SAF-01, NFR-REL-03): the stock of `a` is never shown without `heartbeatAt(a)`, nor without the stale label when `stale(a)`. The Dashboard reads it with `inventory.getInventory(a)` and labels it from `getStatus(a)` on the same page.
- **INV-DSP-4** (D-23): a cabinet proposed as a source of stock is reachable: `reachableOnSameFloor(a)` returns only the ADCs `b ≠ a` of the same floor with `silence(b) < 45`, computed at the call (SPEC-INV-01).
- **INV-DSP-5** (D-22, D-27): every change of `displayedStatus(a)` is announced (`statusChanged`), so an open dashboard shows it within 2 s without reload.

**Pre-conditions:** none.

**Post-conditions** of `getStatus(a)`: nothing changes; the result is `(displayedStatus(a), stale(a), lastContact(a))` with:

| `conn(a)` | `reported(a)` | `displayedStatus(a)` | `stale(a)` |
| --- | --- | --- | --- |
| `Reachable` | `⊥` | `PENDING` (D-21) | false |
| `Reachable` | `e_online`, `e_maintenance` or `e_fault` | `ONLINE`, `MAINTENANCE` or `FAULT` (D-16) | false |
| `Unreachable` | any | `UNREACHABLE` | true |
| `Offline` | any | `OFFLINE` | true |

The connectivity overrides the reported state (D-02): the last two rows ignore `reported(a)`. `listAdcs(filter)` gives the same triple for every registered ADC whose `displayedStatus` matches `filter.status` (all of them when it is absent), sorted by label.

**Exceptions:** `getStatus`: `UnknownAdcError` if `a` is not registered. `StorageUnavailableError` for both.

**Code:** `getStatus`, `listAdcs`, `reachableOnSameFloor` and the function `displayedStatus` in `monitoring/app/modules/cabinet_health/cabinet_health_service.ts`, tested in `tests/unit/cabinet_health/cabinet_health_service.spec.ts`; `getInventory` and `findSources` in `monitoring/app/modules/inventory/inventory_service.ts`, tested in `tests/unit/inventory/inventory_service.spec.ts`; the pages in `monitoring/resources/views/` (issue #40).
