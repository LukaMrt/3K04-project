# Functional Requirements — Part B (Hospital Monitoring System)

## ADC Communication Management

- The system shall allow an ADC to register with the Monitoring System by providing its identifier, contact address and location.
- The system shall receive a periodic presence signal (every 30 seconds) (ping/heartbeat) from each registered ADC.
- The system shall be able to send a command or configuration information to a specific ADC.
- The system shall accept simultaneous connections from a variable number of ADC units (not fixed in advance).

## Inventory Supervision

- The system shall receive and store inventory updates sent by each ADC.
- The system shall allow an authorized user to view the current inventory of a given ADC.
- The system shall identify ADCs where a medication's inventory level falls below a defined threshold.
- The system shall find the nearest ADC with inventory available for a given medication to an ADC needing restocking.
- The system shall allow an authorized user to view an aggregated inventory across multiple ADCs.

## Alarm Management

- The system shall receive alarms sent by an ADC and record them with a timestamp, originating ADC, and alarm type.
- The system shall display active alarms to authorized users.
- The system shall allow an authorized user to acknowledge an alarm.
- The system shall distinguish four alarm severity levels: info, warning, error, and critical.

## Historical Data Management

- The system shall retain a history of alarms events received from ADCs for 1 year.
- The system shall retain a history of dispensing activity and status change received from ADCs for 6 months.
- The system shall allow an authorized user to view the event history of a given ADC over a specified period.

## Reporting

- The system shall allow generating a medication consumption report over a given period, for one or more ADCs, for one or more medications, for one or more patients and for one or more medical staff.
- The system shall allow exporting or displaying a report of alarms that occurred over a given period.

## Operator Dashboard

- The system shall provide a dashboard displaying the current status of each known ADC, as tracked by cabinet health monitoring.
- The system shall allow a user to filter or sort the list of displayed ADCs (e.g., by status, by identifier).
- The system shall enforce different dashboard access permissions based on the user's role (nurse, pharmacist, technician, administrator).
- The system shall allow a user to view generated reports (with timestamp and settings).

## Cabinet Health Monitoring

- The system shall track the operational state of each ADC (online, offline, maintenance, or fault), as reported by the ADC.
- The system shall detect that an ADC is offline if no ping has been received within a defined interval (75 seconds).
- The system shall detect that an ADC is temporarily unreachable if no ping has been received within a defined interval (45 seconds).

## Request Handling

- The system shall acknowledge each event submitted by an ADC (ping, inventory update, alarm) upon receipt.

## User Management

- The system shall authenticate a user before granting dashboard access.
- The system shall record the identity of the user who performed a sensitive action (acknowledging an alarm, sending a command to an ADC).
