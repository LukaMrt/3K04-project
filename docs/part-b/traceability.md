# Traceability — Part B (Hospital Monitoring System)

| Req ID     | Requirement (short)                                   | Story                                      | Component | Stakeholder / source             |
| ---------- | ----------------------------------------------------- | ------------------------------------------ | --------- | -------------------------------- |
| FR-COM-01  | Register an ADC                                       | US-COM-01                                  |           | ADC team (Part A); Administrator |
| FR-COM-02  | Reject duplicate ADC identifier                       | US-COM-01                                  |           | Administrator                    |
| FR-COM-03  | Record heartbeat reception time                       | US-HLT-01                                  |           | Technician; Scenario 3           |
| FR-COM-04  | Send a command to an ADC                              | US-COM-02                                  |           | Technician                       |
| FR-COM-05  | Send configuration to an ADC                          | US-COM-03                                  |           | Administrator                    |
| FR-COM-06  | Mark unacknowledged command as failed (10 s)          | US-COM-02, US-COM-03                       |           | Technician                       |
| FR-INV-01  | Store inventory updates                               | US-INV-01                                  |           | Pharmacist                       |
| FR-INV-02  | Display a cabinet's inventory                         | US-INV-01                                  |           | Pharmacist; Scenario 1           |
| FR-INV-03  | Flag low stock below threshold                        | US-INV-02                                  |           | Pharmacist; Scenario 1           |
| FR-INV-04  | List same-floor ADCs with stock                       | US-INV-03                                  |           | Pharmacist; Scenario 1           |
| FR-INV-05  | "No stock available" message                          | US-INV-03                                  |           | Pharmacist                       |
| FR-INV-06  | Aggregated stock across ADCs                          | US-INV-04                                  |           | Pharmacist; Scenario 1           |
| FR-ALM-01  | Record received alarms                                | US-ALM-01                                  |           | Nurse; Scenario 2                |
| FR-ALM-02  | Reject incomplete alarm messages                      | US-ALM-01                                  |           | ADC team (Part A)                |
| FR-ALM-03  | Four alarm severity levels                            | US-ALM-01                                  |           | Nurse                            |
| FR-ALM-04  | Display unacknowledged alarms                         | US-ALM-01                                  |           | Nurse; Scenario 2                |
| FR-ALM-05  | Acknowledge an alarm                                  | US-ALM-02                                  |           | Nurse; Technician                |
| FR-ALM-06  | Reject re-acknowledgement                             | US-ALM-02                                  |           | Nurse                            |
| FR-HIS-01  | Retain alarms 1 year                                  | US-HIS-02                                  |           | Hospital risk management         |
| FR-HIS-02  | Retain dispensing activity 6 months                   | US-HIS-01                                  |           | Pharmacist; Scenario 4           |
| FR-HIS-03  | Retain status changes 6 months                        | US-HIS-01                                  |           | Hospital risk management         |
| FR-HIS-04  | Display ADC event history                             | US-HIS-01                                  |           | Pharmacist; Scenario 4           |
| FR-RPT-01  | Consumption report over a period                      | US-RPT-01                                  |           | Pharmacist                       |
| FR-RPT-02  | Filter consumption report by ADC                      | US-RPT-02                                  |           | Pharmacist                       |
| FR-RPT-03  | Filter consumption report by medication               | US-RPT-03                                  |           | Pharmacist                       |
| FR-RPT-04  | Filter consumption report by patient                  | US-RPT-04                                  |           | Pharmacist                       |
| FR-RPT-05  | Filter consumption report by staff member             | US-RPT-05                                  |           | Administrator                    |
| FR-RPT-06  | Display alarm report                                  | US-RPT-06                                  |           | Hospital risk management         |
| FR-RPT-07  | Export alarm report                                   | US-RPT-06                                  |           | Administrator                    |
| FR-RPT-08  | Reopen a generated report                             | US-RPT-07                                  |           | Administrator                    |
| FR-DSH-01  | Display each ADC's status                             | US-HLT-01, US-DSH-01                       |           | Nurse                            |
| FR-DSH-02  | Filter ADC list by status                             | US-DSH-02                                  |           | Technician; Scenario 1           |
| FR-DSH-03  | Sort ADC list by identifier                           | US-DSH-02                                  |           | Technician                       |
| FR-HLT-01  | Display reported operational state                    | US-HLT-01                                  |           | Technician                       |
| FR-HLT-02  | Mark unreachable after 45 s                           | US-HLT-02                                  |           | Technician; Scenario 3           |
| FR-HLT-03  | Mark offline after 75 s                               | US-HLT-02                                  |           | Technician; Scenario 3           |
| FR-HLT-04  | Communication alert when offline                      | US-HLT-02                                  |           | Technician; Scenario 3           |
| FR-HLT-05  | Recover state on heartbeat                            | US-HLT-03                                  |           | Technician                       |
| FR-REQ-01  | Acknowledge each ADC event                            | US-REQ-01                                  |           | ADC team (Part A)                |
| FR-USR-01  | Authenticate before dashboard access                  | US-USR-01                                  |           | Hospital privacy officer         |
| FR-USR-02  | Grant functions by role                               | US-USR-02                                  |           | Administrator                    |
| NFR-SAF-01 | Label status stale after 45 s                         | US-INV-01, US-HLT-02, US-DSH-01            |           | Patient; Nurse                   |
| NFR-SAF-02 | No alarm shown acknowledged without user action       | US-ALM-02, US-HIS-02                       |           | Patient; Nurse                   |
| NFR-SAF-03 | Never show unreachable/offline ADC as online          | US-HLT-01, US-HLT-02                       |           | Patient; Technician              |
| NFR-SEC-01 | Authentication before data display                    | US-INV-01, US-INV-04, US-USR-01            |           | Hospital privacy officer; PHIPA  |
| NFR-SEC-02 | Restrict acknowledgement and commands by role         | US-COM-02, US-ALM-02, US-USR-02            |           | Hospital risk management         |
| NFR-SEC-03 | Discard events from unregistered ADCs                 | US-COM-01, US-REQ-01                       |           | ADC team (Part A)                |
| NFR-SEC-04 | Patient identifiers for pharmacist/administrator only | US-RPT-04, US-RPT-05, US-RPT-07            |           | Hospital privacy officer; PHIPA  |
| NFR-REL-01 | Acknowledged events retrievable                       | US-REQ-01, US-HIS-02                       |           | Hospital risk management         |
| NFR-REL-02 | < 1 unplanned outage / 1,000 h                        | — (internal NFR)                           |           | Hospital IT                      |
| NFR-AVL-01 | Available while ADCs offline                          | US-HLT-02                                  |           | Nurse                            |
| NFR-AVL-02 | Keep processing connected ADCs                        | US-HLT-02                                  |           | Nurse                            |
| NFR-AVL-03 | 99.5% monthly availability                            | — (internal NFR)                           |           | Hospital IT                      |
| NFR-AVL-04 | 30 days without restart                               | — (internal NFR)                           |           | Hospital IT                      |
| NFR-PRF-01 | Alarm displayed within 2 s                            | US-ALM-01                                  |           | Nurse; Scenario 2                |
| NFR-PRF-02 | NFR-PRF-01 holds with 50 ADCs                         | US-ALM-01                                  |           | Hospital IT                      |
| NFR-AUD-01 | Log acknowledgements and commands                     | US-COM-02, US-COM-03, US-ALM-02, US-HIS-02 |           | Hospital risk management         |
| NFR-AUD-02 | History cannot be modified                            | US-HIS-01                                  |           | Hospital risk management         |
| NFR-AUD-03 | History cannot be deleted                             | US-HIS-01                                  |           | Hospital risk management         |
| NFR-USA-01 | Problem ADCs on main view                             | US-INV-02, US-DSH-01                       |           | Nurse; Scenario 1                |
| NFR-USA-02 | Same status labels everywhere                         | US-DSH-01                                  |           | Nurse                            |
| NFR-USA-03 | Acknowledge alarm in < 15 s                           | US-ALM-02                                  |           | Nurse                            |
| NFR-ACC-01 | Visual and audible alarm cues                         | US-ALM-01                                  |           | AODA                             |
| NFR-ACC-02 | No colour-only information                            | US-ALM-01                                  |           | AODA                             |
