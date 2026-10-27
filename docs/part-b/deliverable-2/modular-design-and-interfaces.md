# Modular Design and Interfaces - Part B (Hospital Monitoring System)

## 1. Modules

The system is decomposed into nine leaf modules. Seven of them are the components of the D1 high-level architecture; the Operator Dashboard, a D1 component too, becomes the user interface module; the Clock is new (D-29). Their responsibilities and secrets, the anticipated changes behind the secrets, the classification of the modules (hardware hiding, behaviour hiding, software decision hiding), the USES hierarchy diagram and the design review test are given in the module guide: [modular-decomposition.md](modular-decomposition.md). This document gives the interface of each module; the table below says where each one lives in the code.

| ID | Module | Code |
| --- | --- | --- |
| 1.1.1 | Clock | `app/modules/clock/` |
| 1.1.2 | ADC Communication Manager | `app/modules/adc_communication/` |
| 1.1.3 | Operator Dashboard | `app/modules/dashboard/`, `app/controllers/`, `resources/views/` |
| 1.2.1 | Cabinet Health Monitor | `app/modules/cabinet_health/` |
| 1.2.2 | Alarm Manager | `app/modules/alarms/` |
| 1.2.3 | Inventory Supervisor | `app/modules/inventory/` |
| 1.2.4 | User Management | `app/modules/users/` |
| 1.2.5 | Reporting | `app/modules/reporting/` |
| 1.3.1 | Historical Data Store | `app/modules/history/` |

The USES list of each module in section 3 is the source of the USES hierarchy diagram.

## 2. Interface conventions

These rules hold for every module; they are not repeated in each table.

- **Exported operations** are the public methods of the module's service class (`<module>_service.ts`; `live_channel.ts` for the Dashboard); exported types are in `types.ts`, exceptions in `errors.ts`. Nothing else of a module may be imported by another module. Each method carries the same pre-conditions, effects and exceptions as its row below in its doc comment.
- **Shared vocabulary**: `app/modules/shared/` holds the identifier types, `Actor`, `Role`, `DateRange`, the enumerations used by several modules (severity, reported state, connectivity) and `StorageUnavailableError`. It is not a module: it has no state, no behaviour and no secret, and using its types is not a USES relation.
- **No storage object crosses an interface**: operations take and return plain data (types of `types.ts`), never a Lucid model or a database row. A module that stores data keeps its Lucid models in its own `models/` folder, which no other module imports.
- **Time** is read from the Clock module (D-29), never from `Date.now()`.
- **Foreseen refusals are results, faults are exceptions** (D-30). A result type such as `{ kind: 'acknowledged' } | { kind: 'alreadyAcknowledged' }` lists every refusal the specification foresees; an exception means that the caller broke a pre-condition (for example an unknown identifier) or that the system failed (storage unavailable).
- **Permissions are pre-conditions** (D-31): an operation used on behalf of a user assumes that the Dashboard has already checked, with User Management, that the user's role allows it. The operation does not check it again.
- **Change announcements** (D-27): a module that must tell the dashboard about a change exposes a `subscribe(listener)` operation. Listeners are called after the change is stored; `subscribe` returns a function that removes the listener.
- **Identifiers**: `AdcId`, `AlarmId`, `TransactionId`, `MedicationId`, `PatientId`, `StaffMemberId`, `CommandId` are UUID v4 strings, as in the interface contract; `UserId` is the account number.
- **An `Actor`** is the user on whose behalf an operation is called: `{ userId, role }`.
- Every effect "logged" goes to the Historical Data Store: audit log for user actions, system log for system events (FR-HIS-08).

## 3. Module interfaces

### 3.1 Clock

**Uses:** none. **Used by:** every module that reads the time.

| Operation | Inputs | Output | Pre-conditions | Effects | Exceptions |
| --- | --- | --- | --- | --- | --- |
| `now()` | - | `Date` | - | None | - |

Semantics: two successive calls never go backwards (NAT-07). Tests and demonstrations swap the Clock for one they move forward by hand (`app.container.swap`), so that the 45 s and 75 s transitions can be shown at once.

### 3.2 Historical Data Store

**Uses:** Clock. **Used by:** User Management, Alarm Manager, Cabinet Health Monitor, ADC Communication Manager, Reporting.

State: an append-only set of records, each with its kind and its event date. No operation modifies or deletes a record, except the purge of expired records (NFR-AUD-02, NFR-AUD-03).

| Operation | Inputs | Output | Pre-conditions | Effects | Exceptions |
| --- | --- | --- | --- | --- | --- |
| `recordAlarm(alarm)` | `StoredAlarm` | `RecordOutcome` (`recorded` \| `duplicate`) | - | If no alarm or dispensing activity has `alarm.alarmId` as transaction identifier: alarm stored, answer `recorded`; else nothing stored, answer `duplicate` (D-28) | `StorageUnavailableError` |
| `recordDispensing(activity)` | `DispensingRecord` | `RecordOutcome` | Fields valid (FR-COM-09) | Same uniqueness rule as `recordAlarm` | `StorageUnavailableError` |
| `recordAcknowledgement(ack)` | `AcknowledgementRecord` (alarm, user, time) | `void` | The alarm is stored and has no acknowledgement yet | Acknowledgement stored, in a record of its own: the alarm record itself is never modified | `UnknownRecordError`, `AlarmAlreadyAcknowledgedError` (two acknowledgements racing), `StorageUnavailableError` |
| `findAlarm(alarmId)` | `AlarmId` | `StoredAlarmWithAck \| null` | - | None | `StorageUnavailableError` |
| `listUnacknowledgedAlarms()` | - | `StoredAlarmWithAck[]`, most recent first | - | None | `StorageUnavailableError` |
| `recordStatusChange(change)` | `StatusChangeRecord` (ADC, reported state, connectivity, time) | `void` | - | Stored (FR-HIS-03) | `StorageUnavailableError` |
| `appendAudit(entry)` | `AuditEntry` (user, action, target, time, outcome) | `void` | - | Stored (NFR-AUD-01, 04, 05, 06) | `StorageUnavailableError` |
| `appendSystemLog(entry)` | `SystemLogEntry` (event, ADC if any, details, time) | `void` | - | Stored (FR-HIS-08, NFR-AVL-05) | `StorageUnavailableError` |
| `saveReport(report)` | `SavedReport` (kind, parameters, figures, generation time) | `ReportId` | - | Stored with its figures as generated (FR-HIS-06, FR-RPT-08) | `StorageUnavailableError` |
| `findReport(reportId)` | `ReportId` | `SavedReport \| null` | - | None | `StorageUnavailableError` |
| `queryAdcHistory(adcId, range)` | `AdcId`, `DateRange` | `AdcHistory` (dispensing activities, status changes, alarms and acknowledgements) | - | None; patient identifiers included | `StorageUnavailableError` |
| `queryDispensing(filter)` | `DispensingFilter` (range, ADC?, medication?, patient?, staff member?) | `DispensingRecord[]` | - | None | `StorageUnavailableError` |
| `queryAlarms(range)` | `DateRange` | `StoredAlarmWithAck[]` | - | None | `StorageUnavailableError` |
| `queryAudit(filter)` | `AuditFilter` (range, ADC?, user?) | `AuditEntry[]` | - | None | `StorageUnavailableError` |
| `purgeExpired()` | - | `number` (records deleted) | - | Deletes every record whose retention period (SPEC-HIS-01) ended; called at least every 24 h (FR-HIS-09) | `StorageUnavailableError` |

Semantics: a record returned by a query is identical to the record stored, whatever happened in between (NFR-REL-01). `DateRange` bounds are inclusive.

### 3.3 User Management

**Uses:** Historical Data Store, Clock. **Used by:** Operator Dashboard, Reporting.

Authentication itself (login form, session, password hashing) is provided by the AdonisJS starter kit; this module adds roles, permissions and account management.

| Operation | Inputs | Output | Pre-conditions | Effects | Exceptions |
| --- | --- | --- | --- | --- | --- |
| `can(actor, fn)` | `Actor`, `DashboardFunction` | `boolean` | - | None; answer read from the D-14 matrix (SPEC-USR-01) | - |
| `canSeePatientIds(actor)` | `Actor` | `boolean` | - | None; true for pharmacist and administrator only (SPEC-USR-02) | - |
| `actorOf(userId)` | `UserId` | `Actor \| null` | - | None; `null` if the account is deactivated (D-25) | `UnknownUserError` |
| `createAccount(admin, account)` | `Actor`, `NewAccount` (name, email, password, role) | `UserId` | `admin` may manage accounts | Account created, active; audited (NFR-AUD-04) | `EmailAlreadyUsedError` |
| `changeRole(admin, userId, role)` | `Actor`, `UserId`, `Role` | `void` | `admin` may manage accounts | Role changed, applies from the next login of that user (FR-USR-04); audited | `UnknownUserError` |
| `deactivate(admin, userId)` | `Actor`, `UserId` | `void` | `admin` may manage accounts | Account deactivated: refused at login, open sessions closed at their next request (D-25); audited | `UnknownUserError` |

### 3.4 Alarm Manager

**Uses:** Historical Data Store, Clock. **Used by:** ADC Communication Manager, Cabinet Health Monitor, Operator Dashboard.

State: the alarms stored in the Historical Data Store, each `unacknowledged` or `acknowledged(user, time)`. Invariant: an alarm becomes acknowledged only through `acknowledge`, and never goes back to unacknowledged (NFR-SAF-02).

| Operation | Inputs | Output | Pre-conditions | Effects | Exceptions |
| --- | --- | --- | --- | --- | --- |
| `recordFromAdc(alarm)` | `NewAdcAlarm` (transaction ID, ADC, ADC timestamp, type, severity, description?) | `RecordOutcome` | Alarm validated against SPEC-COM-03 (by the ADC Communication Manager); ADC registered | If `recorded`: stored unacknowledged with the ADC timestamp (A-14), then `raised` announced. If `duplicate`: nothing (D-28) | `StorageUnavailableError` |
| `raiseCommunicationLoss(adcId)` | `AdcId` | `AlarmId` | Called by the Cabinet Health Monitor only, when `adcId` becomes offline | New alarm, type `communication_loss`, severity `error`, timestamp = now, stored unacknowledged, then `raised` announced (FR-HLT-04, D-15) | `StorageUnavailableError` |
| `acknowledge(actor, alarmId)` | `Actor`, `AlarmId` | `AcknowledgeResult`: `acknowledged(at)` \| `alreadyAcknowledged(by, at)` | `actor` may acknowledge alarms (D-09, D-31) | If unacknowledged: acknowledgement stored, audited (NFR-AUD-01), then `acknowledged` announced. Else nothing changes (SPEC-ALM-01). If another acknowledgement wins the race between the check and the storage (`AlarmAlreadyAcknowledgedError` from the Historical Data Store), the exception is caught and nothing changes either: answer `alreadyAcknowledged` with the stored acknowledgement | `UnknownAlarmError`, `StorageUnavailableError` |
| `listUnacknowledged()` | - | `Alarm[]`, most recent first | - | None (FR-ALM-04) | `StorageUnavailableError` |
| `subscribe(listener)` | `(event: AlarmEvent) => void` | Unsubscribe function | - | `listener` called for every later `raised` and `acknowledged` event | - |

`AlarmEvent` is `{ kind: 'raised', alarm, audibleRepeatSeconds }` or `{ kind: 'acknowledged', alarmId, by, at }`. `audibleRepeatSeconds` is 60 for a critical alarm and `null` otherwise (SPEC-ALM-02, NFR-SAF-04): the rule stays in this module, the Dashboard only plays the sound as told (D-27).

### 3.5 Cabinet Health Monitor

**Uses:** Alarm Manager, Historical Data Store, Clock. **Used by:** ADC Communication Manager, Inventory Supervisor, Operator Dashboard.

State, for each registered ADC: label, location (floor, description), registration time, last contact `m_lastContact`, reported state or `⊥`, connectivity (`Reachable`, `Unreachable`, `Offline`). Invariant: the connectivity is the one SPEC-HLT-02 gives for `silence = now − lastContact`, as of the last call to `checkTimeouts`.

| Operation | Inputs | Output | Pre-conditions | Effects | Exceptions |
| --- | --- | --- | --- | --- | --- |
| `register(identity, at)` | `AdcIdentity` (ID, label, floor, description), `Date` | `RegistrationResult`: `{ firstRegistration }` | Identity validated (interface §3.1) | New ADC: stored, last contact = `at`, reported state `⊥` (FR-HLT-06). Known ADC: label and location replaced, re-registration logged, nothing else changed (D-20) (SPEC-COM-01) | `StorageUnavailableError` |
| `isRegistered(adcId)` | `AdcId` | `boolean` | - | None | - |
| `recordHeartbeat(adcId, state, at)` | `AdcId`, `ReportedState`, `Date` | `void` | ADC registered | Last contact = `at`, connectivity `Reachable`; status change recorded if the reported state or the connectivity changed (FR-HIS-03); then `statusChanged` announced (SPEC-HLT-02) | `UnknownAdcError` |
| `checkTimeouts()` | - | `void` | - | For each ADC, with `silence = now − lastContact` (SPEC-HLT-02): `Reachable` ∧ `45 ≤ silence < 75` → `Unreachable`, status change recorded, `statusChanged` announced. Not `Offline` ∧ `silence ≥ 75` → `Offline`, status change recorded, `alarms.raiseCommunicationLoss` called, `statusChanged` announced. Otherwise nothing. The communication loss alarm is raised only when the ADC enters `Offline`, never again while it stays offline. Called every second by a scheduler | `StorageUnavailableError` |
| `getStatus(adcId)` | `AdcId` | `AdcStatus` (displayed status, stale, last contact) | - | None; displayed status from SPEC-HLT-01 | `UnknownAdcError` |
| `listAdcs(filter)` | `AdcListFilter` (status?) | `AdcSummary[]`, sorted by label (FR-DSH-01 to 03) | - | None | - |
| `reachableOnSameFloor(adcId)` | `AdcId` | `AdcRef[]`: the other ADCs of the same floor whose silence is below 45 s (D-23) | - | None | `UnknownAdcError` |
| `subscribe(listener)` | `(event: StatusChangedEvent) => void` | Unsubscribe function | - | `listener` called after every change of the displayed status of an ADC (D-22) | - |

### 3.6 Inventory Supervisor

**Uses:** Cabinet Health Monitor. **Used by:** ADC Communication Manager, Operator Dashboard.

State: for each ADC, its latest inventory and the time of the heartbeat it comes from (FR-INV-01). Every operation throws `StorageUnavailableError` when the storage cannot be used.

| Operation | Inputs | Output | Pre-conditions | Effects | Exceptions |
| --- | --- | --- | --- | --- | --- |
| `replaceInventory(adcId, items, at)` | `AdcId`, `InventoryLine[]`, `Date` | `void` | ADC registered; at most one line per medication (NAT-02) | The inventory of `adcId` becomes exactly `items`, dated `at` (NFR-REL-03) | `StorageUnavailableError` |
| `getInventory(adcId)` | `AdcId` | `AdcInventory \| null` (lines with their low-stock flag, heartbeat time) | - | None (FR-INV-02, SPEC-INV-02); `null` before the first heartbeat | - |
| `listLowStock()` | - | `LowStockFlag[]` (ADC, medication, quantity) | - | None (NFR-USA-01) | - |
| `findSources(adcId, medicationId)` | `AdcId`, `MedicationId` | `StockSources`: `sources(adcs)` \| `noStockAvailable` | `medicationId` is flagged low stock in `adcId` | None (SPEC-INV-01, D-05, D-23) | `UnknownAdcError` |
| `aggregatedQuantity(medicationId)` | `MedicationId` | `number` | - | None; sum over all registered ADCs (FR-INV-06) | - |

### 3.7 ADC Communication Manager

**Uses:** Cabinet Health Monitor, Inventory Supervisor, Alarm Manager, Historical Data Store, Clock. **Used by:** Operator Dashboard (commands and configuration); ADC units through the HTTP routes of the interface contract.

This module is the internal side of the external interface ([interface-adc-monitoring.md](../interface-adc-monitoring.md)), which states what the Monitoring System provides, what it requires from the ADCs and how it behaves when they are unavailable (§7). Its HTTP controller only passes the raw request body to the operations below and writes back the answer they return.

| Operation | Inputs | Output | Pre-conditions | Effects | Exceptions |
| --- | --- | --- | --- | --- | --- |
| `receiveRegistration(payload)` | Raw JSON body | `ProtocolResponse` (HTTP status, body) | - | SPEC-COM-01: invalid → `400`, rejection logged; valid → contact address kept, `cabinetHealth.register`, `200` | - (internal failures become `500 INTERNAL_ERROR`) |
| `receiveHeartbeat(payload)` | Raw JSON body | `ProtocolResponse` | - | SPEC-COM-02: invalid envelope → `400`; unknown ADC → `404`, discard logged; else each transaction handled by SPEC-COM-03 (`alarms.recordFromAdc`, `history.recordDispensing`, rejections logged), then `inventory.replaceInventory`, then `cabinetHealth.recordHeartbeat` last, and only then `200` with one acknowledgement per transaction (FR-REQ-01) | - (`500` and nothing acknowledged on a storage failure; the contact is recorded last, so a heartbeat answered `500` never counts as a contact, FR-COM-03) |
| `answerUnreadableBody()` | - | `ProtocolResponse` | Called by the HTTP exception handler when an ADC request body is not JSON | `400 INVALID_MESSAGE` in the format of the contract | - |
| `sendCommand(actor, adcId, command)` | `Actor`, `AdcId`, `AdcCommand` (`setMaintenanceMode(enabled)`) | `DeliveryOutcome`: `delivered` \| `failed(code, message)` \| `refusedOffline` | `actor` may send commands (D-10, D-31) | SPEC-COM-04 and 05: offline → nothing sent, refusal audited; else sent with a new identifier to the contact address of the ADC, waits at most 10 s for the answer. Two audit entries: one at the sending, one with the outcome, so that a sending without outcome stays visible (NFR-AUD-01, 05). No automatic retry (D-04) | `UnknownAdcError` |
| `sendConfiguration(actor, adcId, settings)` | `Actor`, `AdcId`, `AdcSettings` (time server?, screen lock timeout?) | `DeliveryOutcome` | `actor` may send configuration (D-10, D-31); settings within their rules (interface §4.2) | Same as `sendCommand` | `UnknownAdcError` |

The protocol names (`set_maintenance_mode`, JSON field names, error codes) never leave this module: the other modules see `AdcCommand`, `ReportedState` and `DeliveryOutcome` only. Inside the module, `protocol.ts` holds the message formats (validators of the contract and the SPEC-COM-03 classification of transactions) and `models/` the contact addresses (D-32).

### 3.8 Reporting

**Uses:** Historical Data Store, User Management, Clock. **Used by:** Operator Dashboard.

| Operation | Inputs | Output | Pre-conditions | Effects | Exceptions |
| --- | --- | --- | --- | --- | --- |
| `consumptionReport(actor, params)` | `Actor`, `ConsumptionParams` (range, ADC?, medication?, patient?, staff member?) | `Report` | `actor` may generate this report with these filters (D-14) | Report saved with its parameters and generation time (FR-HIS-06); patient identifiers included only if `users.canSeePatientIds(actor)`, and their display audited (SPEC-USR-02) | `StorageUnavailableError` |
| `alarmReport(actor, range)` | `Actor`, `DateRange` | `Report` | `actor` may generate alarm reports | Report saved (FR-RPT-06) | `StorageUnavailableError` |
| `exportReport(reportId)` | `ReportId` | `ExportFile` (file name, content type, content) | Report is an alarm report | None (FR-RPT-07); file format hidden in this module | `UnknownReportError` |
| `openSavedReport(actor, reportId)` | `Actor`, `ReportId` | `Report`, with its figures at generation time | `actor` may generate reports of that kind | Patient identifiers filtered as above (FR-RPT-08) | `UnknownReportError` |
| `adcHistory(actor, adcId, range)` | `Actor`, `AdcId`, `DateRange` | `AdcHistory` | `actor` may view event history | Patient identifiers filtered and their display audited (FR-HIS-04, D-33) | `StorageUnavailableError` |
| `auditLog(actor, filter)` | `Actor`, `AuditFilter` | `AuditEntry[]` | `actor` may view the audit log | None (FR-HIS-07) | `StorageUnavailableError` |

### 3.9 Operator Dashboard

**Uses:** User Management, Alarm Manager, Cabinet Health Monitor, Inventory Supervisor, ADC Communication Manager, Reporting; not the Historical Data Store, which it reaches through Reporting only (D-33). **Used by:** users, through the browser.

The Dashboard is the top of the USES hierarchy: no module calls it. Its interface is offered to people, not to other modules, and consists of:

| Element | Content | Requirements |
| --- | --- | --- |
| Pages (server-rendered, `app/controllers/` + `resources/views/`) | Login, ADC list (filter, sort), ADC detail (status, inventory, history), alarms, commands and configuration, reports, accounts, audit log | FR-DSH-01 to 03, FR-INV-02, FR-ALM-04, FR-ALM-05, FR-RPT-01 to 08, FR-USR-03 to 05, FR-HIS-04, FR-HIS-07 |
| Live channel (`app/modules/dashboard/live_channel.ts`) | Subscribes to the Alarm Manager and the Cabinet Health Monitor and pushes their events to the open dashboards, with the sound and its repetition | NFR-PRF-01, NFR-SAF-04, NFR-ACC-01, D-22, D-27 |
| Role checks (server side, in the controllers) | Before each call made on behalf of a user, asks `users.can`; on refusal shows the permission message and calls nothing. Nothing is decided in the browser | SPEC-USR-01, D-31 |

Every value is shown with its D-16 text label, never by colour alone (NFR-USA-02, NFR-ACC-02), and every function can be reached with the keyboard (NFR-ACC-03).

## 4. External interface (ADC ↔ Monitoring System)

The external interface is the contract agreed with the Part A sub-team: [interface-adc-monitoring.md](../interface-adc-monitoring.md). It is implemented by the ADC Communication Manager (section 3.7) and nowhere else.

The message formats, error codes and examples are in the contract. This section states the interface from the Monitoring System's side: what it provides to the ADCs, what it requires from them, and how it behaves when they are unavailable. The protocol is the secret of the ADC Communication Manager (AC-02 in the [modular decomposition](modular-decomposition.md)): changing it touches no other module.

### 4.1 Provided by the Monitoring System

| Message (ADC → Monitoring) | Meaning | Answer and timing |
| --- | --- | --- |
| `POST /api/v1/adcs/register` (contract §3.1) | The ADC announces itself: identifier, label, contact address, location | `200` with `firstRegistration` and the heartbeat period (30 s), or `400 INVALID_MESSAGE`. Answered at once; a known identifier is accepted again (D-20) |
| `POST /api/v1/heartbeats` (contract §3.2) | The ADC is alive; it reports its state, its complete inventory and its unacknowledged transactions | `200` with one acknowledgement per transaction (`received` or `rejected` with its reason), sent only once every transaction is stored (FR-REQ-01); `404 ADC_NOT_REGISTERED` from an unknown ADC; `400` for an invalid envelope; `500` if the storage fails, nothing acknowledged |

| Message (Monitoring → ADC) | Meaning | Timing |
| --- | --- | --- |
| `POST {contactAddress}/api/v1/commands` (contract §4.1) | A technician or administrator asks the ADC to enter or leave maintenance mode | On user request only; never to an offline ADC (FR-COM-12) |
| `POST {contactAddress}/api/v1/configuration` (contract §4.2) | An administrator changes the time server or the screen lock timeout | On user request only; never to an offline ADC |

### 4.2 Required from the ADCs

| What the Monitoring System relies on | Used for | Recorded as |
| --- | --- | --- |
| A heartbeat at least every 30 s, and at once on a new alarm or a state change | The 45 s and 75 s rules make sense only if a working ADC is never silent for 45 s | NAT-03 (A-05, A-08) |
| Every transaction kept and resent until it is acknowledged; one heartbeat at a time | No alarm or dispensing activity is lost during an outage | NAT-04 (A-06, A-23, A-24) |
| A transaction resent unchanged, with the same identifier | Duplicates are recognised by their identifier (D-28) | A-26, NAT-05 |
| Identifiers that are UUID v4, the ADC identifier kept across restarts | An ADC that restarts is the same ADC | NAT-05 (A-07, A-21) |
| A clock synchronised with the hospital time server | Alarm times set by the ADC are stored as they are (A-14) | NAT-06 |
| An answer to a command or configuration within 10 s, carrying the message identifier and the ADC identifier | `delivered` only when the right ADC confirms the right message (FR-COM-11) | D-04 |

### 4.3 Behaviour when an ADC is unavailable

The safety functions of the Monitoring System never wait for an ADC: a silent ADC changes what is displayed, it never blocks the rest of the system (NFR-AVL-01, NFR-AVL-02).

| Situation | Behaviour of the Monitoring System | Specified by |
| --- | --- | --- |
| No heartbeat for 45 s | ADC shown `UNREACHABLE`, its status and inventory labelled stale with the time of the last contact; it is no longer proposed as a source of stock | SPEC-HLT-01, SPEC-HLT-02, D-23 |
| No heartbeat for 75 s | ADC shown `OFFLINE`; one communication loss alarm raised; commands and configurations refused | SPEC-HLT-02, SPEC-COM-04 |
| The ADC communicates again | Back to its reported state; the communication loss alarm stays until a user acknowledges it; the transactions kept during the outage are recorded once each | SPEC-HLT-02, FR-HLT-07, SPEC-COM-03 |
| An ADC has registered but never sent a heartbeat | Shown `PENDING`, never as working | SPEC-HLT-01, D-21 |
| No answer to a command within 10 s | `failed`, the sender is told; no automatic retry | SPEC-COM-05, D-04 |
| Heartbeat from an unknown ADC | Discarded and logged; the ADC registers again by itself on `404` | SPEC-COM-02, NFR-SEC-03 |
| The Monitoring System itself is down | Nothing is lost: the ADCs keep their transactions and resend them (contract §7) | NAT-04 |
