# Traceability - Part B (Hospital Monitoring System)

This table carries the D1 traceability forward: each requirement of D1 goes to its user story, its precise specification, the module that implements it and the code. It lists every D1 requirement (D1 identifiers unchanged).

How to read it:

- **Precise specification**: the items of the [precise specification](precise-specification.md) (`SPEC-…`) that refine the requirement. ★ marks the safety-critical functions, specified with pre-conditions, post-conditions and invariants in the [safety-critical specifications](safety-critical-specifications.md) (§ = section of that document). *As stated* means that the D1 statement is already precise enough to be implemented and tested; *N/A* marks a quality target verified by measurement, not by a relation between monitored and controlled variables.
- **Module**: the module that decides the behaviour. When other modules only carry out its consequence through their interface, they are not listed (precise specification, section 5, "Requirements that involve several modules"). Several requirements may trace to the same module.
- **Code**: the class and operation that implement the requirement. Each module's service class is in `monitoring/app/modules/<module>/<module>_service.ts` (`CabinetHealthService` in `cabinet_health/`, `AdcCommunicationService` in `adc_communication/`, ...); the [implementation notes](implementation-notes.md), section 2, give the full list. Other files are given with their path from `monitoring/`.

## ADC Communication Management (COM)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-COM-01 | Register an ADC | US-COM-01 | SPEC-COM-01, SPEC-HLT-02 | ADC Communication Manager | `AdcCommunicationService.receiveRegistration()`, `registrationValidator` (`adc_communication/protocol.ts`); `CabinetHealthService.register()` |
| FR-COM-02 | Accept re-registration of a known ADC identifier | US-COM-01 | SPEC-COM-01 | ADC Communication Manager | `AdcCommunicationService.receiveRegistration()` (contact address replaced); `CabinetHealthService.register()` (label and location replaced, `re_registration` logged) |
| FR-COM-03 | Record heartbeat reception time | US-HLT-01 | SPEC-COM-02 | ADC Communication Manager | `AdcCommunicationService.receiveHeartbeat()` → `CabinetHealthService.recordHeartbeat()` (`lastContact`) |
| FR-COM-04 | Send a command to an ADC | US-COM-02 | SPEC-COM-04 ★ §5 | ADC Communication Manager | `AdcCommunicationService.sendCommand()`, `commandMessage()` (`protocol.ts`); page: `AdcsController.maintenance()` |
| FR-COM-05 | Send configuration to an ADC | US-COM-03 | SPEC-COM-04 ★ §5 | ADC Communication Manager | `AdcCommunicationService.sendConfiguration()`, `configurationMessage()` (`protocol.ts`); page: `AdcsController.configure()` |
| FR-COM-06 | Mark unacknowledged command/configuration as failed (10 s) | US-COM-02, US-COM-03 | SPEC-COM-05 ★ §5 | ADC Communication Manager | `AdcCommunicationService.deliver()`, `post()` (`ADC_ANSWER_TIMEOUT_MS` in `protocol.ts`); outcome shown by `AdcsController.flashOutcome()` |
| FR-COM-07 | Heartbeat carries status, inventory, pending transactions | US-REQ-01, US-HLT-03 | SPEC-COM-02 | ADC Communication Manager | `heartbeatValidator` (`protocol.ts`), `AdcCommunicationService.receiveHeartbeat()` |
| FR-COM-08 | Do not record duplicate transactions again | US-REQ-01 | SPEC-COM-03 ★ §3 | Historical Data Store (D-28) | `HistoryService.recordAlarm()`, `recordDispensing()` (answer `duplicate`) |
| FR-COM-09 | Content of a dispensing activity | US-REQ-01 | As stated | ADC Communication Manager | `readTransaction()` (`protocol.ts`); stored by `HistoryService.recordDispensing()` |
| FR-COM-10 | Reject incomplete dispensing activity | US-REQ-01 | SPEC-COM-03 | ADC Communication Manager | `readTransaction()` (`protocol.ts`), `AdcCommunicationService.handleTransaction()` (`transaction_rejected` logged) |
| FR-COM-11 | Delivered only if ack carries command and ADC IDs | US-COM-02 | SPEC-COM-05 ★ §5 | ADC Communication Manager | `readDeliveryAnswer()` (`protocol.ts`) |
| FR-COM-12 | Refuse sending to an offline ADC | US-COM-03 | SPEC-COM-04 ★ §5 | ADC Communication Manager | `AdcCommunicationService.deliver()` (result `refusedOffline`) |

## Inventory Supervision (INV)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-INV-01 | Store inventory from each heartbeat | US-INV-01, US-HLT-03 | SPEC-COM-02 | Inventory Supervisor | `InventoryService.replaceInventory()`, called by `AdcCommunicationService.receiveHeartbeat()` |
| FR-INV-02 | Display a cabinet's inventory | US-INV-01 | SPEC-INV-02 ★ §6 | Inventory Supervisor | `InventoryService.getInventory()`; page: `AdcsController.show()`, `resources/views/pages/adcs/show.edge` |
| FR-INV-03 | Flag low stock below 10 boxes | US-INV-02 | SPEC-INV-01 | Inventory Supervisor | `InventoryService.getInventory()`, `listLowStock()` (`LOW_STOCK_BELOW`) |
| FR-INV-04 | List same-floor ADCs with stock | US-INV-03 | SPEC-INV-01 ★ §6 | Inventory Supervisor | `InventoryService.findSources()`, with `CabinetHealthService.reachableOnSameFloor()` |
| FR-INV-05 | "No stock available" message | US-INV-03 | SPEC-INV-01 | Inventory Supervisor | `InventoryService.findSources()` (result `noStockAvailable`); `resources/views/pages/adcs/show.edge` |
| FR-INV-06 | Aggregated stock across ADCs | US-INV-04 | SPEC-INV-02 | Inventory Supervisor | `InventoryService.aggregatedQuantity()` |

## Alarm Management (ALM)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-ALM-01 | Record received alarms | US-ALM-01 | SPEC-COM-03 ★ §3 | Alarm Manager | `AlarmService.recordFromAdc()` → `HistoryService.recordAlarm()` |
| FR-ALM-02 | Reject incomplete alarm transactions | US-ALM-01 | SPEC-COM-03 ★ §3 | ADC Communication Manager | `readTransaction()` (`protocol.ts`), `AdcCommunicationService.handleTransaction()` |
| FR-ALM-03 | Reject unknown severity | US-ALM-01 | SPEC-COM-03 ★ §3 | ADC Communication Manager | `readTransaction()` (`protocol.ts`), `AdcCommunicationService.handleTransaction()` |
| FR-ALM-04 | Display unacknowledged alarms | US-ALM-01 | SPEC-ALM-02 ★ §3 | Alarm Manager | `AlarmService.listUnacknowledged()`, `subscribe()`; display: `DashboardController.index()`, `LiveChannel`, `onAlarm()` in `resources/js/app.js` |
| FR-ALM-05 | Acknowledge an alarm | US-ALM-02 | SPEC-ALM-01 ★ §4 | Alarm Manager | `AlarmService.acknowledge()`; page: `AlarmsController.acknowledge()` |
| FR-ALM-06 | Reject re-acknowledgement | US-ALM-02 | SPEC-ALM-01 ★ §4 | Alarm Manager | `AlarmService.acknowledge()` (result `alreadyAcknowledged`) |

## Historical Data Management (HIS)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-HIS-01 | Retain alarms 1 year | US-HIS-02 | SPEC-HIS-01 | Historical Data Store | `HistoryService.recordAlarm()`, `purgeExpired()` (`LONG_RETENTION`) |
| FR-HIS-02 | Retain dispensing activity 6 months | US-HIS-01 | SPEC-HIS-01 | Historical Data Store | `HistoryService.recordDispensing()`, `purgeExpired()` (`SHORT_RETENTION`) |
| FR-HIS-03 | Retain status changes 6 months | US-HIS-01 | SPEC-HIS-01, SPEC-HLT-02 | Historical Data Store | `HistoryService.recordStatusChange()` (called by `CabinetHealthService`), `purgeExpired()` |
| FR-HIS-04 | Display ADC event history | US-HIS-01 | As stated | Reporting (D-33) | `ReportingService.adcHistory()` → `HistoryService.queryAdcHistory()`; page: `HistoryController.adc()`, `resources/views/pages/history/adc.edge` |
| FR-HIS-05 | Retain audit log 1 year | US-HIS-02 | SPEC-HIS-01 | Historical Data Store | `HistoryService.appendAudit()`, `purgeExpired()` |
| FR-HIS-06 | Retain generated reports 1 year | US-RPT-07 | SPEC-HIS-01 | Historical Data Store | `HistoryService.saveReport()`, `purgeExpired()` |
| FR-HIS-07 | Display the audit log | US-HIS-02 | As stated | Reporting (D-33) | `ReportingService.auditLog()` → `HistoryService.queryAudit()`; page: `HistoryController.audit()` |
| FR-HIS-08 | Retain system log entries 1 year | - | SPEC-HIS-01 (logged entries: SPEC-COM-01 to 03) | Historical Data Store | `HistoryService.appendSystemLog()`, `purgeExpired()` |
| FR-HIS-09 | Delete data after its retention period | - | SPEC-HIS-01 | Historical Data Store | `HistoryService.purgeExpired()`, called at start-up then every 24 h by `start/scheduler.ts` |

## Reporting (RPT)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-RPT-01 | Consumption report over a period | US-RPT-01 | As stated | Reporting | `ReportingService.consumptionReport()`; page: `ReportsController.consumption()` |
| FR-RPT-02 | Filter consumption report by ADC | US-RPT-02 | As stated | Reporting | `ReportingService.consumptionReport()` (filter `adcId`) |
| FR-RPT-03 | Filter consumption report by medication | US-RPT-03 | As stated | Reporting | `ReportingService.consumptionReport()` (filter `medicationId`) |
| FR-RPT-04 | Filter consumption report by patient | US-RPT-04 | As stated | Reporting | `ReportingService.consumptionReport()` (filter `patientId`) |
| FR-RPT-05 | Filter consumption report by staff member | US-RPT-05 | As stated | Reporting | `ReportingService.consumptionReport()` (filter `staffMemberId`); role checked by `ReportsController.consumption()` (`consumptionReportByStaff`) |
| FR-RPT-06 | Display alarm report | US-RPT-06 | As stated | Reporting | `ReportingService.alarmReport()`; page: `ReportsController.alarms()` |
| FR-RPT-07 | Export alarm report | US-RPT-06 | As stated | Reporting | `ReportingService.exportReport()` (CSV file); page: `ReportsController.export()` |
| FR-RPT-08 | Reopen a generated report | US-RPT-07 | As stated | Reporting | `ReportingService.openSavedReport()`, `listSavedReports()`; stored by `HistoryService.saveReport()` |

## Operator Dashboard (DSH)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-DSH-01 | Display each ADC's status | US-HLT-01, US-DSH-01 | SPEC-HLT-01 ★ §6 | Cabinet Health Monitor | `CabinetHealthService.listAdcs()`; display: `DashboardController.index()`, `LiveChannel` (channel `adcs`) |
| FR-DSH-02 | Filter ADC list by status | US-DSH-02 | As stated | Cabinet Health Monitor | `CabinetHealthService.listAdcs({ status })`; `DashboardController.index()` (`?status=`) |
| FR-DSH-03 | Sort ADC list by label | US-DSH-02 | As stated | Cabinet Health Monitor | `CabinetHealthService.listAdcs()` (sorted by label) |

## Cabinet Health Monitoring (HLT)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-HLT-01 | Display reported operational state | US-HLT-01 | SPEC-HLT-01 ★ §6 | Cabinet Health Monitor | `CabinetHealthService.getStatus()`, `listAdcs()` (`displayedStatus()`) |
| FR-HLT-02 | Mark unreachable after 45 s | US-HLT-02 | SPEC-HLT-01, SPEC-HLT-02 ★ §2 | Cabinet Health Monitor | `CabinetHealthService.checkTimeouts()` (`ON_SILENCE`, `moveTo()`), called every second by `start/scheduler.ts` |
| FR-HLT-03 | Mark offline after 75 s | US-HLT-02 | SPEC-HLT-01, SPEC-HLT-02 ★ §2 | Cabinet Health Monitor | `CabinetHealthService.checkTimeouts()` (`ON_SILENCE`, `moveTo()`) |
| FR-HLT-04 | Communication alarm when offline | US-HLT-02 | SPEC-HLT-02, SPEC-ALM-01 ★ §2 | Cabinet Health Monitor | `CabinetHealthService.moveTo()` → `AlarmService.raiseCommunicationLoss()` |
| FR-HLT-05 | Recover state on heartbeat | US-HLT-03 | SPEC-HLT-01 | Cabinet Health Monitor | `CabinetHealthService.recordHeartbeat()` |
| FR-HLT-06 | Registration time as first heartbeat time | US-HLT-02 | SPEC-HLT-01 | Cabinet Health Monitor | `CabinetHealthService.register()` (`lastContact` = registration time) |
| FR-HLT-07 | Communication loss alarm kept until acknowledged | US-HLT-03 | SPEC-HLT-02, SPEC-ALM-01 ★ §4 | Alarm Manager | `AlarmService.acknowledge()` is the only operation that acknowledges an alarm; `CabinetHealthService.recordHeartbeat()` does not touch alarms |

## Request Handling (REQ)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-REQ-01 | Acknowledge heartbeat with a status per transaction | US-REQ-01, US-ALM-01 | SPEC-COM-02, SPEC-COM-03 ★ §3 | ADC Communication Manager | `AdcCommunicationService.receiveHeartbeat()`, `handleTransaction()`; route: `AdcProtocolController.heartbeat()` |

## User Management (USR)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-USR-01 | Authenticate before dashboard access | US-USR-01 | SPEC-USR-01 | User Management | `SessionController.store()` (`User.verifyCredentials()`, `UserService.actorOf()`); `middleware.auth()` on every page (`start/routes.ts`) |
| FR-USR-02 | Grant functions by role | US-RPT-04, US-RPT-07, US-USR-02 | SPEC-USR-01 | User Management | `UserService.can()` (`PERMISSIONS`); `app/middleware/can_middleware.ts`; `LiveChannel.start()` (live channels) |
| FR-USR-03 | Create a user account with a role | US-USR-03 | As stated | User Management | `UserService.createAccount()`; page: `AccountsController.store()` |
| FR-USR-04 | Change a user's role | US-USR-03 | As stated | User Management | `UserService.changeRole()`; role kept in the session until the next login: `app/middleware/actor_middleware.ts` |
| FR-USR-05 | Deactivate a user account | US-USR-03 | SPEC-USR-01 | User Management | `UserService.deactivate()`; refused at login: `SessionController.store()`; open sessions closed: `actor_middleware.ts` (D-25) |

## Non-functional requirements

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| NFR-SAF-01 | Label status/inventory stale after 45 s | US-INV-01, US-HLT-02, US-DSH-01 | SPEC-HLT-01 ★ §6 | Cabinet Health Monitor | `toStatus()` in `cabinet_health_service.ts` (`stale`, `lastContact`); `resources/views/pages/adcs/show.edge` |
| NFR-SAF-02 | No alarm shown acknowledged without user action | US-ALM-02, US-HIS-02 | SPEC-ALM-01 ★ §4 | Alarm Manager | `AlarmService.acknowledge()`; one acknowledgement per alarm (primary key of `alarm_acknowledgements`, `database/migrations/1761000000000_create_history_tables.ts`) |
| NFR-SAF-03 | Never show unreachable/offline ADC as online | US-HLT-01, US-HLT-02 | SPEC-HLT-01 ★ §6 | Cabinet Health Monitor | `displayedStatus()` in `cabinet_health_service.ts` |
| NFR-SAF-04 | Repeat audible cue of critical alarm | US-ALM-02 | SPEC-ALM-02 | Alarm Manager | `audibleRepeatSeconds()` in `alarms_service.ts`; played by `startCue()` in `resources/js/app.js` |
| NFR-SEC-01 | Authentication before data display | US-INV-01, US-INV-04, US-USR-01 | SPEC-USR-01 | User Management | `middleware.auth()` and `middleware.actor()` on every page (`start/routes.ts`); live channels authorized in `LiveChannel.start()` |
| NFR-SEC-02 | Restrict acknowledgement, commands, configuration by role | US-COM-02, US-COM-03, US-ALM-02, US-USR-02 | SPEC-USR-01, SPEC-COM-04, SPEC-ALM-01 | User Management | `UserService.can()` (`PERMISSIONS`); `can_middleware.ts` on the routes `acknowledgeAlarm`, `sendCommand`, `sendConfiguration` |
| NFR-SEC-03 | Discard heartbeats from unregistered ADCs | US-COM-01, US-REQ-01 | SPEC-COM-02 | ADC Communication Manager | `AdcCommunicationService.receiveHeartbeat()` (`isRegistered()`, `heartbeat_discarded` logged) |
| NFR-SEC-04 | Patient identifiers for pharmacist/administrator only | US-HIS-01, US-RPT-04 | SPEC-USR-02 | Reporting | `ReportingService.adcHistory()`, `forViewer()`; `UserService.canSeePatientIds()` |
| NFR-SEC-05 | Encrypted channel with ADCs | - | N/A | ADC Communication Manager | Only `https://` contact addresses accepted in production: `registrationValidator` (`protocol.ts`, D-35). TLS on the Monitoring System's own address is a deployment setting |
| NFR-REL-01 | Transactions acked "received" retrievable | US-REQ-01, US-HIS-02 | `o_record` (§2.5), SPEC-HIS-01 | ADC Communication Manager | `AdcCommunicationService.receiveHeartbeat()` answers only after everything is stored; SQLite storage (D-39) |
| NFR-REL-02 | < 1 unplanned outage / 1,000 h | - | N/A | - | Verified by measurement in operation |
| NFR-REL-03 | Displayed inventory matches the latest heartbeat | US-HLT-03 | SPEC-COM-02, SPEC-INV-02 | Inventory Supervisor | `InventoryService.replaceInventory()` (one database transaction) |
| NFR-AVL-01 | Available while ADCs offline | US-HLT-02 | N/A | Cabinet Health Monitor | An offline ADC only changes its own row (`CabinetHealthService.moveTo()`); pages do not depend on it |
| NFR-AVL-02 | Keep processing connected ADCs | US-HLT-02 | N/A | ADC Communication Manager | Each heartbeat is handled on its own (`receiveHeartbeat()`); nothing is ever sent to an offline ADC (`deliver()`) |
| NFR-AVL-03 | 99.5% monthly availability | - | N/A | - | Verified by measurement, from the records of NFR-AVL-05 |
| NFR-AVL-04 | 30 days without restart | - | N/A | - | Verified by measurement, from the records of NFR-AVL-05 |
| NFR-AVL-05 | Record own start-ups and shutdowns | - | N/A | Historical Data Store | **Not implemented yet**: `HistoryService.appendSystemLog()` exists, but no start-up or shutdown entry is written |
| NFR-PRF-01 | Alarm displayed within 2 s | US-ALM-01, US-HLT-02 | SPEC-ALM-02 | Operator Dashboard | `LiveChannel.push()` (Server-Sent Events); `onAlarm()` in `resources/js/app.js` |
| NFR-PRF-02 | NFR-PRF-01 holds with 50 ADCs | US-ALM-01 | SPEC-ALM-02 | Operator Dashboard | Verified by measurement with the ADC simulator (`node ace adc:simulate --count=50`) |
| NFR-AUD-01 | Log acknowledgements, commands, configs | US-COM-02, US-COM-03, US-ALM-02, US-HIS-02 | SPEC-COM-04, SPEC-ALM-01 | Alarm Manager; ADC Communication Manager | `AlarmService.acknowledge()` and `AdcCommunicationService.deliver()` → `HistoryService.appendAudit()` |
| NFR-AUD-02 | History cannot be modified | US-HIS-01 | SPEC-HIS-01 | Historical Data Store | `HistoryService` exports no update operation; acknowledgements are a separate table, so a stored alarm is never modified |
| NFR-AUD-03 | History cannot be deleted | US-HIS-01 | SPEC-HIS-01 | Historical Data Store | `HistoryService` exports no delete operation except `purgeExpired()` |
| NFR-AUD-04 | Log account and role changes | US-USR-03 | As stated | User Management | `UserService.createAccount()`, `changeRole()`, `deactivate()` → `audit()` |
| NFR-AUD-05 | Log command/configuration outcome | US-COM-02, US-COM-03 | SPEC-COM-04, SPEC-COM-05 ★ §5 | ADC Communication Manager | `AdcCommunicationService.deliver()` (audit entries `sent`, `delivered`, `failed`, `refused`) |
| NFR-AUD-06 | Log display of patient identifiers | US-HIS-01 | SPEC-USR-02 | Reporting | `ReportingService.auditPatientIds()` |
| NFR-USA-01 | Problem ADCs on main view | US-INV-02, US-DSH-01 | SPEC-INV-01 (with SPEC-HLT-01, SPEC-ALM-02) | Operator Dashboard | `DashboardController.index()` (`ATTENTION`, `InventoryService.listLowStock()`, unacknowledged alarms) |
| NFR-USA-02 | Same status labels everywhere | US-ALM-01, US-DSH-01 | Section 1 (D-16 labels), SPEC-HLT-01 | Operator Dashboard | `severityLabel()`, `labelClass()` in `dashboard/presentation.ts`; `displayedStatus()` in `cabinet_health_service.ts` |
| NFR-USA-03 | Acknowledge alarm in < 15 s | US-ALM-02 | N/A | Operator Dashboard | Acknowledge button on each alarm of the main view (`resources/views/pages/dashboard.edge`); verified by measurement |
| NFR-ACC-01 | Visual and audible alarm cues | US-ALM-01 | SPEC-ALM-02 | Operator Dashboard | `onAlarm()` in `resources/js/app.js` (page flash, sound, text announced in an `aria-live` region) |
| NFR-ACC-02 | No colour-only information | US-ALM-01 | SPEC-ALM-02 | Operator Dashboard | `labelClass()` in `dashboard/presentation.ts` only adds colour to a text label that is always shown |
| NFR-ACC-03 | Keyboard-only operation | - | N/A | Operator Dashboard | Native links, buttons and forms in `resources/views/`; verified by a manual keyboard pass |
| NFR-ACC-04 | WCAG 2.0 AA | - | N/A | Operator Dashboard | `resources/views/`; verified by an accessibility audit |

Two requirements trace to more than one module, and were checked for atomicity:

- **NFR-AUD-01** groups three actions (acknowledgement, command, configuration). Each action is logged by the module that performs it, so the requirement is the conjunction of three atomic ones; it is kept as one row to keep the D1 identifier.
- **FR-USR-02 and NFR-SEC-02** are decided by User Management only; the controllers and the live channel only ask it (D-31).
