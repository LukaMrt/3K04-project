# Functional Requirements — Part B (Hospital Monitoring System)

## ADC Communication Management

- **FR1** The system shall allow an ADC to register with the Monitoring System by providing its identifier, contact address and location.
- **FR2** The system shall receive a periodic presence signal (every 30 seconds) (ping/heartbeat) from each registered ADC.
- **FR3** The system shall be able to send a command or configuration information to a specific ADC.
- **FR4** The system shall accept simultaneous connections from a variable number of ADC units (not fixed in advance).

## Inventory Supervision

- **FR5** The system shall receive and store inventory updates sent by each ADC.
- **FR6** The system shall allow an authorized user to view the current inventory of a given ADC.
- **FR7** The system shall identify ADCs where a medication's inventory level falls below a defined threshold.
- **FR8** The system shall find the nearest ADC with inventory available for a given medication to an ADC needing restocking.
- **FR9** The system shall allow an authorized user to view an aggregated inventory across multiple ADCs.

## Alarm Management

- **FR10** The system shall receive alarms sent by an ADC and record them with a timestamp, originating ADC, and alarm type.
- **FR11** The system shall display active alarms to authorized users.
- **FR12** The system shall allow an authorized user to acknowledge an alarm.
- **FR13** The system shall distinguish four alarm severity levels: info, warning, error, and critical.

## Historical Data Management

- **FR14** The system shall retain a history of alarm events received from ADCs for 1 year.
- **FR15** The system shall retain a history of dispensing activity and status changes received from ADCs for 6 months.
- **FR16** The system shall allow an authorized user to view the event history of a given ADC over a specified period.

## Reporting

- **FR17** The system shall allow generating a medication consumption report over a given period, for one or more ADCs, for one or more medications, for one or more patients and for one or more medical staff.
- **FR18** The system shall allow exporting or displaying a report of alarms that occurred over a given period.

## Operator Dashboard

- **FR19** The system shall provide a dashboard displaying the current status of each known ADC, as tracked by cabinet health monitoring.
- **FR20** The system shall allow a user to filter or sort the list of displayed ADCs (e.g., by status, by identifier).
- **FR21** The system shall enforce different dashboard access permissions based on the user's role (nurse, pharmacist, technician, administrator).
- **FR22** The system shall allow a user to view generated reports (with timestamp and settings).

## Cabinet Health Monitoring

- **FR23** The system shall track the operational state of each ADC (online, offline, maintenance, or fault), as reported by the ADC.
- **FR24** The system shall mark an ADC as offline if no ping has been received within a defined interval (75 seconds).
- **FR25** The system shall mark an ADC as temporarily unreachable if no ping has been received within a defined interval (45 seconds).

## Request Handling

- **FR26** The system shall acknowledge each event submitted by an ADC (ping, inventory update, alarm) upon receipt.

## User Management

- **FR27** The system shall authenticate a user before granting dashboard access.
- **FR28** The system shall record the identity of the user who performed a sensitive action (acknowledging an alarm, sending a command to an ADC).
