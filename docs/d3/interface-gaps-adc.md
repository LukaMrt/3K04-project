# ADC Implementation vs Interface Contract v1.0 - Gap List (not part of the PDF)

Issue #61. Comparison of the ADC code in `adc/` (commit `9dd5ce0`, Nov 13 2026) with the
[ADC ↔ Monitoring interface contract v1.0](../part-b/interface-adc-monitoring.md). Section numbers
(§) refer to the contract; `file:line` to `adc/`.

**Summary.** The ADC has no network transport yet: `MonitorCommunication` builds messages in its own
format, keeps them in an in-memory outbox and acknowledges them itself (`monitor_communication.py:48-58`).
Every point of the contract is therefore still to implement on the ADC side. The good news is that all
of it lives in one module: `MonitorCommunication` is the only class that knows the protocol, so the
rest of the ADC (dispensing, inventory, faults) does not need to change, apart from the points of
section 8 that need a decision from both teams.

Each gap has an ID so that it can be followed in the integration log and in the integration report.
**Blocks** says which integration scenario cannot run until the gap is closed (#74 dispense → dashboard,
#75 alarm → dashboard, #76 link drop, #73 commands).

## 1. Transport

| ID | Contract | ADC today | Blocks |
| --- | --- | --- | --- |
| G-01 | The ADC sends `POST /api/v1/adcs/register` and `POST /api/v1/heartbeats` over HTTP(S), JSON in UTF-8 (§1, §3) | No HTTP client; messages go to `self._outbox` (`monitor_communication.py:27-30`) | All |
| G-02 | Acknowledgements are the synchronous HTTP responses of the Monitoring System (§1, §3.2) | `flush_simulated()` marks every message acknowledged by itself (`monitor_communication.py:55`) | All |
| G-03 | The ADC exposes an HTTP server at its `contactAddress` for `/api/v1/commands` and `/api/v1/configuration` (§4) | No server; commands are Python calls from the GUI (`adc_gui.py`, "Remote unlock test") | #73 |
| G-04 | A heartbeat every 30 s, plus one immediately on a new alarm or a state change (§1, §4.1, A-08) | The GUI calls `status_cycle()` every 30 s (`adc_gui.py`, `root.after(30_000, …)`); nothing is sent on a new fault or mode change | #75 (delay up to 30 s) |

## 2. Registration (§3.1)

| ID | Contract | ADC today | Blocks |
| --- | --- | --- | --- |
| G-05 | `adcId`: UUID v4, generated once and **kept across restarts** | `cabinet_id="ADC-DEMO-001"` hard-coded (`monitor_communication.py:9`); nothing is persisted | All |
| G-06 | `label`, `contactAddress`, `location.floor` (integer), `location.description` | Only `location="Demo Room"`; no floor, no contact address | All (registration refused with `400 INVALID_MESSAGE`) |
| G-07 | Register at every start-up, and again when a heartbeat gets `404 ADC_NOT_REGISTERED` | No registration at all | All |

## 3. Heartbeat envelope (§3.2)

| ID | Contract | ADC today | Blocks |
| --- | --- | --- | --- |
| G-08 | Envelope `adcId`, `sentAt`, `state`, `inventory`, `transactions` | `ADC_STATUS` message with `cabinet_id`, `timestamp`, `occupied_locations`, `empty_locations`, `active_faults`, … (`monitor_communication.py:16-25`) | All |
| G-09 | `inventory`: the **complete** inventory, one entry per medication with `medicationId`, `medicationName`, `quantityInBoxes` | Only the number of occupied and empty containers | #74 (stock never updated on the dashboard) |
| G-10 | `state` ∈ `online`, `maintenance`, `fault` (§5.1) | `Mode` values `NORMAL`, `MAINTENANCE`, `FAULT` (`models.py:13-16`). Mapping: `NORMAL → online`, `MAINTENANCE → maintenance`, `FAULT → fault` | All (`400` on the envelope) |
| G-11 | `transactions`: only `alarm` and `dispensing` transactions not yet acknowledged | Status messages and **every** audit event (logins, password changes, policy changes…) are queued as `ADC_EVENT` (`monitor_communication.py:32-38`) | #74, #75 (each one rejected `UNKNOWN_TYPE`) |
| G-12 | Each transaction is removed only when the Monitoring System answers `received` or `rejected` for its `transactionId`; at most one heartbeat in flight (§3.2, §7) | Removal on the simulated acknowledgement; the outbox grows by one status message every 30 s and is never purged | #76 |

## 4. Transactions (§3.2)

### 4.1 Dispensing

| ID | Contract | ADC today | Blocks |
| --- | --- | --- | --- |
| G-13 | One `dispensing` transaction per completed withdrawal: `transactionId`, `timestamp`, `medicationId`, `medicationName`, `quantityInBoxes` (≥ 1), `patientId`, `staffMemberId`, `staffMemberName` | The audit event has `request_id`, `medication_id`, `requested_quantity`, `confirmed_quantity`, `location`, and the username in `user` (`dispensing.py:68-72`, `153-158`) | #74 |
| G-14 | A transaction sent again is **identical** to the first sending (A-26) | **Bug for integration:** the `DISPENSE_STARTED` event is rewritten in place into `DISPENSE_COMPLETED` (`dispensing.py:152-158`). If a status cycle runs while the drawer is open, the event is sent and acknowledged as "started", and the completion is never sent | #74 |
| G-15 | `quantityInBoxes` ≥ 1 | A confirmed withdrawal of 0 is allowed (`dispensing.py:136`): it must not be sent as a dispensing transaction | #74 (`rejected INVALID_VALUE`) |
| G-16 | `staffMemberId` (UUID) and `staffMemberName` (label) | Users only have a `username` (`models.py:26-29`) | #74 |
| G-17 | `patientId` (UUID); **no patient name** on the interface (§2, PHIPA) | `Medication.patient_name` (`models.py:36`), no patient identifier; Part A FR-COM-14 asks for the patient name. **To decide (section 8)** | #74 |

### 4.2 Alarms

Every fault raised by `FaultManager.raise_fault()` (`fault_manager.py:16`) becomes one `alarm` transaction: `transactionId`, `timestamp`, `alarmType` (§5.2), `severity` (§5.3), optional `description` (the fault message). Mapping of the fault types that exist in the code:

| ADC `fault_type` (raised in) | `alarmType` (D3-D-04) |
| --- | --- |
| `DRAWER_UNLOCK` (`dispensing.py:78`, GUI) | `dispensing_failure` |
| `DRAWER_CLOSE` (`dispensing.py:108`, GUI) | `dispensing_failure` |
| `SESSION_DOOR_OPEN` (`adc_app.py:38`) | `door_left_open` |
| `SOFTWARE` (simulated, GUI and CLI) | `hardware_fault` |
| `LOW_INVENTORY` (`dispensing.py:163`) | **Not sent as an alarm**: the Monitoring System computes low stock from the inventory (D3-D-03) |
| `LOGIN_LOCKOUT` audit event (`authentication.py`) | Optional, not part of D3-D-04: `unauthorized_access`, severity `warning` |

| ID | Contract | ADC today | Blocks |
| --- | --- | --- | --- |
| G-18 | `severity` ∈ `info`, `warning`, `error`, `critical` (lowercase); an unknown severity is rejected | `Severity` values in uppercase (`models.py:18-22`) | #75 (`rejected INVALID_SEVERITY`) |
| G-19 | `alarmType` from §5.2; `communication_loss` is reserved to the Monitoring System | Free fault types (table above) | #75 (unknown types are accepted and shown as is, so this is not blocking, but the labels would be wrong) |

## 5. Common formats (§2)

| ID | Contract | ADC today | Blocks |
| --- | --- | --- | --- |
| G-20 | Every identifier is a lowercase UUID v4 | `new_id(prefix)` gives `MED-1A2B3C4D5E6F` (prefix + 12 uppercase hex digits, `models.py:10-11`); seed data uses `MED-001` | All (`rejected INVALID_VALUE`) |
| G-21 | Timestamps in RFC 3339 **UTC**, with `Z` and milliseconds (`2026-10-16T14:03:27.512Z`) | `now_iso()` gives local time with an offset, to the second (`models.py:7-8`) | All |
| G-22 | Quantities are integers **in boxes** | The ADC counts **units**, at most 20 per container (`inventory.py:25`). **To decide (section 8)** | #74 |

## 6. Commands and configuration (§4)

| ID | Contract | ADC today | Blocks |
| --- | --- | --- | --- |
| G-23 | Single command `set_maintenance_mode` with `parameters.enabled`; answer `200 {commandId, adcId, status: "applied"}` within 10 s; a `commandId` received twice is acknowledged again without being applied twice | Only `REMOTE_UNLOCK`, which is not in the contract (`monitor_communication.py:83`); a duplicate `command_id` is **refused** instead of acknowledged again (`monitor_communication.py:77`) | #73 |
| G-24 | Maintenance requested by the Monitoring System, without a local user; `409 COMMAND_NOT_APPLICABLE` when the ADC is in `fault` | `enter_maintenance()` requires a logged-in Level 3 user (`fault_manager.py:56-57`); the fault case already raises an error that can be mapped to `409` | #73 |
| G-25 | Error answers with the common error body and the codes of §6.2 | Python dictionaries `{"accepted": False, "reason": …}` | #73 |
| G-26 | `/api/v1/configuration`: `timeServer`, `screenLockTimeoutSeconds` (15-600) | Inactivity is configured locally as a grace period (≥ 15 s) plus a countdown (1-900 s) (`adc_app.py:197-203`); no time server setting | Configuration only (optional for the demo) |

## 7. Unavailability and retries (§7)

| ID | Contract | ADC today | Blocks |
| --- | --- | --- | --- |
| G-27 | On timeout, `5xx` or no answer: keep the transactions, retry at the next heartbeat, never faster | Link state is a manual switch (`set_connection`, toggled from the GUI or CLI) | #76 |
| G-28 | Restart: register again with the **same** `adcId`, then resend the kept transactions | Everything is in memory and lost on exit (README, "Important limitations") | #76 (restart variant) |

## 8. Decisions taken together (Part A and Part B)

Option (a) was chosen for every question on Nov 13, 2026, by Part B; Part A still has to confirm
items 1 and 3, which change how two of its D1 requirements are realized. The decisions are recorded in
section 6 of the D3 document (`assumptions-and-decisions.md`).

| # | Question | Options | Decision | Recorded as |
| --- | --- | --- | --- | --- |
| 1 | Patient name (G-17): Part A FR-COM-14 lists it, the contract excludes it (PHIPA, A-21) | (a) keep the contract: the ADC sends a `patientId` and keeps the name locally; (b) add a name field to the contract | (a): no requirement of the Monitoring System needs the name, and sending it would put health information on the interface for nothing. FR-COM-14 already limits the transmission to what the agreed interface requires | D3-D-01 |
| 2 | Units or boxes (G-22) | (a) agree that one ADC "unit" is one "box" of the contract; (b) rename the field | (a): no code change on either side | D3-A-01 |
| 3 | `REMOTE_UNLOCK` (G-23) is not in the contract | (a) leave it out of the integration; (b) add it as a v1.1 command | (a): it is not needed for the demo scenarios, and a remote unlock is a safety risk that would need its own analysis | D3-D-02 |
| 4 | Low inventory as an alarm | (a) not sent; (b) sent as `other`, severity `warning` | (a): the Monitoring System already raises low stock from the inventory, so the dashboard would show it twice | D3-D-03 |
| 5 | Who writes the ADC adapter (G-01 to G-28) | (a) Part A with a Part B member; (b) Part A alone | (a): it is the bottleneck of the integration, and it lets that member answer questions on the ADC in the demo | To record in the division of work (introduction, section 1.2) |

## 9. Shortest path to a first end-to-end scenario (#74)

1. G-05, G-06, G-07, G-20, G-21: registration with a persisted UUID and the contract formats.
2. G-01, G-02, G-08, G-09, G-10: a heartbeat every 30 s with the complete inventory and the real HTTP acknowledgement.
3. G-11, G-12, G-13 to G-16: only completed withdrawals as `dispensing` transactions, removed on `received` / `rejected`.

With these, a dispense on the ADC appears in the Monitoring history and the stock updates on the
dashboard. Alarms (#75: G-18, G-19, immediate heartbeat of G-04) come next, then the link drop (#76:
G-27), then commands (#73: G-03, G-23 to G-25). The ADC simulator of the Monitoring System
(`monitoring/simulator/fake_adc.ts`) already speaks the contract and is a working example of every
message.
