# Implementation Notes - Part B (Hospital Monitoring System)

This document says which code implements each module of the [module guide](modular-decomposition.md), and how the D1 models (domain classes, state machines, activity diagrams) are realised in that code. The interfaces themselves (exported operations, pre-conditions, effects, exceptions) are not repeated: they are in [modular-design-and-interfaces.md](modular-design-and-interfaces.md), section 3, and in the doc comment of each operation. The requirement-by-requirement mapping to the code is in the traceability table.

All paths are relative to `monitoring/`.

## 1. Technology and code organisation

| Concern | Choice |
| --- | --- |
| Language and framework | TypeScript on Node.js 24, AdonisJS 7 (server-side web framework with a dependency-injection container) |
| Pages | Server-rendered Edge templates (`resources/views/`), made live in the browser with Alpine.js (`resources/js/app.js`) |
| Live updates | Server-Sent Events through Transmit (D-27) |
| Storage | SQLite through the Lucid data layer (D-39); schema in `database/migrations/` |
| ADC protocol | JSON over HTTP, as in the [interface contract](../interface-adc-monitoring.md); messages validated with VineJS |
| Tests | Japa: unit tests per module (`tests/unit/<module>/`), functional tests through HTTP (`tests/functional/`) |

The code follows the module guide one to one, so that the boundaries are easy to find:

- **One folder per leaf module** in `app/modules/<module>/`. Each one has a single service class, `<module>_service.ts`. Its public methods are the exported operations of the module, and their doc comments carry the pre-conditions, effects and exceptions of the interface. The folder also has `types.ts` (exported types), `errors.ts` (exceptions) and, for a module that stores data, a private `models/` folder of Lucid models that no other module imports.
- **`app/modules/shared/`** holds the vocabulary used to write the interfaces: identifiers, `Actor`, `Role`, `DateRange`, severities, states and `StorageUnavailableError`. It is not a module: it has no state, no behaviour and no secret.
- **Modules are wired by the container.** A service receives the services it uses in its constructor (`@inject()`). The constructor parameters of a service are therefore exactly its "Uses" line in the USES hierarchy, and a test can swap any of them (section 7).
- **Controllers only adapt HTTP**: they read the request, call module services, and turn the result into a page or a JSON answer. They hold no rule of the specification.
- **`start/`** holds what runs at start-up: routes (`routes.ts`), the periodic calls (`scheduler.ts`), the start of the live channel (`live_channel.ts`) and the record of the server's start-ups and shutdowns (`lifecycle.ts`, NFR-AVL-05).

## 2. Modules → code

Paths are relative to `app/modules/<module>/` unless they start with `app/`, `start/`, `resources/`, `database/` or `tests/`.

| Module | Code | Tests |
| --- | --- | --- |
| 1.1.1 Clock | **Service**: `ClockService`<br>**Simulated**: `ManualClock` (`tests/helpers/manual_clock.ts`) | Used by every other test |
| 1.1.2 ADC Communication Manager | **Service**: `AdcCommunicationService`<br>**Storage**: `models/adc_contact.ts`<br>**Also**: `protocol.ts` (message validators, encoding of commands, reading of answers); `app/controllers/adc_protocol_controller.ts` (the two `/api/v1` routes) | `tests/functional/adc_protocol.spec.ts`, `adc_commands.spec.ts` |
| 1.1.3 Operator Dashboard | **Service**: `LiveChannel` (`live_channel.ts`)<br>**Also**: `presentation.ts` (labels, wording, time format); `app/controllers/` except the ADC protocol controller; `app/middleware/actor_middleware.ts`, `can_middleware.ts`; `resources/views/`; `resources/js/app.js` (live updates and sound in the browser); `start/live_channel.ts` | `tests/unit/dashboard/`, `tests/functional/dashboard.spec.ts` and the other page tests |
| 1.2.1 Cabinet Health Monitor | **Service**: `CabinetHealthService`<br>**Storage**: `models/adc.ts` | `tests/unit/cabinet_health/` |
| 1.2.2 Alarm Manager | **Service**: `AlarmService`<br>**Storage**: none, its alarms are kept by the Historical Data Store | `tests/unit/alarms/` |
| 1.2.3 Inventory Supervisor | **Service**: `InventoryService`<br>**Storage**: `models/inventory_snapshot.ts`, `inventory_line.ts` | `tests/unit/inventory/` |
| 1.2.4 User Management | **Service**: `UserService`<br>**Storage**: `app/models/user.ts` (the account, also used by the framework's login)<br>**Also**: `database/seeders/` (demonstration accounts) | `tests/unit/users/`, `tests/functional/accounts.spec.ts` |
| 1.2.5 Reporting | **Service**: `ReportingService`<br>**Storage**: none, saved reports are kept by the Historical Data Store | `tests/unit/reporting/`, `tests/functional/reports_pages.spec.ts` |
| 1.3.1 Historical Data Store | **Service**: `HistoryService`<br>**Storage**: `models/alarm.ts`, `alarm_acknowledgement.ts`, `dispensing_activity.ts`, `status_change.ts`, `audit_entry.ts`, `system_log_entry.ts`, `saved_report.ts` | `tests/unit/history/` |

Remarks on the mapping:

- **Modules are not classes.** Seven modules are one service class plus private models. The Operator Dashboard is spread over controllers, middleware, templates, a browser script and `LiveChannel`: its secret (how information reaches the user) is in all of them, and none of them is used by another module. The Clock is a one-method class.
- **The ADC Communication Manager has two entry points**: the HTTP routes, for what the ADCs send (`receiveRegistration`, `receiveHeartbeat`), and the Dashboard, for what the operators send (`sendCommand`, `sendConfiguration`). `protocol.ts` is the only file that knows the JSON of the contract; replacing HTTP by a broker (AC-02) changes this file, the controller and the `post` method of the service.
- **Periodic operations are called from outside the modules.** `start/scheduler.ts` calls `CabinetHealthService.checkTimeouts()` every second and `HistoryService.purgeExpired()` at start-up then every 24 h. The scheduler is only loaded by the web server, so tests decide when time passes (section 7). In the same way, `start/lifecycle.ts` writes `system_start_up` to the system log when the server is ready and `system_shutdown` when it stops gracefully (SIGTERM, or Ctrl+C: `bin/server.ts`), through `HistoryService.appendSystemLog()`.
- **Permission checks** (D-31) are done once, before any module is called. `actor_middleware.ts` builds the `Actor` of the request (user and role read at login). `can_middleware.ts` asks `UserService.can(actor, fn)` for the function of the route (`start/routes.ts`) and shows the permission message when it is refused. The permission matrix itself is the `PERMISSIONS` table of `users_service.ts` (AC-07).

## 3. D1 domain model → code

The D1 class model describes the vocabulary of the hospital, not the design. Its classes are found in the code as follows; most of them are split over several modules, each module keeping the attributes that belong to its secret.

| D1 class | Where it is kept | Notes |
| --- | --- | --- |
| `User`, `UserRole` | `app/models/user.ts` (User Management); `Role` in `shared/types.ts` | The list of roles is fixed (UC-04); what each role may do is the `PERMISSIONS` table |
| `ADC` | `cabinet_health/models/adc.ts`: label, floor, description, registration time, `reportedState`, `connectivity`, `lastContact` | `contactAddress` is **not** there: it is kept by the ADC Communication Manager in `adc_communication/models/adc_contact.ts` (D-32), because only that module may know how an ADC is reached (AC-02) |
| `ADC.isStale` «derived» | computed by `toStatus()` in `cabinet_health_service.ts` (`stale = connectivity ≠ reachable`) | Never stored |
| `OperationalState`, `ConnectivityStatus` | `ReportedState`, `Connectivity` in `shared/types.ts` | Lower-case values; the displayed labels (ONLINE, OFFLINE, ...) are computed by `displayedStatus()` |
| `StatusChange` | `history/models/status_change.ts` | Written by the Cabinet Health Monitor through `history.recordStatusChange()` |
| `Medication`, `InventoryItem` | `inventory/models/inventory_line.ts` (one line per medication and ADC) and `inventory_snapshot.ts` (time of the heartbeat that brought the inventory) | A medication has no table of its own: the system only knows the medications that ADCs report |
| `Alarm` | `history/models/alarm.ts` | Kept by the Historical Data Store; the Alarm Manager owns the rules, not the storage. The communication loss alarm has `source = 'communication_loss'` |
| Acknowledgement of an alarm | `history/models/alarm_acknowledgement.ts` | There is no "acknowledged" column: an alarm is acknowledged when it has an acknowledgement row, which the database allows only once (unique key) |
| `DispensingActivity` | `history/models/dispensing_activity.ts` | Stored by the ADC Communication Manager through `history.recordDispensing()` |
| `AuditLogEntry`, system log | `history/models/audit_entry.ts`, `system_log_entry.ts` | Append-only: the Historical Data Store exports no update or delete operation, except the retention purge |
| `Report` | `history/models/saved_report.ts` | Built by Reporting, saved with all its figures and filtered for each viewer when shown (D-42) |

Three modules have no D1 class at all: the Clock, the Operator Dashboard and the ADC Communication Manager. They are hardware hiding modules: they hide devices, which the domain model does not describe.

## 4. D1 state machines → code

### 4.1 Cabinet Health and Connectivity

The machine is kept by the Cabinet Health Monitor, one row of `adcs` per registered ADC. Each region of the D1 diagram is one column, and each kind of event is one operation.

| D1 element | Code |
| --- | --- |
| Registration choice: `[request invalid]` → back to *Unregistered* | `AdcCommunicationService.receiveRegistration()`: the validator of `protocol.ts` fails → `registration_rejected` written to the system log, answer 400 |
| Registration choice: `[request valid]` → *Monitored* | `CabinetHealthService.register()`: row created with `connectivity = 'reachable'`, `reportedState = null`, `lastContact` = registration time (FR-HLT-06); first status change recorded (D-40) |
| Re-registration (no transition) | `register()` on a known ADC: label and location replaced, `re_registration` logged; `receiveRegistration()` replaces the contact address in `adc_contacts` |
| Region *Connectivity* | Column `connectivity` (`reachable`, `unreachable`, `offline`) |
| Region *Reported operational state* | Column `reportedState` (`null` for *NotReported*, then `online`, `maintenance`, `fault`) |
| Event *heartbeat* (all heartbeat transitions of both regions) | `CabinetHealthService.recordHeartbeat(adcId, state, at)`, called last by `receiveHeartbeat()`: `lastContact = at`, `connectivity = 'reachable'`, `reportedState = state`; a status change is recorded when either region changed |
| `when(silence ≥ 45 s)`, `when(silence ≥ 75 s)` | `CabinetHealthService.checkTimeouts()`, called every second by `start/scheduler.ts`. It computes `silence = clock.now() − lastContact`, puts it in a band (`recent`, `pastUnreachableDelay`, `pastOfflineDelay`) and reads the target state in the transition table `ON_SILENCE[connectivity][band]` |
| Actions of the timed transitions | `moveTo()`: on the way to *Offline*, `alarms.raiseCommunicationLoss()` first (D-38), then the new connectivity is saved, the status change recorded and announced |
| *Unregistered*: `heartbeat / discard and log` | `receiveHeartbeat()` checks `isRegistered()` before anything else: `heartbeat_discarded` logged, answer 404, no transition |
| Displayed status (D-02, NFR-SAF-03) | `displayedStatus()`: OFFLINE or UNREACHABLE from the connectivity first, otherwise PENDING for *NotReported* (D-21), otherwise the reported state |

The table `ON_SILENCE` (`cabinet_health_service.ts`) is the timed part of the machine written as a tabular expression: one row per current connectivity, one column per silence band, the next connectivity in each cell (`null`: no transition).

| Current connectivity | silence < 45 s | 45 s ≤ silence < 75 s | silence ≥ 75 s |
| --- | --- | --- | --- |
| reachable | - | unreachable | offline |
| unreachable | - | - | offline |
| offline | - | - | - |

Since the time is only read through `checkTimeouts()`, a timed transition is taken at most one second after its deadline. A flag in the scheduler skips a check while the previous one still runs, so that two checks never raise two alarms for the same loss of communication.

### 4.2 Alarm Lifecycle

The alarm lifecycle is split between the Alarm Manager, which owns the rules, and the Historical Data Store, which keeps the alarms.

| D1 element | Code |
| --- | --- |
| Creation from a valid alarm transaction (`[*]` → *Unacknowledged*) | `receiveHeartbeat()` → `handleTransaction()` → `AlarmService.recordFromAdc()` |
| Creation of a communication loss alarm (`[*]` → *Unacknowledged*) | `CabinetHealthService.moveTo()` → `AlarmService.raiseCommunicationLoss()`: type `communication_loss`, severity `error`, time from the Clock |
| Transaction incomplete or with an unknown severity: no alarm is created (activity 2) | `readTransaction()` in `protocol.ts` returns `rejected` with a reason; `handleTransaction()` writes `transaction_rejected` to the system log and acknowledges the transaction as `rejected`. A rejected alarm is never given to the Alarm Manager: it only exists as a system log entry |
| Transaction already received: no alarm is created (activity 2) | `HistoryService.recordAlarm()` answers `duplicate` (D-28); `handleTransaction()` acknowledges it as `received` anyway |
| *Unacknowledged* | An `alarms` row without an `alarm_acknowledgements` row |
| `entry / display within 2 s` | `AlarmService.record()` announces a `raised` event once the alarm is stored; `LiveChannel` pushes it on the `alarms` channel; `resources/js/app.js` (`onAlarm`) adds it to the list, flashes the page, plays a sound and writes a text announcement |
| `do / repeat the audible cue every 60 s if critical` | The Alarm Manager decides the period (`audibleRepeatSeconds()`: 60 for `critical`, `null` otherwise) and sends it with the event and with `listUnacknowledged()`; the browser only repeats what it receives (`startCue`), so a dashboard opened later repeats it too |
| *Unacknowledged*: internal transition `acknowledge request [role not permitted]` | `can_middleware.ts` refuses before the Alarm Manager is called (D-31): 403 and the permission page |
| *Unacknowledged* → *Acknowledged* | `AlarmService.acknowledge()`: `history.recordAcknowledgement()` stores the user and the time, then the audit entry is written and an `acknowledged` event announced; the browser stops the cue (`stopCue`) |
| *Acknowledged*: internal transition `acknowledge request / refuse` | `acknowledge()` returns `{ kind: 'alreadyAcknowledged', by, at }`; `AlarmsController` shows who acknowledged it and when. The same result is returned when two acknowledgements race: the unique key makes the second insertion fail with `AlarmAlreadyAcknowledgedError`, which `acknowledge()` turns into this result |
| No transition when the ADC communicates again (note of the diagram) | `recordHeartbeat()` never touches alarms (FR-HLT-07) |
| `when(age ≥ 1 year) / purge` | `HistoryService.purgeExpired()`, called by the scheduler: alarms older than one year are deleted with their acknowledgements, in one transaction |

## 5. D1 activity diagrams → code

Each scenario of D1 is one request (or one periodic call) that goes down the USES hierarchy. The functional tests in `tests/functional/` replay them through HTTP.

### 5.1 Inventory monitoring (scenario 1)

1. `GET /adcs/:id` → `AdcsController.show()`, behind `can('viewAdcStatuses')`.
2. Status and stale label: `cabinetHealth.listAdcs()` (`stale` and last contact come from `toStatus()`).
3. Inventory with low-stock flags: `inventory.getInventory()` (flag when fewer than `LOW_STOCK_BELOW = 10` boxes); only for roles with `viewAdcInventory`.
4. For each flagged medication, for pharmacists (`viewStockSources`): `inventory.findSources()` asks `cabinetHealth.reachableOnSameFloor()` for the candidates (D-23), keeps those holding more than 10 boxes, and returns `sources` or `noStockAvailable` (FR-INV-05). `inventory.aggregatedQuantity()` gives the total over all ADCs (FR-INV-06).
5. The "Low Stock" flags of every ADC are also on the main view: `DashboardController.index()` → `inventory.listLowStock()` (NFR-USA-01).

### 5.2 Alarm reception and acknowledgement (scenario 2)

1. `POST /api/v1/heartbeats` → `AdcProtocolController.heartbeat()` → `AdcCommunicationService.receiveHeartbeat()`.
2. Registered? → `cabinetHealth.isRegistered()`; otherwise discarded and logged, 404.
3. For each transaction, `handleTransaction()`: rejected (logged), duplicate or recorded (`alarms.recordFromAdc()` → `history.recordAlarm()`).
4. Then `inventory.replaceInventory()` and `cabinetHealth.recordHeartbeat()`, and only then the answer 200 with one acknowledgement per transaction (FR-REQ-01). If storage fails on the way, the answer is 500 and nothing is acknowledged; the ADC sends the transactions again and the ones already stored are found as duplicates.
5. Display: `AlarmService` announces → `LiveChannel` adds the label of the ADC and broadcasts on `alarms`, to the browsers whose role may see alarms → `app.js` `onAlarm()`.
6. Acknowledgement: `POST /alarms/:id/acknowledge`, behind `can('acknowledgeAlarm')` → `AlarmsController.acknowledge()` → `alarms.acknowledge()` (section 4.2).

### 5.3 ADC communication failure (scenario 3)

1. Every second, `start/scheduler.ts` → `cabinetHealth.checkTimeouts()`.
2. 45 s of silence: `moveTo('unreachable')` → status change recorded and announced on `adcs`; the dashboard shows UNREACHABLE and the stale label (`app.js` `onStatus()`).
3. 75 s of silence: `moveTo('offline')` → `alarms.raiseCommunicationLoss()`, then status change recorded and announced. The alarm reaches the dashboard through the same path as in 5.2.
4. Next heartbeat: `recordHeartbeat()` brings the connectivity back to `reachable` and stores the inventory and transactions sent with it; the communication loss alarm stays unacknowledged.

### 5.4 Historical review (scenario 4)

1. `GET /adcs/:id/history?from=…&to=…`, behind `can('viewAdcHistory')` → `HistoryController.adc()`.
2. Date range check: `toRange()`; an end before the start gives the "invalid date range" message.
3. `reporting.adcHistory(actor, adcId, range)` → `history.queryAdcHistory()` (dispensing, status changes, alarms, acknowledgements). A range without any event shows "No data found for this period." (`resources/views/pages/history/adc.edge`).
4. Patient identifiers: `users.canSeePatientIds(actor)` (pharmacists and administrators); otherwise they are removed (`withoutPatientId`); when they are shown, their display is audited (NFR-AUD-06). The history is read through Reporting so that this rule stays in one module (D-33).
5. Read-only: the page has no edit control, and the Historical Data Store exports no operation that modifies or deletes an entry.

## 6. Differences from the D1 models

Writing the code against the D1 diagrams showed a few places where the code does not follow them step by step. None of them changes a D1 requirement. Each one is either a refinement already stated in the D2 specification, or an order of steps that the diagrams did not fix and that the code had to choose. Apart from the notation corrections made after the D1 feedback (introduction, section 3.4; Appendix C), the D1 diagrams were left as they were; the specification and the safety-critical specifications describe the behaviour of the code.

| D1 element | What the code does | Why |
| --- | --- | --- |
| State machine 1, *Connectivity*: *Reachable* → *Offline* | An ADC can go from `reachable` directly to `offline` (third column of `ON_SILENCE`, section 4.1). This transition was added to the D1 diagram after the D1 feedback. | If a check is missed, for example while the server restarts, the silence of an ADC can jump past 75 s in one step. Going through *Unreachable* first would delay the communication loss alarm by one second for no benefit. Specified in safety-critical specifications, section 2. |
| State machine 1, `when(silence ≥ 45 s)`, `when(silence ≥ 75 s)` | The timed transitions are found by a check every second (`checkTimeouts()`), not by one timer per ADC. A transition is at most one second late. | The connectivity is then a function of the time of last contact, which survives a restart; timers in memory would not. The 1 s delay is part of the invariant INV-HLT-1. |
| State machine 1, *Reported operational state* | Before its first heartbeat, an ADC (*NotReported*) is shown PENDING. | D1 did not say what to show in *NotReported*; every other label would be false (D-21). |
| State machine 1 and activity 3, *Unreachable* → *Offline* / "record status change, raise communication loss alarm" | The alarm is stored first, then the connectivity becomes `offline` and the status change is recorded. | If storage fails between both steps, the next check finds the ADC still not offline and tries again. The worst case is then a second alarm, never an offline ADC without an alarm (D-38). |
| Activity 2: "Transaction identifier already received?" before "ADC, timestamp, type and severity present?" | The content of a transaction is checked first (`readTransaction()`); the duplicate is found afterwards, when the Historical Data Store records it. | The module that stores transactions is the only one that knows which identifiers it holds (D-28). A transaction sent again is identical to the first sending (A-26), so it passes the checks again and gets the same acknowledgement as in D1. |
| Activity 2: "Acknowledge as 'received'", then "Display the alarm" | The alarm is announced to the dashboards as soon as it is stored, before the answer to the heartbeat is sent. | The answer is only sent once the whole heartbeat is stored (every transaction, the inventory, the time of contact). Waiting for it would only delay the alarm on screen; the 2 s bound of NFR-PRF-01 starts at reception. |
| Activity 2 (not in D1) | If the storage fails while a heartbeat is handled, the answer is `500` and no transaction is acknowledged. | The ADC keeps its transactions and sends them again 30 s later (A-23); those already stored are then found as duplicates. Nothing acknowledged can be lost (NFR-REL-01). |
| Activity 1: "Search the other ADCs of the same floor holding more than 10 boxes" | Only ADCs of the same floor that are reachable are searched. | The stock of an unreachable or offline ADC is stale: proposing it could send a nurse to an empty or broken cabinet (D-23). |
| Activity 1: "updated less than 45 s ago?" | The stale label is shown while the ADC is not `reachable`, so at most one second after the 45 s. | One rule for the status and the inventory: both come from the same heartbeat, and the connectivity already tracks the 45 s (NFR-SAF-01, SPEC-HLT-01). |
| Activity 2 and 4, role decisions | A request whose role is not permitted is refused before any module is called (`can_middleware.ts`). The history is read through Reporting, which hides patient identifiers. | Permissions are checked once, on the server, from the only copy of the matrix (D-31); patient identifiers are filtered in a single module (D-33). |

## 7. Testing and demonstration

- **Bottom-up, following the USES hierarchy.** A module is unit-tested with the real modules below it. `tests/helpers/fake_modules.ts` gives simulated versions (for example `FakeCabinetHealth`) to test a module alone, for instance the ADC Communication Manager without the Cabinet Health Monitor.
- **Time is controlled in tests.** The tests swap `ClockService` for `ManualClock` (`app.container.swap`) and call `checkTimeouts()` themselves, since the scheduler is not loaded in tests: moving the clock by 45 s then 75 s checks the transitions of section 4.1 at their exact boundaries without waiting (`tests/unit/cabinet_health/`, `tests/functional/communication_loss.spec.ts`).
- **Each test runs in a database transaction** that is rolled back afterwards; the test database is migrated at the start of `npm test`.
- **ADC simulator.** `node ace adc:simulate` (`commands/adc_simulate.ts`, `simulator/fake_adc.ts`) starts fake ADCs that only speak the JSON of the contract: they register, send heartbeats every 30 s, answer commands, and, from a menu, raise alarms, dispense boxes, change state, stop their heartbeats or answer commands badly. The functional tests use the same `FakeAdc` class. In the demonstration the real clock is used: stopping the heartbeats of a simulated ADC shows UNREACHABLE after 45 s and OFFLINE with its alarm after 75 s.
