# Traceability - Part A (Automated Dispensing Cabinet)

This table extends the **original Part A Deliverable 1** traceability forward, in the same GitHub Markdown table style as the supplied Part B documents: **requirement → D1 user story → precise specification → module → code**. All original IDs are unchanged. **Exactly 82 FR rows and 50 NFR rows (132 total)** are present below.

**How to read the table:**

- **Requirement (short)** paraphrases D1 for navigation; the original D1 PDF is authoritative for exact language.
- **Story** is copied from the supplied Part A D1 traceability Markdown where available. The original D1 traceability omits five requirements; these are added here without fabricating a D1 story. The `US-INV-02 (related)` entry for FR-INV-11 is *not* asserted to be an explicit original Appendix C row.
- **Precise specification** links to a `SPEC-…` item in [precise-specification.md](precise-specification.md). **★ §n** points to the corresponding detailed section in [safety-critical-specifications.md](safety-critical-specifications.md). *As stated* preserves D1 wording without additional black-box refinement. *Optional* has its D1 meaning.
- **Module** is the decision owner (and any genuinely co-owning module) defined in the [module guide](modular-decomposition.md); not automatically a D1 domain entity.
- **Code** is an **actual filename/class or operation** in `ADC_Project_D2/`. An attached **(partial)** or **(not implemented)** marker explicitly means that the named code does **not** fully satisfy D1. A code reference without a warning is not itself evidence of complete formal verification.
- All Python paths are relative to `ADC_Project_D2/`. Detailed differences, safety gaps and real/virtual hardware distinctions are documented in [implementation notes](implementation-notes.md).

## Authentication and Access Control (AUTH)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-AUTH-01 | Authenticate with own account and password | US-AUTH-01 | SPEC-AUTH-01 ★ §2 | Authentication | `authentication.py:Authentication.login()` |
| FR-AUTH-02 | Check permission by authorization level and medication | US-AUTH-03 | SPEC-AUTH-02 ★ §2 | Access Control | `access_control.py:AccessControl.require_level(), require_medication()` **(partial—role UI paths)** |
| FR-AUTH-03 | Deny without permission and show level/permission required | US-AUTH-03 | SPEC-AUTH-02 ★ §2 | Access Control | `access_control.py:AccessControl.require_level(), require_medication()` **(partial—role UI paths)** |
| FR-AUTH-04 | Inactivity countdown after 15 s (1-900 s, cancellable) | US-AUTH-02 | SPEC-AUTH-03 ★ §2 | Local User Interface / Authentication | `adc_app.py:ADCApplication._touch()` **(partial—blocking CLI timer; door sequence)** |
| FR-AUTH-05 | End session at countdown end; open door stays closable | US-AUTH-02, US-FAULT-03 | SPEC-AUTH-03 ★ §2 | Local User Interface / Authentication | `adc_app.py:ADCApplication._touch()` **(partial—blocking CLI timer; door sequence)** |
| FR-AUTH-06 | Block logins after repeated failures | US-AUTH-04 | SPEC-AUTH-01 ★ §2 | Authentication | `authentication.py:Authentication.login(), clear_lockout(), configure()` **(partial—manual-recovery timing)** |
| FR-AUTH-07 | Three authorization levels | US-AUTH-05 | SPEC-AUTH-01 ★ §2 | Authentication | `authentication.py:Authentication.login()` |
| FR-AUTH-08 | Level 1 dispenses only permitted medications and quantities | US-AUTH-06, US-LOG-02 | SPEC-AUTH-02 ★ §2 | Access Control | `access_control.py:AccessControl.require_level(), require_medication()` **(partial—role UI paths)** |
| FR-AUTH-09 | Level 2 permissions | US-AUTH-06, US-DISP-05, US-LOG-02 | SPEC-AUTH-02 ★ §2 | Access Control | `access_control.py:AccessControl.require_level(), require_medication()` **(partial—role UI paths)** |
| FR-AUTH-10 | Level 3 permissions | US-AUTH-05, US-LOG-02, US-MODE-03 | SPEC-AUTH-02 ★ §2 | Access Control | `access_control.py:AccessControl.require_level(), require_medication()` **(partial—role UI paths)** |
| FR-AUTH-11 | Password Requirements | US-AUTH-05 | SPEC-AUTH-01 | Authentication / Local Database | `data_store.py:password_is_valid()` |

## Medication Inventory Management (INV)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-INV-01 | Unique system-generated medication ID | US-INV-01 | SPEC-INV-01 ★ §5 | Inventory Manager / Local Database | `inventory.py:InventoryManager.add_medication()` **(partial—mutable storage, arbitrary location strings)** |
| FR-INV-02 | Store medication details separately from the ID | US-INV-01 | SPEC-INV-01 ★ §5 | Inventory Manager / Local Database | `inventory.py:InventoryManager.add_medication()` **(partial—mutable storage, arbitrary location strings)** |
| FR-INV-03 | One active record per storage location | US-INV-01 | SPEC-INV-01 ★ §5 | Inventory Manager / Local Database | `inventory.py:InventoryManager.add_medication()` **(partial—mutable storage, arbitrary location strings)** |
| FR-INV-04 | Register medication during replenishment (Level 2/3) | US-INV-01 | SPEC-INV-01 ★ §5 | Inventory Manager | `inventory.py:InventoryManager.add_medication()` **(partial—not exposed in CLI)** |
| FR-INV-05 | Update inventory after replenishment | US-INV-02 | SPEC-INV-01 ★ §5 | Inventory Manager | `inventory.py:InventoryManager.replenish()` **(partial—mutation before audit)** |
| FR-INV-06 | Update inventory after completed dispensing | US-DISP-02 | SPEC-INV-02 ★ §5 | Inventory Manager / Dispensing Controller | `dispensing.py:DispensingController.dispense()` **(partial—confirmation before unlock)** |
| FR-INV-07 | Correct inventory discrepancy and record it | US-INV-04 | SPEC-INV-01 ★ §5 | Inventory Manager | `inventory.py:InventoryManager.correct_quantity()` **(partial—mutation before audit)** |
| FR-INV-08 | Mark medication unavailable if count is uncertain | US-INV-04 | SPEC-INV-02 ★ §5 | Inventory Manager | `inventory.py:InventoryManager.mark_unavailable()` **(partial—not automatic on all uncertainty)** |
| FR-INV-09 | View medication information permitted to the user | US-INV-03 | SPEC-INV-02 | Inventory Manager / Access Control / Local User Interface | `adc_app.py:ADCApplication._show_inventory()` **(partial—view permissions not per medication)** |
| FR-INV-10 | Retain recorded inventory and required information across restart [Optional] | — (optional) | As stated [Optional] | Local Database | `data_store.py:DataStore` **(optional—not implemented)** |
| FR-INV-11 | Reject replenishment above 20; leave quantity unchanged | US-INV-02 (related; D1 Appendix C row omitted) | SPEC-INV-01 ★ §5 | Inventory Manager | `inventory.py:InventoryManager.replenish()` |

## Medication Dispensing (DISP)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-DISP-01 | Accept request with medication record and quantity | US-DISP-01 | SPEC-DISP-01 ★ §3 | Dispensing Controller | `adc_app.py:ADCApplication._dispense()` |
| FR-DISP-02 | Check permission, quantity, policy and fault state first | US-DISP-01, US-COM-05 | SPEC-DISP-01 ★ §3 | Dispensing Controller | `dispensing.py:DispensingController.dispense()` **(partial—real hardware/fault checks not verified)** |
| FR-DISP-03 | Reject request for any listed reason | US-AUTH-06, US-DISP-03 | SPEC-DISP-01 ★ §3 | Dispensing Controller | `dispensing.py:DispensingController.dispense()` **(partial—real hardware/fault checks not verified)** |
| FR-DISP-04 | Open only the requested storage location | US-DISP-01 | SPEC-DISP-01 ★ §3 | Dispensing Controller | `dispensing.py:DispensingController.dispense()` **(partial—real hardware/fault checks not verified)** |
| FR-DISP-05 | One completed dispensing per request ID | US-DISP-06 | SPEC-DISP-04 ★ §4 | Dispensing Controller / Local Database | `dispensing.py:DispensingController.dispense()` **(partial—not restart-safe)** |
| FR-DISP-06 | Complete only after user confirms quantity withdrawn | US-DISP-02 | SPEC-DISP-02 ★ §3 | Dispensing Controller / Local User Interface | `adc_app.py:ADCApplication._dispense(); dispensing.py:DispensingController.dispense()` **(partial—wrong physical confirmation order)** |
| FR-DISP-07 | Configure withdrawal policy (maximum quantity, window) | US-DISP-05 | SPEC-DISP-03 | Inventory Manager | `inventory.py:InventoryManager.set_policy()` |
| FR-DISP-08 | Reject request over policy and record the attempt | US-DISP-04 | SPEC-DISP-03 ★ §3 | Dispensing Controller / Event Logger | `dispensing.py:DispensingController.dispense()` |
| FR-DISP-09 | Show previous withdrawal, remaining quantity, reset time | US-DISP-04 | SPEC-DISP-03 ★ §3 | Dispensing Controller / Local User Interface | `dispensing.py:DispensingController.policy_status(); adc_app.py:_dispense()` **(partial—reset time absent)** |
| FR-DISP-10 | Confirm an intentional repeat withdrawal | US-DISP-04 | SPEC-DISP-03 ★ §3 | Dispensing Controller / Local User Interface | `dispensing.py:DispensingController.dispense()` |
| FR-DISP-11 | Level 2/3 removal override during replenishment or correction | US-DISP-07 | SPEC-DISP-03 ★ §3 | Inventory Manager / Dispensing Controller | `inventory.py:InventoryManager.correct_quantity()` **(not implemented—explicit logged override workflow)** |
| FR-DISP-12 | Withdrawal-policy group across several records | US-DISP-05 | SPEC-DISP-03 ★ §3 | Inventory Manager / Dispensing Controller | `inventory.py:InventoryManager.assign_policy_group(); dispensing.py:policy_status()` |

## Event Logging (LOG)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-LOG-01 | Record each login attempt | US-AUTH-01, US-LOG-01, US-FAULT-07 | SPEC-LOG-01 | Event Logger / Authentication | `authentication.py:Authentication.login(); event_logger.py:EventLogger.record()` |
| FR-LOG-02 | Record each dispensing request and outcome | US-DISP-02, US-DISP-06, US-LOG-01 | SPEC-LOG-01 | Dispensing Controller / Event Logger | `dispensing.py:DispensingController.dispense()` **(partial—some rejections not logged)** |
| FR-LOG-03 | Record replenishments and inventory corrections | US-INV-01, US-INV-02, US-INV-04, US-DISP-07 | SPEC-LOG-01 | Inventory Manager / Event Logger | `inventory.py:InventoryManager.replenish(), correct_quantity()` **(partial—non-atomic)** |
| FR-LOG-04 | Record each detected fault | US-LOG-03, US-FAULT-01, US-FAULT-02 | SPEC-LOG-01 | Fault and Mode Manager / Event Logger | `fault_manager.py:FaultManager.raise_fault()` **(partial—fault record fields incomplete)** |
| FR-LOG-05 | Record failed communication attempts | US-LOG-03 | SPEC-LOG-01 | Monitoring Communication Manager / Event Logger | `monitor_communication.py:MonitorCommunication.set_connection()` **(partial—does not track each failed attempt)** |
| FR-LOG-06 | Level 2 limited log view; Level 3 full history | US-LOG-02 | As stated | Local User Interface / Event Logger / Access Control | `adc_app.py:ADCApplication._logs()` **(partial—Fault Mode path and all fault records)** |
| FR-LOG-07 | Tie activity records to responsible user and time | US-INV-02, US-DISP-05, US-DISP-07, US-LOG-01 | SPEC-LOG-01 | Event Logger | `event_logger.py:EventLogger.record()` **(partial—some privileged changes / remote source)** |
| FR-LOG-08 | Unique record ID and acknowledgement tracking | US-LOG-03, US-COM-02 | SPEC-LOG-02 | Event Logger | `event_logger.py:EventLogger.record(), record_fault(), acknowledge()` **(partial—fault ack missing)** |
| FR-LOG-09 | Store at least 500 event and 100 fault records | US-LOG-04 | SPEC-LOG-02 | Event Logger | `event_logger.py:EventLogger.EVENT_CAPACITY, FAULT_CAPACITY` |
| FR-LOG-10 | Never overwrite unacknowledged records | US-LOG-04 | SPEC-LOG-02 | Event Logger | `event_logger.py:EventLogger.record(), record_fault()` **(partial—fault ack status absent)** |
| FR-LOG-11 | Level 3 clears only acknowledged records; clearing is logged | US-LOG-05 | SPEC-LOG-02 | Event Logger | `event_logger.py:EventLogger.clear_acknowledged()` **(partial—events only)** |
| FR-LOG-12 | Refuse protected operations if no audit record can be made | US-LOG-04 | SPEC-LOG-01 ★ §5 | Event Logger / Inventory Manager / Dispensing Controller | `event_logger.py:EventLogger.can_record(); inventory.py:replenish()` **(partial—stock can change before audit)** |

## Fault Detection (FAULT)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-FAULT-01 | Detect door/drawer that fails to close | US-FAULT-01 | SPEC-FAULT-01 ★ §6 | Fault and Mode Manager / Lock/Sensor Interface | `hardware_interface.py:HardwareInterface.close_drawer(); dispensing.py:dispense()` **(partial—no door timeout sensor)** |
| FR-FAULT-02 | Detect door/drawer that fails to unlock | US-FAULT-02 | SPEC-FAULT-01 ★ §6 | Fault and Mode Manager / Lock/Sensor Interface | `hardware_interface.py:HardwareInterface.unlock(); dispensing.py:dispense()` **(partial—simulated feedback)** |
| FR-FAULT-03 | Block medication access during error/critical fault | US-FAULT-01, US-FAULT-02 | SPEC-FAULT-01 ★ §6 | Fault and Mode Manager / Dispensing Controller | `dispensing.py:DispensingController.dispense()` **(partial—other ops in Fault Mode)** |
| FR-FAULT-04 | Restricted fault-clear login by level | US-FAULT-03, US-FAULT-06, US-FAULT-08 | SPEC-FAULT-02 ★ §6 | Fault and Mode Manager / Authentication | `fault_manager.py:FaultManager.clear_fault()` **(partial—restricted login missing)** |
| FR-FAULT-05 | Cannot clear a fault while its cause remains | US-FAULT-06 | SPEC-FAULT-02 ★ §6 | Fault and Mode Manager | `fault_manager.py:FaultManager.resolve_condition(), clear_fault()` **(partial—manual cause resolution)** |
| FR-FAULT-06 | Classify as informational, warning, error or critical | US-DISP-03, US-FAULT-04, US-MODE-01 | SPEC-FAULT-01 ★ §6 | Fault and Mode Manager | `fault_manager.py:FaultManager.raise_fault()` |
| FR-FAULT-07 | Display and record informational conditions | US-DISP-03, US-DISP-04, US-FAULT-04 | SPEC-FAULT-01 | Fault and Mode Manager / Event Logger | `dispensing.py:DispensingController.dispense()` **(partial—no consistent INFO fault)** |
| FR-FAULT-08 | Display, record and communicate warnings | US-FAULT-04, US-FAULT-05, US-COM-06 | SPEC-FAULT-01 | Fault and Mode Manager / Monitoring Communication Manager | `monitor_communication.py:set_connection(); dispensing.py:dispense()` **(partial—warning reporting)** |
| FR-FAULT-09 | Door open after session expiry is an error fault | US-FAULT-03 | SPEC-FAULT-03 ★ §6 | Fault and Mode Manager / Local User Interface | `adc_app.py:ADCApplication._touch()` **(partial—simulated auto-close)** |
| FR-FAULT-10 | Record and flag unauthorized-access attempts | US-FAULT-07 | SPEC-FAULT-01 | Fault and Mode Manager / Authentication | `authentication.py:Authentication.login()` **(partial—access-attempt flagging)** |
| FR-FAULT-11 | Critical fault if safe state unknown or data unusable | US-FAULT-08 | SPEC-FAULT-01 ★ §6 | Fault and Mode Manager | `fault_manager.py:FaultManager.raise_fault()` **(partial—no automatic corrupt-state detection)** |
| FR-FAULT-12 | Low-medication warning at 10% or less of loaded quantity | US-FAULT-05 | SPEC-INV-03 | Inventory Manager / Fault and Mode Manager | `dispensing.py:DispensingController.dispense()` **(partial—trigger paths incomplete)** |

## Operational Mode Management (MODE)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-MODE-01 | Normal, Maintenance and Fault modes | US-MODE-01 | SPEC-MODE-01 | Fault and Mode Manager | `models.py:Mode; fault_manager.py:FaultManager` |
| FR-MODE-02 | Enter Fault Mode within 3 s of an error/critical fault | US-FAULT-01, US-FAULT-02, US-FAULT-08, US-MODE-02 | SPEC-FAULT-01 ★ §6 | Fault and Mode Manager | `fault_manager.py:FaultManager.raise_fault()` **(partial—3 s timing not measured)** |
| FR-MODE-03 | Level 3 enters Maintenance Mode | US-MODE-03 | SPEC-MODE-01 | Fault and Mode Manager | `fault_manager.py:FaultManager.enter_maintenance()` |
| FR-MODE-04 | Maintenance Mode functions | US-MODE-03 | SPEC-MODE-01 | Fault and Mode Manager / Local User Interface | `adc_app.py:ADCApplication.run()` **(partial—maintenance test/settings functions)** |
| FR-MODE-05 | Fault Mode lockdown behaviour | US-FAULT-06, US-FAULT-08, US-MODE-02 | SPEC-FAULT-01 ★ §6 | Fault and Mode Manager / Local User Interface | `fault_manager.py:FaultManager.raise_fault(); adc_app.py:run()` **(partial—normal login/operations not fully disabled)** |
| FR-MODE-06 | Show fault severity and type | US-MODE-02 | SPEC-FAULT-01 | Local User Interface | `adc_app.py:ADCApplication._clear_fault()` **(partial—display only in workflow)** |
| FR-MODE-07 | Normal Mode capabilities | US-MODE-01 | SPEC-MODE-01 | Fault and Mode Manager / Local User Interface | `adc_app.py:ADCApplication.run()` **(partial—full D1 Normal functions)** |
| FR-MODE-08 | Software restart, sleep and shutdown for Level 3 [Optional] | — (optional) | As stated [Optional] | Local User Interface | `adc_app.py:ADCApplication.run()` **(optional—restart/sleep/shutdown not implemented)** |
| FR-MODE-09 | Restore locally retained information after restart [Optional] | — (optional) | As stated [Optional] | Local Database | `data_store.py:DataStore` **(optional—restore not implemented)** |

## External Communication (COM)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| FR-COM-01 | Exchange operational information with Monitoring System | US-COM-01 | SPEC-COM-01 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication` **(partial—no actual Part B link)** |
| FR-COM-02 | Send status update every 30 s | US-COM-01 | SPEC-COM-01 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.status_cycle()` **(partial—manual, not scheduled)** |
| FR-COM-03 | Transmit new or unsent activity, event and fault records | US-COM-02 | SPEC-COM-02 | Monitoring Communication Manager / Event Logger | `monitor_communication.py:queue_unacknowledged_events()` **(partial—fault records and live send)** |
| FR-COM-04 | Cabinet ID in every status message; store location | US-COM-01 | SPEC-COM-01 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.build_status()` **(partial—cabinet ID not partner UUID)** |
| FR-COM-05 | Receive commands and remote unlock requests | US-COM-04 | SPEC-COM-03 ★ §3 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.handle_command()` **(partial—no HTTP receive/configuration)** |
| FR-COM-06 | Validate command source, ID, format, authorization, safety | US-COM-04 | SPEC-COM-03 ★ §3 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.handle_command()` **(partial—demo marker not authenticated source)** |
| FR-COM-07 | Remote unlock only after local checks pass | US-COM-05 | SPEC-COM-03 ★ §3 | Monitoring Communication Manager / Dispensing Controller | `monitor_communication.py:handle_command(); dispensing.py:dispense()` **(partial—remote quantity auto-confirmed)** |
| FR-COM-08 | Send command outcome with command ID | US-COM-04, US-COM-05 | SPEC-COM-03 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.handle_command()` **(partial—demo result not HTTP contract)** |
| FR-COM-09 | Detect communication loss; record and display warning | US-COM-06 | SPEC-COM-04 | Monitoring Communication Manager / Fault and Mode Manager | `monitor_communication.py:MonitorCommunication.set_connection()` **(partial—manual loss toggle)** |
| FR-COM-10 | Continue local operation during outage | US-COM-06 | SPEC-COM-04 | Dispensing Controller / Monitoring Communication Manager | `dispensing.py:DispensingController.dispense()` **(partial—other local checks incomplete)** |
| FR-COM-11 | Store records locally; retry after recovery | US-COM-07 | SPEC-COM-02 | Monitoring Communication Manager / Event Logger | `monitor_communication.py:MonitorCommunication.enqueue()` **(partial—volatile outbox)** |
| FR-COM-12 | Keep unsent record until its ID is acknowledged | US-COM-02, US-COM-07 | SPEC-COM-02 | Monitoring Communication Manager / Event Logger | `monitor_communication.py:MonitorCommunication.flush_simulated()` **(partial—simulated ACK only)** |
| FR-COM-13 | Unique IDs so retransmissions are not new events | US-COM-02, US-COM-04, US-COM-07 | SPEC-COM-02 / SPEC-COM-03 ★ §4 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication._seen_commands` **(partial—IDs volatile/incompatible)** |
| FR-COM-14 | Send authorized inventory information | US-COM-03 | SPEC-COM-01 | Monitoring Communication Manager / Inventory Manager | `monitor_communication.py:MonitorCommunication.build_status()` **(not implemented—full authorized inventory exchange)** |
| FR-COM-15 | Status message content | US-COM-01 | SPEC-COM-01 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.build_status()` **(partial—partner schema unverified)** |

## Non-functional requirements

## Safety (SAF)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| NFR-SAF-01 | Medication access only if all safety checks pass | US-DISP-01 | SPEC-DISP-01 ★ §3 | Dispensing Controller | `dispensing.py:DispensingController.dispense()` **(partial—real hardware/atomic audit)** |
| NFR-SAF-02 | Storage locked unless an authorized operation needs access | US-DISP-01, US-COM-05 | SPEC-DISP-01 ★ §3 | Dispensing Controller | `dispensing.py:DispensingController.dispense()` **(partial—real hardware/atomic audit)** |
| NFR-SAF-03 | One completed dispensing per request ID | US-DISP-06 | SPEC-DISP-04 ★ §4 | Dispensing Controller / Local Database | `dispensing.py:DispensingController.dispense()` **(partial—memory only)** |
| NFR-SAF-04 | Uncertain inventory unavailable until Level 2/3 confirms | US-INV-04 | SPEC-INV-02 ★ §5 | Inventory Manager | `inventory.py:InventoryManager.mark_unavailable()` **(partial—no automatic uncertainty path)** |
| NFR-SAF-05 | Withdrawals in a policy group share one limit | US-DISP-05 | SPEC-DISP-03 ★ §3 | Dispensing Controller | `dispensing.py:DispensingController.policy_status()` |
| NFR-SAF-06 | Faults block normal operation until cleared | US-FAULT-04, US-FAULT-06, US-FAULT-08, US-MODE-02 | SPEC-FAULT-01 / SPEC-FAULT-02 ★ §6 | Fault and Mode Manager | `fault_manager.py:FaultManager.raise_fault(), clear_fault()` **(partial—cause verification)** |
| NFR-SAF-07 | Open door stays closable after timeout; lockdown after closing | US-FAULT-03 | SPEC-AUTH-03 / SPEC-FAULT-03 ★ §2/§6 | Local User Interface / Fault and Mode Manager | `adc_app.py:ADCApplication._touch()` **(partial—auto-close simulation)** |
| NFR-SAF-08 | Remote commands cannot bypass local safety checks | US-COM-05 | SPEC-COM-03 / SPEC-DISP-01 ★ §3 | Monitoring Communication Manager / Dispensing Controller | `monitor_communication.py:MonitorCommunication.handle_command()` **(partial—auto-confirm and demo marker)** |
| NFR-SAF-09 | Local safety checks continue during communication loss | US-COM-06 | SPEC-COM-04 | Monitoring Communication Manager / Dispensing Controller | `monitor_communication.py:MonitorCommunication.set_connection()` **(partial—simulated)** |

## Security (SEC)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| NFR-SEC-01 | Individual user account and password | US-AUTH-01 | SPEC-AUTH-01 ★ §2 | Authentication | `authentication.py:Authentication.login()` |
| NFR-SEC-02 | Password: 8+ characters, 3+ digits, 3+ special | US-AUTH-05 | SPEC-AUTH-01 | Authentication / Local Database | `data_store.py:password_is_valid()` |
| NFR-SEC-03 | Enforce Level 1, 2 and 3 permissions | US-AUTH-05 | SPEC-AUTH-02 ★ §2 | Access Control | `access_control.py:AccessControl.require_level(), require_medication()` |
| NFR-SEC-04 | Level 1 limited to configured medication rules | US-AUTH-06 | SPEC-AUTH-02 ★ §2 | Access Control | `access_control.py:AccessControl.require_level(), require_medication()` |
| NFR-SEC-05 | Failed-login limits Level 3 only; not reset by leaving screen | US-AUTH-04 | SPEC-AUTH-01 | Authentication | `authentication.py:Authentication.login(), configure()` **(partial—lockout expiry/recovery)** |
| NFR-SEC-06 | Countdown after 15 s; session ends at expiry | US-AUTH-02 | SPEC-AUTH-03 ★ §2 | Local User Interface / Authentication | `adc_app.py:ADCApplication._touch()` **(partial—blocking timer)** |
| NFR-SEC-07 | Level 2 limited records; Level 3 full logs and security settings | US-LOG-02 | SPEC-AUTH-02 | Access Control / Local User Interface | `adc_app.py:ADCApplication._logs()` **(partial—record scope)** |
| NFR-SEC-08 | Patient names hidden from unauthenticated users | US-INV-03, US-COM-03 | SPEC-AUTH-02 | Inventory Manager / Access Control | `adc_app.py:ADCApplication._show_inventory()` **(partial—medication-specific view)** |
| NFR-SEC-09 | Accept commands only from authenticated Monitoring System | US-COM-03, US-COM-04 | SPEC-COM-03 ★ §3 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.handle_command()` **(partial—demo marker is not cryptographic authentication)** |
| NFR-SEC-10 | Remote commands carry command ID and source information | US-COM-04, US-COM-05 | SPEC-COM-03 ★ §3 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.handle_command()` **(partial—demo marker is not cryptographic authentication)** |

## Reliability (REL)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| NFR-REL-01 | Stable, unique medication identifiers | US-INV-01 | SPEC-INV-01 ★ §5 | Inventory Manager / Local Database | `inventory.py:InventoryManager.add_medication()` **(partial—ID not UUID per partner)** |
| NFR-REL-02 | One active record per storage location | US-INV-01 | SPEC-INV-01 ★ §5 | Inventory Manager / Local Database | `inventory.py:InventoryManager.add_medication()` **(partial—ID not UUID per partner)** |
| NFR-REL-03 | Inventory matches event record after each operation | US-INV-02, US-DISP-02 | SPEC-INV-01 / SPEC-LOG-01 ★ §5 | Inventory Manager / Event Logger | `inventory.py:replenish(), correct_quantity(); event_logger.py:record()` **(partial—non-atomic)** |
| NFR-REL-04 | Fault stays active until cause resolved and cleared | US-FAULT-06 | SPEC-FAULT-02 ★ §6 | Fault and Mode Manager | `fault_manager.py:FaultManager.clear_fault()` **(partial—manual resolution)** |
| NFR-REL-05 | Unacknowledged records kept and retried | US-COM-07 | SPEC-COM-02 | Monitoring Communication Manager / Event Logger | `monitor_communication.py:MonitorCommunication.flush_simulated()` **(partial—volatile queue, fault ACK missing)** |
| NFR-REL-06 | Unique IDs and acknowledgements prevent duplicates | US-DISP-06, US-COM-02 | SPEC-DISP-04 / SPEC-COM-02 ★ §4 | Monitoring Communication Manager / Dispensing Controller | `data_store.py:DataStore.completed_requests; monitor_communication.py:_seen_commands` **(partial—no persistent idempotency)** |
| NFR-REL-07 | Command response identifies command and actual result | US-COM-04 | SPEC-COM-03 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.handle_command()` **(partial—no live partner responses)** |

## Availability (AVA)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| NFR-AVA-01 | Local operation continues during Monitoring System outage | US-COM-06 | SPEC-COM-04 | Monitoring Communication Manager / Dispensing Controller | `monitor_communication.py:set_connection(); dispensing.py:dispense()` **(partial—simulated link)** |
| NFR-AVA-02 | Resume status and retry on recovery without restart | US-COM-07 | SPEC-COM-02 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.set_connection(), flush_simulated()` **(partial—no scheduled status restart)** |
| NFR-AVA-03 | Safety takes priority over dispensing availability | US-FAULT-06 | SPEC-FAULT-01 | Fault and Mode Manager | `fault_manager.py:FaultManager.raise_fault()` |
| NFR-AVA-04 | Restart and recovery support optional for minimum implementation | — (optional) | As stated [Optional] | Local Database | `data_store.py:DataStore` **(optional—not implemented)** |

## Performance (PERF)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| NFR-PERF-01 | Login granted or rejected within 3 s | US-AUTH-01 | SPEC-AUTH-01 ★ §2; timing test required | Authentication | `authentication.py:Authentication.login()` **(partial—3 s not measured)** |
| NFR-PERF-02 | Fault state entered within 3 s | US-FAULT-01, US-MODE-02 | SPEC-FAULT-01 ★ §6; timing test required | Fault and Mode Manager | `fault_manager.py:FaultManager.raise_fault()` **(partial—3 s not measured)** |
| NFR-PERF-03 | Status sent every 30 s | US-COM-01 | SPEC-COM-01; timing test required | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.status_cycle()` **(not implemented—automatic 30 s)** |
| NFR-PERF-04 | Unacknowledged data retransmitted on later cycles | US-COM-07 | SPEC-COM-02 | Monitoring Communication Manager | `monitor_communication.py:MonitorCommunication.flush_simulated()` **(partial—no heartbeat scheduler)** |
| NFR-PERF-05 | Countdown after 15 s; session ends at 1-900 s expiry | US-AUTH-02 | SPEC-AUTH-03 ★ §2; timing test required | Local User Interface | `adc_app.py:ADCApplication._touch()` **(partial—blocking timer)** |

## Traceability / Auditability (AUD)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| NFR-AUD-01 | Log logins, dispensing, replenishment, corrections, config, faults, commands | US-AUTH-01, US-LOG-01, US-FAULT-07, US-COM-04 | SPEC-LOG-01 | Event Logger | `event_logger.py:EventLogger.record()` **(partial—full event coverage)** |
| NFR-AUD-02 | Log records carry ID, ADC ID, time, user/source, outcome | US-LOG-01, US-LOG-03 | SPEC-LOG-01 | Event Logger | `models.py:Event; event_logger.py:record()` **(partial—ADC ID/location fields)** |
| NFR-AUD-03 | Local time zone, MM/DD/YYYY 24 h; Level 3 sets time zone | US-LOG-01, US-MODE-03 | As stated (format/timezone) | Event Logger / Local User Interface | `models.py:now_iso()` **(partial—D1 timestamp display format/role setting)** |
| NFR-AUD-04 | Store 500 event and 100 fault records | US-LOG-04 | SPEC-LOG-02 | Event Logger | `event_logger.py:EventLogger.EVENT_CAPACITY, FAULT_CAPACITY` |
| NFR-AUD-05 | Never overwrite unacknowledged records | US-LOG-04 | SPEC-LOG-02 | Event Logger | `event_logger.py:EventLogger.record(), record_fault()` **(partial—fault ack field absent)** |
| NFR-AUD-06 | Only Level 3 clears acknowledged logs; clearing is logged | US-LOG-05 | SPEC-LOG-02 | Event Logger | `event_logger.py:EventLogger.clear_acknowledged()` **(partial—events only)** |
| NFR-AUD-07 | Refuse unaudited protected actions when log full and unsynced | US-LOG-04 | SPEC-LOG-01 ★ §5 | Event Logger / Inventory Manager | `event_logger.py:can_record(); inventory.py:replenish()` **(partial—non-atomic)** |

## Usability / Accessibility (USA)

| Req ID | Requirement (short) | Story | Precise specification | Module | Code |
| --- | --- | --- | --- | --- | --- |
| NFR-USA-01 | Denial shows level/permission required, no password data | US-AUTH-03 | SPEC-AUTH-02 | Access Control / Local User Interface | `access_control.py:AccessControl.require_level()` |
| NFR-USA-02 | Countdown shows remaining time and that input cancels | US-AUTH-02 | SPEC-AUTH-03 | Local User Interface | `adc_app.py:ADCApplication._touch()` **(not implemented—visible countdown)** |
| NFR-USA-03 | Repeat warning shows previous withdrawal, remaining, reset time | US-DISP-04 | SPEC-DISP-03 | Local User Interface / Dispensing Controller | `adc_app.py:ADCApplication._dispense()` **(partial—reset time missing)** |
| NFR-USA-04 | Consistent medication layout to tell records apart | US-INV-03 | As stated | Local User Interface | `adc_app.py:ADCApplication._show_inventory()` **(partial—authorized record scope)** |
| NFR-USA-05 | Fault messages show severity, description, next action | US-MODE-02 | SPEC-FAULT-01 | Local User Interface | `adc_app.py:ADCApplication._clear_fault()` **(partial—next action and complete warning UI)** |
| NFR-USA-06 | Fault Mode display shows lockdown and level required | US-MODE-02 | SPEC-FAULT-01 | Local User Interface | `adc_app.py:ADCApplication.run()` **(partial—Fault Mode screen missing)** |
| NFR-USA-07 | Warnings use text or symbols, not colour alone | US-FAULT-05, US-MODE-02 | As stated | Local User Interface | `adc_app.py:ADCApplication.run()` **(text CLI; no formal accessibility test)** |
| NFR-USA-08 | Readable prompts with a clear next action | US-DISP-03 | As stated | Local User Interface | `adc_app.py:ADCApplication.run()` **(partial—some prompts only exceptions)** |

## Coverage check

| Family | Count |
| --- | ---: |
| FR-AUTH | 11 |
| FR-INV | 11 |
| FR-DISP | 12 |
| FR-LOG | 12 |
| FR-FAULT | 12 |
| FR-MODE | 9 |
| FR-COM | 15 |
| NFR-SAF | 9 |
| NFR-SEC | 10 |
| NFR-REL | 7 |
| NFR-AVA | 4 |
| NFR-PERF | 5 |
| NFR-AUD | 7 |
| NFR-USA | 8 |
| **Total** | **132** |

**Source integrity note:** the original D1 PDF explicitly says 82 functional and 50 non-functional requirements. A separate legacy Part A traceability Markdown contained only 127 requirement rows, omitting `FR-INV-10`, `FR-INV-11`, `FR-MODE-08`, `FR-MODE-09`, and `NFR-AVA-04`; all are restored here. The original Part A functional-requirements Markdown itself omitted `FR-INV-11`. The first four optional labels and the capacity requirement here come from the original D1 PDF, not from a guessed continuation.

**Submission status:** this document is complete as a **requirement-to-design/code trace**, not proof that all rows are implemented. The D2 technical demonstration should show actual covered paths and acknowledge the marked gaps.
