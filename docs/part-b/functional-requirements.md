# Functional Requirements — Part B (Hospital Monitoring System)

## ADC Communication Management (COM)

- **FR-COM-01** The system shall register an ADC that provides its identifier, contact address and location (floor included).
- **FR-COM-02** The system shall reject a registration request whose ADC identifier is already registered.
- **FR-COM-03** The system shall record the reception time of each heartbeat sent by a registered ADC, heartbeats being expected at most 30 seconds apart.
- **FR-COM-04** The system shall send a command to a specific registered ADC.
- **FR-COM-05** The system shall send configuration information to a specific registered ADC.
- **FR-COM-06** The system shall mark a command as "failed" and notify the sending user when the target ADC has not acknowledged it within 10 seconds.
- **FR-COM-07** The system shall accept, in each heartbeat of a registered ADC, the ADC's current status, its complete inventory and the transactions (alarms, dispensing activities) the ADC has not yet had acknowledged.
- **FR-COM-08** The system shall ignore a transaction whose identifier has already been received.

## Inventory Supervision (INV)

- **FR-INV-01** The system shall store the complete inventory contained in each heartbeat of a registered ADC.
- **FR-INV-02** The system shall display the current inventory of a selected ADC to an authorized user.
- **FR-INV-03** The system shall flag an ADC as "Low Stock" for a medication when that medication's quantity falls below the threshold configured for that ADC.
- **FR-INV-04** The system shall list, for a flagged medication, the other ADCs located on the same floor whose stock of that medication is above their threshold.
- **FR-INV-05** The system shall display a "no stock available" message when no other ADC on the same floor has the flagged medication above its threshold.
- **FR-INV-06** The system shall display the aggregated quantity of a medication across all registered ADCs to an authorized user.

## Alarm Management (ALM)

- **FR-ALM-01** The system shall record each alarm received from a registered ADC with its timestamp, originating ADC, alarm type and severity.
- **FR-ALM-02** The system shall reject and log an alarm transaction that is missing at least one of the following fields: originating ADC, alarm type, severity.
- **FR-ALM-03** The system shall assign each alarm one of four severity levels: info, warning, error, critical.
- **FR-ALM-04** The system shall display all unacknowledged alarms to authorized users.
- **FR-ALM-05** The system shall allow an authorized user to acknowledge an active alarm.
- **FR-ALM-06** The system shall reject the acknowledgement of an alarm that is already acknowledged and inform the user who acknowledged it.

## Historical Data Management (HIS)

- **FR-HIS-01** The system shall retain every alarm received from ADCs for 1 year.
- **FR-HIS-02** The system shall retain every dispensing activity reported by ADCs for 6 months.
- **FR-HIS-03** The system shall retain every ADC status change for 6 months.
- **FR-HIS-04** The system shall display the event history of a selected ADC over a user-specified date range.

## Reporting (RPT)

- **FR-RPT-01** The system shall generate a medication consumption report over a user-specified date range.
- **FR-RPT-02** The system shall filter a consumption report by ADC.
- **FR-RPT-03** The system shall filter a consumption report by medication.
- **FR-RPT-04** The system shall filter a consumption report by patient.
- **FR-RPT-05** The system shall filter a consumption report by medical staff member.
- **FR-RPT-06** The system shall display a report of the alarms that occurred over a user-specified date range.
- **FR-RPT-07** The system shall export an alarm report as a downloadable file.
- **FR-RPT-08** The system shall display a previously generated report together with its generation timestamp and parameters.

## Operator Dashboard (DSH)

- **FR-DSH-01** The system shall display the current status of each registered ADC on the dashboard.
- **FR-DSH-02** The system shall filter the displayed ADC list by status.
- **FR-DSH-03** The system shall sort the displayed ADC list by identifier.

## Cabinet Health Monitoring (HLT)

- **FR-HLT-01** The system shall display the operational state reported by a reachable ADC (online, maintenance, fault).
- **FR-HLT-02** The system shall mark an ADC as "unreachable" when no heartbeat has been received from it for 45 seconds.
- **FR-HLT-03** The system shall mark an ADC as "offline" when no heartbeat has been received from it for 75 seconds, regardless of the last state it reported.
- **FR-HLT-04** The system shall raise a communication alert when an ADC is marked "offline".
- **FR-HLT-05** The system shall return an ADC to its last reported operational state as soon as a heartbeat is received from it, whatever its connectivity status (unreachable, offline).

## Request Handling (REQ)

- **FR-REQ-01** The system shall acknowledge each heartbeat received from a registered ADC with the list of transaction identifiers it contained.

## User Management (USR)

- **FR-USR-01** The system shall authenticate a user before granting access to the dashboard.
- **FR-USR-02** The system shall grant each dashboard function only to the roles permitted for it (nurse, pharmacist, technician, administrator).
