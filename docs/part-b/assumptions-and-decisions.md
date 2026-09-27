# Assumptions & Decisions — Part B (Hospital Monitoring System)

## Assumptions

| ID   | Assumption                                                                                                                                                                                  | Source                       | Affects                         |
| ---- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ---------------------------- | ------------------------------- |
| A-01 | Multiple ADC units exist in the hospital.                                                                                                                                                   | part-b.pdf §3.2              | FR-COM-01, NFR-PRF-02           |
| A-02 | ADC units provide communication interfaces to the Monitoring System.                                                                                                                        | part-b.pdf §3.2              | FR-COM-03, FR-COM-07            |
| A-03 | The hospital network infrastructure is available.                                                                                                                                           | part-b.pdf §3.2              | NFR-AVL-03                      |
| A-04 | Every user has a valid account.                                                                                                                                                             | part-b.pdf §3.2              | FR-USR-01                       |
| A-05 | ADCs push their data: each heartbeat, sent at most 30 seconds apart, contains the ADC's status, its complete inventory and its unacknowledged transactions (alarms, dispensing activities). | Team, with ADC team (Part A) | FR-COM-03, FR-COM-07, FR-INV-01 |
| A-06 | An ADC keeps each transaction in memory until the Monitoring System has acknowledged its identifier.                                                                                        | Team, with ADC team (Part A) | FR-REQ-01, NFR-REL-01           |
| A-07 | Transaction identifiers are UUID v4, hence unique across all ADCs.                                                                                                                          | Team                         | FR-COM-08                       |
| A-08 | An ADC sends a heartbeat immediately when it raises an alarm, without waiting for the 30-second period.                                                                                     | Team, with ADC team (Part A) | NFR-PRF-01                      |
| A-09 | Each ADC's location includes its floor.                                                                                                                                                     | Team                         | FR-COM-01, FR-INV-04            |
| A-10 | A low-stock threshold is configured for each medication in each ADC.                                                                                                                        | Team                         | FR-INV-03                       |
| A-11 | Each ADC reports its own operational state (online, maintenance, fault).                                                                                                                    | Team                         | FR-HLT-01                       |
| A-12 | Users of the dashboard are trained before using it.                                                                                                                                         | Team                         | NFR-USA-03                      |

## Decisions

| ID   | Decision                                                                                                                                                                          | Rationale                                                                        | Affects                                                    |
| ---- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| D-01 | An ADC is "unreachable" after 45 s without heartbeat and "offline" after 75 s.                                                                                                    | 1.5 and 2.5 heartbeat periods: one lost heartbeat is tolerated before any alert. | FR-HLT-02, FR-HLT-03, FR-HLT-04                            |
| D-02 | The connectivity status detected by the system overrides the state reported by the ADC.                                                                                           | part-b.pdf §2 lists "treating an offline device as healthy" as a hazard.         | FR-HLT-03, NFR-SAF-03                                      |
| D-03 | Data not updated for more than 45 s is labelled "stale".                                                                                                                          | Aligned with the "unreachable" threshold; honesty about limits.                  | NFR-SAF-01                                                 |
| D-04 | A command or configuration not acknowledged by the ADC within 10 s is marked "failed" and the sender is notified.                                                                 | part-b.pdf §2 lists "assuming that an uncertain command succeeded" as a hazard.  | FR-COM-06                                                  |
| D-05 | Alternative stock is searched among the ADCs of the same floor, not the "nearest" ADC.                                                                                            | Easy to verify, needs no distance map, matches how nurses fetch medication.      | FR-INV-04, FR-INV-05                                       |
| D-06 | Alarms are retained 1 year; dispensing activities and status changes 6 months.                                                                                                    | Incident reviews need a longer alarm history than day-to-day stock analysis.     | FR-HIS-01, FR-HIS-02, FR-HIS-03                            |
| D-07 | Each heartbeat acknowledgement gives, for every transaction, its identifier and a status ("received", "rejected"). A duplicate is acknowledged "received" but not recorded again. | The ADC can free its memory safely and knows when a transaction was refused.     | FR-REQ-01, FR-COM-08, FR-ALM-02                            |
| D-08 | An incomplete alarm (missing ADC, type or severity) is rejected rather than partially displayed.                                                                                  | A partial alarm could be misrouted or misjudged by the nurse.                    | FR-ALM-02                                                  |
| D-09 | Nurses, pharmacists and technicians can acknowledge alarms; administrators cannot.                                                                                                | Acknowledging means someone is physically handling the incident.                 | NFR-SEC-02, FR-ALM-05                                      |
| D-10 | Commands are sent by technicians and administrators; configuration only by administrators.                                                                                        | Least privilege on actions that change a cabinet's behaviour.                    | FR-COM-04, FR-COM-05, FR-USR-02                            |
| D-11 | Patient identifiers in reports are visible only to pharmacists and administrators.                                                                                                | PHIPA: least privilege on personal health information.                           | NFR-SEC-04                                                 |
| D-12 | Quality targets: 99.5 % monthly availability, 30 days without restart, fewer than 1 unplanned outage per 1,000 h, 50 connected ADCs, alarm acknowledged in under 15 s.            | Team estimates for a single hospital, to be confirmed with Hospital IT.          | NFR-AVL-03, NFR-AVL-04, NFR-REL-02, NFR-PRF-02, NFR-USA-03 |

## Ethical and accessibility considerations

| Principle            | Concern in the Monitoring System                                        | Resulting requirements                                                          |
| -------------------- | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| Patient safety       | A lost cabinet or an unseen alarm delays a patient's medication.        | NFR-SAF-01, NFR-SAF-02, NFR-SAF-03, FR-HLT-03, FR-HLT-04, FR-COM-06, NFR-PRF-01 |
| Privacy (PHIPA)      | Consumption reports can expose which patient received which medication. | NFR-SEC-01, NFR-SEC-04                                                          |
| Controlled access    | Anyone could acknowledge an alarm or send a command to a cabinet.       | FR-USR-01, FR-USR-02, NFR-SEC-02, NFR-SEC-03                                    |
| Accountability       | Nobody knows who acknowledged an alarm or sent a command.               | NFR-AUD-01, NFR-AUD-02, NFR-AUD-03, FR-HIS-01                                   |
| Accessibility (AODA) | Colour-only or visual-only alarms exclude some users.                   | NFR-ACC-01, NFR-ACC-02                                                          |
| Honesty about limits | The dashboard shows old data as if it were current.                     | NFR-SAF-01, NFR-SAF-03                                                          |

## Open points (to agree with the ADC team, Part A — issue #7)

| ID   | Open point                                                                                       | Related                                    |
| ---- | ------------------------------------------------------------------------------------------------ | ------------------------------------------ |
| O-01 | Exact format of the heartbeat, the acknowledgement, the commands and the configuration messages. | FR-COM-04, FR-COM-05, FR-COM-07, FR-REQ-01 |
| O-02 | Acknowledgement with a status per transaction ("received", "rejected").                          | D-07                                       |
| O-03 | ADC memory capacity and behaviour when it is full during a long outage.                          | A-06                                       |
| O-04 | Immediate heartbeat when the ADC raises an alarm.                                                | A-08                                       |
