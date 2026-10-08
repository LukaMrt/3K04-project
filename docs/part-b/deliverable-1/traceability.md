# Traceability - Part B (Hospital Monitoring System)

| Req ID | Requirement (short) | Story | Component | Stakeholder / source |
| --- | --- | --- | --- | --- |
| FR-COM-01 | Register an ADC | US-COM-01 | ADC Communication Manager | ADC team (Part A); Administrator |
| FR-COM-02 | Reject duplicate ADC identifier | US-COM-01 | ADC Communication Manager, Historical Data Store | Administrator |
| FR-COM-03 | Record heartbeat reception time | US-HLT-01 | ADC Communication Manager, Cabinet Health Monitor | Technician; Scenario 3 |
| FR-COM-04 | Send a command to an ADC | US-COM-02 | Operator Dashboard, ADC Communication Manager | Technician |
| FR-COM-05 | Send configuration to an ADC | US-COM-03 | Operator Dashboard, ADC Communication Manager | Administrator |
| FR-COM-06 | Mark unacknowledged command/configuration as failed (10 s) | US-COM-02, US-COM-03 | ADC Communication Manager, Operator Dashboard | Technician |
| FR-COM-07 | Heartbeat carries status, inventory, pending transactions | US-REQ-01, US-HLT-03 | ADC Communication Manager | ADC team (Part A); Scenario 3 |
| FR-COM-08 | Do not record duplicate transactions again | US-REQ-01 | ADC Communication Manager | ADC team (Part A) |
| FR-COM-09 | Content of a dispensing activity | US-REQ-01 | ADC Communication Manager | Pharmacist; ADC team (Part A) |
| FR-COM-10 | Reject incomplete dispensing activity | US-REQ-01 | ADC Communication Manager | Pharmacist; ADC team (Part A) |
| FR-COM-11 | Delivered only if ack carries command and ADC IDs | US-COM-02 | ADC Communication Manager | Technician; part-b.pdf §2 (wrong cabinet) |
| FR-COM-12 | Refuse sending to an offline ADC | US-COM-03 | ADC Communication Manager, Operator Dashboard | Technician; part-b.pdf §2 (uncertain command) |
| FR-INV-01 | Store inventory from each heartbeat | US-INV-01, US-HLT-03 | ADC Communication Manager, Inventory Supervisor | Pharmacist |
| FR-INV-02 | Display a cabinet's inventory | US-INV-01 | Inventory Supervisor, Operator Dashboard | Pharmacist; Scenario 1 |
| FR-INV-03 | Flag low stock below 10 boxes | US-INV-02 | Inventory Supervisor | Pharmacist; Scenario 1 |
| FR-INV-04 | List same-floor ADCs with stock | US-INV-03 | Inventory Supervisor | Pharmacist; Scenario 1 |
| FR-INV-05 | "No stock available" message | US-INV-03 | Inventory Supervisor, Operator Dashboard | Pharmacist |
| FR-INV-06 | Aggregated stock across ADCs | US-INV-04 | Inventory Supervisor | Pharmacist; Scenario 1 |
| FR-ALM-01 | Record received alarms | US-ALM-01 | Alarm Manager, Historical Data Store | Nurse; Scenario 2 |
| FR-ALM-02 | Reject incomplete alarm transactions | US-ALM-01 | ADC Communication Manager, Historical Data Store | ADC team (Part A) |
| FR-ALM-03 | Reject unknown severity | US-ALM-01 | ADC Communication Manager, Historical Data Store | Nurse |
| FR-ALM-04 | Display unacknowledged alarms | US-ALM-01 | Alarm Manager, Operator Dashboard | Nurse; Scenario 2 |
| FR-ALM-05 | Acknowledge an alarm | US-ALM-02 | Alarm Manager, Operator Dashboard | Nurse; Technician |
| FR-ALM-06 | Reject re-acknowledgement | US-ALM-02 | Alarm Manager | Nurse |
| FR-HIS-01 | Retain alarms 1 year | US-HIS-02 | Historical Data Store | Hospital risk management |
| FR-HIS-02 | Retain dispensing activity 6 months | US-HIS-01 | Historical Data Store, ADC Communication Manager | Pharmacist; Scenario 4 |
| FR-HIS-03 | Retain status changes 6 months | US-HIS-01 | Historical Data Store, Cabinet Health Monitor | Hospital risk management |
| FR-HIS-04 | Display ADC event history (dispensing, status, alarms) | US-HIS-01 | Historical Data Store, Operator Dashboard | Pharmacist; Scenario 4 |
| FR-HIS-05 | Retain audit log 1 year | US-HIS-02 | Historical Data Store | Hospital risk management |
| FR-HIS-06 | Retain generated reports 1 year | US-RPT-07 | Reporting, Historical Data Store | Administrator |
| FR-HIS-07 | Display the audit log | US-HIS-02 | Historical Data Store, Operator Dashboard, User Management / Auth | Hospital risk management |
| FR-HIS-08 | Retain system log entries 1 year | - (verified without a user story, see user-stories.md) | Historical Data Store | Hospital risk management; Hospital IT |
| FR-HIS-09 | Delete data after its retention period | - (verified without a user story, see user-stories.md) | Historical Data Store | Hospital privacy officer; PHIPA |
| FR-RPT-01 | Consumption report over a period | US-RPT-01 | Reporting, Historical Data Store | Pharmacist |
| FR-RPT-02 | Filter consumption report by ADC | US-RPT-02 | Reporting, Historical Data Store | Pharmacist |
| FR-RPT-03 | Filter consumption report by medication | US-RPT-03 | Reporting, Historical Data Store | Pharmacist |
| FR-RPT-04 | Filter consumption report by patient | US-RPT-04 | Reporting, Historical Data Store | Pharmacist |
| FR-RPT-05 | Filter consumption report by staff member | US-RPT-05 | Reporting, Historical Data Store | Administrator |
| FR-RPT-06 | Display alarm report | US-RPT-06 | Reporting, Historical Data Store | Hospital risk management |
| FR-RPT-07 | Export alarm report | US-RPT-06 | Reporting | Administrator |
| FR-RPT-08 | Reopen a generated report | US-RPT-07 | Reporting, Historical Data Store | Administrator |
| FR-DSH-01 | Display each ADC's status | US-HLT-01, US-DSH-01 | Operator Dashboard, Cabinet Health Monitor | Nurse |
| FR-DSH-02 | Filter ADC list by status | US-DSH-02 | Operator Dashboard | Technician; Scenario 1 |
| FR-DSH-03 | Sort ADC list by identifier | US-DSH-02 | Operator Dashboard | Technician |
| FR-HLT-01 | Display reported operational state | US-HLT-01 | Cabinet Health Monitor, Operator Dashboard | Technician |
| FR-HLT-02 | Mark unreachable after 45 s | US-HLT-02 | Cabinet Health Monitor | Technician; Scenario 3 |
| FR-HLT-03 | Mark offline after 75 s | US-HLT-02 | Cabinet Health Monitor | Technician; Scenario 3 |
| FR-HLT-04 | Communication alarm when offline | US-HLT-02 | Cabinet Health Monitor, Alarm Manager, Operator Dashboard | Technician; Scenario 3 |
| FR-HLT-05 | Recover state on heartbeat | US-HLT-03 | Cabinet Health Monitor, ADC Communication Manager | Technician |
| FR-HLT-06 | Registration time as first heartbeat time | US-HLT-02 | Cabinet Health Monitor | Technician; Scenario 3 |
| FR-HLT-07 | Communication loss alarm kept until acknowledged | US-HLT-03 | Alarm Manager | Technician; Hospital risk management |
| FR-REQ-01 | Acknowledge heartbeat with a status per transaction | US-REQ-01, US-ALM-01 | ADC Communication Manager | ADC team (Part A) |
| FR-USR-01 | Authenticate before dashboard access | US-USR-01 | User Management / Auth, Operator Dashboard | Hospital privacy officer |
| FR-USR-02 | Grant functions by role | US-RPT-04, US-RPT-07, US-USR-02 | User Management / Auth | Administrator |
| FR-USR-03 | Create a user account with a role | US-USR-03 | User Management / Auth, Operator Dashboard | Administrator; Hospital privacy officer |
| FR-USR-04 | Change a user's role | US-USR-03 | User Management / Auth, Operator Dashboard | Administrator; Hospital privacy officer |
| FR-USR-05 | Deactivate a user account | US-USR-03 | User Management / Auth, Operator Dashboard | Administrator; Hospital privacy officer |
| NFR-SAF-01 | Label status/inventory stale after 45 s | US-INV-01, US-HLT-02, US-DSH-01 | Cabinet Health Monitor, Operator Dashboard | Patient; Nurse |
| NFR-SAF-02 | No alarm shown acknowledged without user action | US-ALM-02, US-HIS-02 | Alarm Manager, Operator Dashboard | Patient; Nurse |
| NFR-SAF-03 | Never show unreachable/offline ADC as online | US-HLT-01, US-HLT-02 | Cabinet Health Monitor, Operator Dashboard | Patient; Technician |
| NFR-SAF-04 | Repeat audible cue of critical alarm | US-ALM-02 | Alarm Manager, Operator Dashboard, Operator workstation | Patient; Nurse |
| NFR-SEC-01 | Authentication before data display | US-INV-01, US-INV-04, US-USR-01 | User Management / Auth, Operator Dashboard | Hospital privacy officer; PHIPA |
| NFR-SEC-02 | Restrict acknowledgement, commands, configuration by role | US-COM-02, US-COM-03, US-ALM-02, US-USR-02 | User Management / Auth, Operator Dashboard | Hospital risk management |
| NFR-SEC-03 | Discard heartbeats from unregistered ADCs | US-COM-01, US-REQ-01 | ADC Communication Manager, Historical Data Store | ADC team (Part A) |
| NFR-SEC-04 | Patient identifiers (reports, history) for pharmacist/administrator only | US-HIS-01, US-RPT-04 | Reporting, User Management / Auth | Hospital privacy officer; PHIPA |
| NFR-SEC-05 | Encrypted channel with ADCs | - (verified without a user story, see user-stories.md) | ADC Communication Manager, Hospital network | Hospital privacy officer; PHIPA; Hospital IT |
| NFR-REL-01 | Transactions acked "received" retrievable | US-REQ-01, US-HIS-02 | ADC Communication Manager, Historical Data Store | Hospital risk management |
| NFR-REL-02 | < 1 unplanned outage / 1,000 h | - (verified without a user story, see user-stories.md) | Operator Dashboard, User Management / Auth, Inventory Supervisor, Alarm Manager, Cabinet Health Monitor, Reporting, Historical Data Store, ADC Communication Manager | Hospital IT |
| NFR-REL-03 | Displayed inventory matches the latest heartbeat | US-HLT-03 | Inventory Supervisor, ADC Communication Manager | ADC team (Part A); Pharmacist |
| NFR-AVL-01 | Available while ADCs offline | US-HLT-02 | Operator Dashboard, ADC Communication Manager | Nurse |
| NFR-AVL-02 | Keep processing connected ADCs | US-HLT-02 | ADC Communication Manager | Nurse |
| NFR-AVL-03 | 99.5% monthly availability | - (verified without a user story, see user-stories.md) | Operator Dashboard, User Management / Auth, Inventory Supervisor, Alarm Manager, Cabinet Health Monitor, Reporting, Historical Data Store, ADC Communication Manager | Hospital IT |
| NFR-AVL-04 | 30 days without restart | - (verified without a user story, see user-stories.md) | Operator Dashboard, User Management / Auth, Inventory Supervisor, Alarm Manager, Cabinet Health Monitor, Reporting, Historical Data Store, ADC Communication Manager | Hospital IT |
| NFR-AVL-05 | Record own start-ups and shutdowns | - (verified without a user story, see user-stories.md) | Cabinet Health Monitor, Historical Data Store | Hospital IT |
| NFR-PRF-01 | Alarm displayed within 2 s | US-ALM-01, US-HLT-02 | ADC Communication Manager, Alarm Manager, Operator Dashboard | Nurse; Scenario 2 |
| NFR-PRF-02 | NFR-PRF-01 holds with 50 ADCs | US-ALM-01 | ADC Communication Manager, Alarm Manager | Hospital IT |
| NFR-AUD-01 | Log acknowledgements, commands, configs | US-COM-02, US-COM-03, US-ALM-02, US-HIS-02 | Alarm Manager, ADC Communication Manager, Historical Data Store | Hospital risk management |
| NFR-AUD-02 | History cannot be modified | US-HIS-01 | Historical Data Store | Hospital risk management |
| NFR-AUD-03 | History cannot be deleted | US-HIS-01 | Historical Data Store | Hospital risk management |
| NFR-AUD-04 | Log account and role changes | US-USR-03 | User Management / Auth, Historical Data Store | Hospital risk management; Hospital privacy officer |
| NFR-AUD-05 | Log command/configuration outcome | US-COM-02, US-COM-03 | ADC Communication Manager, Historical Data Store | Hospital risk management |
| NFR-AUD-06 | Log display of patient identifiers | US-HIS-01 | Historical Data Store, Reporting, User Management / Auth | Hospital privacy officer; PHIPA |
| NFR-USA-01 | Problem ADCs on main view | US-INV-02, US-DSH-01 | Operator Dashboard | Nurse; Scenario 1 |
| NFR-USA-02 | Same status labels everywhere | US-ALM-01, US-DSH-01 | Operator Dashboard, Reporting | Nurse |
| NFR-USA-03 | Acknowledge alarm in < 15 s | US-ALM-02 | Operator Dashboard | Nurse |
| NFR-ACC-01 | Visual and audible alarm cues | US-ALM-01 | Operator Dashboard, Operator workstation | AODA |
| NFR-ACC-02 | No colour-only information | US-ALM-01 | Operator Dashboard | AODA |
| NFR-ACC-03 | Keyboard-only operation | - (verified without a user story, see user-stories.md) | Operator Dashboard, Operator workstation | AODA |
| NFR-ACC-04 | WCAG 2.0 AA | - (verified without a user story, see user-stories.md) | Operator Dashboard | AODA |
