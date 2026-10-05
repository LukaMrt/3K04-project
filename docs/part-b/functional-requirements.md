# Functional Requirements — Part B (Hospital Monitoring System)

## ADC Communication Management (COM)

- **FR-COM-01** The system shall register an ADC that provides its identifier, contact address and location (floor included).
- **FR-COM-02** The system shall reject, and log the rejection of, a registration request whose ADC identifier is already registered.
- **FR-COM-03** The system shall record the reception time of each heartbeat sent by a registered ADC.
- **FR-COM-04** The system shall send a command to a specific registered ADC.
- **FR-COM-05** The system shall send configuration information to a specific registered ADC.
- **FR-COM-06** The system shall mark a command or a configuration as "failed" and notify the sending user when the target ADC has not acknowledged it within 10 seconds of its sending.
- **FR-COM-07** The system shall accept, in each heartbeat of a registered ADC, the ADC's current status, its complete inventory and the transactions (alarms, dispensing activities) the ADC has not yet had acknowledged.
- **FR-COM-08** The system shall not record again a transaction whose identifier has already been received.
- **FR-COM-09** The system shall accept, for each dispensing activity of a heartbeat, its transaction identifier, the identifier of the ADC, the time set by the ADC, the medication, the quantity dispensed (in boxes), the patient identifier and the identifier of the staff member who withdrew it.
- **FR-COM-10** The system shall reject and log a dispensing activity that is missing at least one of the fields listed in FR-COM-09.
- **FR-COM-11** The system shall mark a command or a configuration as "delivered" only when the acknowledgement received carries both its identifier and the identifier of the target ADC.
- **FR-COM-12** The system shall refuse to send a command or a configuration to an ADC marked "offline" and inform the requesting user of the refusal.

## Inventory Supervision (INV)

- **FR-INV-01** The system shall store the complete inventory contained in each heartbeat of a registered ADC.
- **FR-INV-02** The system shall display the current inventory of a selected ADC, with the time of the heartbeat it comes from, to an authorized user.
- **FR-INV-03** The system shall flag an ADC as "low stock" for a medication while the latest inventory of that ADC holds less than 10 boxes of that medication (the low-stock threshold, identical for every medication and every ADC).
- **FR-INV-04** The system shall list, for a flagged medication, the other ADCs located on the same floor that hold more than 10 boxes of that medication.
- **FR-INV-05** The system shall display a "no stock available" message when no other ADC on the same floor holds more than 10 boxes of the flagged medication.
- **FR-INV-06** The system shall display the aggregated quantity of a medication across all registered ADCs to an authorized user.

## Alarm Management (ALM)

- **FR-ALM-01** The system shall record each alarm received from a registered ADC with the timestamp set by the ADC in the alarm message, the originating ADC, the alarm type and the severity.
- **FR-ALM-02** The system shall reject and log an alarm transaction that is missing at least one of the following fields: originating ADC, timestamp, alarm type, severity.
- **FR-ALM-03** The system shall reject and log an alarm transaction whose severity is not one of: info, warning, error, critical.
- **FR-ALM-04** The system shall display all unacknowledged alarms to authorized users.
- **FR-ALM-05** The system shall allow an authorized user to acknowledge an unacknowledged alarm.
- **FR-ALM-06** The system shall reject the acknowledgement of an alarm that is already acknowledged and show the requesting user which user acknowledged it.

## Historical Data Management (HIS)

- **FR-HIS-01** The system shall retain every alarm received from ADCs, and every communication alarm raised by the system, for 1 year.
- **FR-HIS-02** The system shall retain every dispensing activity reported by ADCs for 6 months.
- **FR-HIS-03** The system shall retain every ADC status change (reported state and connectivity status) for 6 months.
- **FR-HIS-04** The system shall display, for a selected ADC and a user-specified date range, its dispensing activities, its status changes, its alarms and their acknowledgements.
- **FR-HIS-05** The system shall retain every audit log entry (NFR-AUD-01, NFR-AUD-04, NFR-AUD-05, NFR-AUD-06) for 1 year.
- **FR-HIS-06** The system shall retain every generated report, with its parameters and generation timestamp, for 1 year.
- **FR-HIS-07** The system shall display the audit log over a user-specified date range, optionally filtered by ADC or by user, to authorized users.
- **FR-HIS-08** The system shall retain every system log entry (rejected registrations, rejected transactions, discarded heartbeats, own start-ups and shutdowns) for 1 year.
- **FR-HIS-09** The system shall delete each stored item within 24 hours after the end of its retention period.

Retention periods run from the date of the event. No user role may modify or delete stored data (NFR-AUD-02, NFR-AUD-03). Only the latest inventory of each ADC is kept (FR-INV-01).

## Reporting (RPT)

- **FR-RPT-01** The system shall generate a medication consumption report over a user-specified date range.
- **FR-RPT-02** The system shall filter a consumption report by ADC.
- **FR-RPT-03** The system shall filter a consumption report by medication.
- **FR-RPT-04** The system shall filter a consumption report by patient.
- **FR-RPT-05** The system shall filter a consumption report by medical staff member.
- **FR-RPT-06** The system shall display a report of the alarms that occurred over a user-specified date range, giving for each alarm its timestamp, ADC, type and severity.
- **FR-RPT-07** The system shall export an alarm report as a downloadable file.
- **FR-RPT-08** The system shall display a previously generated report with the figures it contained at generation time, together with its generation timestamp and parameters.

## Operator Dashboard (DSH)

- **FR-DSH-01** The system shall display the current status of each registered ADC on the dashboard.
- **FR-DSH-02** The system shall filter the displayed ADC list by status.
- **FR-DSH-03** The system shall sort the displayed ADC list by identifier.

## Cabinet Health Monitoring (HLT)

- **FR-HLT-01** The system shall display the operational state (online, maintenance, fault) reported by an ADC that is marked neither "unreachable" nor "offline".
- **FR-HLT-02** The system shall mark an ADC as "unreachable" when no heartbeat has been received from it for 45 seconds or more.
- **FR-HLT-03** The system shall mark an ADC as "offline" when no heartbeat has been received from it for 75 seconds or more, regardless of the last state it reported.
- **FR-HLT-04** The system shall raise a communication alarm, of type "communication loss" and severity "error", when an ADC is marked "offline"; that alarm is recorded, displayed and acknowledged like an alarm received from an ADC.
- **FR-HLT-05** The system shall show an ADC in the operational state reported by its latest heartbeat as soon as that heartbeat is received, whatever its connectivity status (unreachable, offline).
- **FR-HLT-06** The system shall use the registration time of an ADC as its last heartbeat time until its first heartbeat is received.
- **FR-HLT-07** The system shall keep a communication loss alarm unacknowledged when its ADC communicates again, until a user acknowledges it.

## Request Handling (REQ)

- **FR-REQ-01** The system shall acknowledge each heartbeat received from a registered ADC with, for each transaction it contained, the transaction identifier and a status (received, rejected), after the received transactions have been recorded.

## User Management (USR)

- **FR-USR-01** The system shall authenticate a user before granting access to the dashboard.
- **FR-USR-02** The system shall grant each dashboard function only to the roles permitted for it (nurse, pharmacist, technician, administrator, hospital risk management), according to the role-permission matrix of D-14.
- **FR-USR-03** The system shall allow an administrator to create a user account with one role.
- **FR-USR-04** The system shall allow an administrator to change the role of a user account, the new role applying from that user's next login.
- **FR-USR-05** The system shall allow an administrator to deactivate a user account, a deactivated account being refused at authentication.
