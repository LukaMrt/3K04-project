# Modular Design and Interfaces - Part B (Hospital Monitoring System)

## 1. Modules

The system is decomposed into nine modules. Seven of them are the components of the D1 high-level architecture; the Operator Dashboard, a D1 component too, becomes the user interface module; the Clock is new (D-29). Each module hides one secret, the design decision most likely to change behind it.

| Module | Code | Responsibility | Secret |
| --- | --- | --- | --- |
| Clock | `app/modules/clock/` | Give the current time | Where the time comes from (system clock, or a clock controlled by tests and demonstrations) |
| Historical Data Store | `app/modules/history/` | Keep every record the system must retain, append-only, and answer queries over them | Storage technology and layout, retention mechanism |
| User Management | `app/modules/users/` | Manage accounts and roles, decide permissions | The role → permission matrix (D-14) and the account storage |
| Alarm Manager | `app/modules/alarms/` | Record alarms, keep their acknowledgement state, announce them | Alarm lifecycle and presentation rules (repetition of the critical cue) |
| Cabinet Health Monitor | `app/modules/cabinet_health/` | Keep the registry of ADCs, their reported state and their connectivity | The connectivity state machine and its timeouts (45 s, 75 s) |
| Inventory Supervisor | `app/modules/inventory/` | Keep the latest inventory of each ADC, flag low stock, find sources | The low-stock threshold and the source search rule |
| ADC Communication Manager | `app/modules/adc_communication/` | Speak the ADC ↔ Monitoring protocol in both directions | Message formats, transport, ADC contact addresses (D-32) |
| Reporting | `app/modules/reporting/` | Build, save and export reports; give users the event history and the audit log | Report layouts and export formats, patient identifier filtering (D-33) |
| Operator Dashboard | `app/modules/dashboard/`, `app/controllers/`, `resources/views/` | Show everything to users and receive their requests | Page layout and wording, delivery technology to the browser (D-27) |

> The anticipated changes behind each secret, the classification of the modules (hardware hiding, behaviour hiding, software decision hiding) and the USES hierarchy diagram are given in the modular decomposition (issue #32). The USES list of each module below is the source of that diagram.

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
