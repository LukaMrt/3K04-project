# User Stories & Acceptance Criteria — Part B (Hospital Monitoring System)

## Theme: ADC Communication (COM)

### US-COM-01 — Register a new cabinet
**Traces to:** FR-COM-01, FR-COM-02, NFR-SEC-03

**As an** Administrator, **I want** a newly installed ADC to join the monitoring system with its identifier and location **so that** its stock and alarms are visible from the first day it is used on the ward.

**Scenario 1 — Registration (normal)**
- **GIVEN** no ADC with identifier "ADC-101" is registered
- **WHEN** ADC-101 requests registration with contact address "10.0.3.50" and location "Floor 3 – ICU"
- **THEN** ADC-101 appears in the dashboard's cabinet list with location "Floor 3 – ICU"

**Scenario 2 — Duplicate identifier (off-normal)**
- **GIVEN** ADC-101 is already registered at "Floor 3 – ICU"
- **WHEN** another device requests registration with identifier "ADC-101"
- **THEN** the registration is rejected and the rejection is logged
- **AND** the existing ADC-101 entry is unchanged

**Scenario 3 — Unregistered device (off-normal)**
- **GIVEN** no ADC with identifier "ADC-999" is registered
- **WHEN** ADC-999 sends an inventory update
- **THEN** the update is discarded and the discard is logged
- **AND** no inventory for ADC-999 appears on the dashboard

### US-COM-02 — Send a command to a cabinet
**Traces to:** FR-COM-04, FR-COM-06, NFR-SEC-02, NFR-AUD-01

**As a** Technician, **I want** to send a command to a specific cabinet **so that** I can put a faulty cabinet into maintenance mode without walking to the ward.

**Scenario 1 — Command delivered (normal)**
- **GIVEN** ADC-205 is online and the Technician is logged in
- **WHEN** the Technician sends a "maintenance mode" command to ADC-205
- **AND** ADC-205 acknowledges it within 10 seconds
- **THEN** the command is shown as "delivered"
- **AND** the audit log records the Technician's user ID, the command, ADC-205 and the time

**Scenario 2 — No acknowledgement (off-normal)**
- **GIVEN** the Technician has sent a command to ADC-205
- **WHEN** 10 seconds elapse without an acknowledgement from ADC-205
- **THEN** the command is shown as "failed"
- **AND** the Technician receives a notification that the command failed

**Scenario 3 — Role not permitted (off-normal)**
- **GIVEN** a user logged in with the Nurse role
- **WHEN** the user attempts to send a command to ADC-205
- **THEN** the system refuses with a permission message
- **AND** no command is sent to ADC-205

### US-COM-03 — Push configuration to a cabinet
**Traces to:** FR-COM-05, FR-COM-06, NFR-AUD-01

**As an** Administrator, **I want** to send configuration information to a specific cabinet **so that** cabinet settings stay aligned with hospital policy without an on-site visit.

**Scenario 1 — Configuration delivered (normal)**
- **GIVEN** ADC-205 is online
- **WHEN** the Administrator sends a configuration to ADC-205
- **AND** ADC-205 acknowledges it within 10 seconds
- **THEN** the configuration is shown as "delivered"
- **AND** the audit log records the Administrator's user ID, the action, ADC-205 and the time

**Scenario 2 — No acknowledgement (off-normal)**
- **GIVEN** the Administrator has sent a configuration to ADC-205
- **WHEN** 10 seconds elapse without an acknowledgement
- **THEN** the configuration is shown as "failed" and the Administrator is notified

**Scenario 3 — Target offline (off-normal)**
- **GIVEN** ADC-205 is marked "offline"
- **WHEN** the Administrator sends a configuration to ADC-205
- **THEN** after 10 seconds the configuration is shown as "failed"
- **BUT** ADC-205 is never shown as having received it

## Theme: Request Handling (REQ)

### US-REQ-01 — Confirm event delivery to the cabinet
**Traces to:** FR-REQ-01, NFR-REL-01, NFR-SEC-03

**As the** ADC team (Part A), **I want** every event our cabinet sends to be acknowledged **so that** the cabinet knows when it can stop retrying a transmission.

**Scenario 1 — Event acknowledged (normal)**
- **GIVEN** ADC-101 is registered
- **WHEN** ADC-101 sends an alarm event
- **THEN** the system returns an acknowledgement referencing that event to ADC-101

**Scenario 2 — Acknowledged event is kept (normal)**
- **GIVEN** the system has acknowledged an inventory update from ADC-101
- **WHEN** a Pharmacist views the event history of ADC-101
- **THEN** that inventory update appears in the history

**Scenario 3 — Unregistered sender (off-normal)**
- **GIVEN** ADC-999 is not registered
- **WHEN** ADC-999 sends a heartbeat
- **THEN** no acknowledgement is returned and the heartbeat is logged as discarded

## Theme: Inventory Supervision (INV)

### US-INV-01 — Check a cabinet's current stock
**Traces to:** FR-INV-01, FR-INV-02, NFR-SEC-01, NFR-SAF-01

**As a** Pharmacist, **I want** to see the current stock of a specific cabinet **so that** I can prepare the right restock before my round of that ward.

**Scenario 1 — Up-to-date stock (normal)**
- **GIVEN** ADC-202 reported Morphine 10 units at 09:00:00
- **WHEN** the Pharmacist views the inventory of ADC-202 at 09:00:20
- **THEN** Morphine is shown with 10 units and the update time 09:00:00

**Scenario 2 — Stale data (off-normal)**
- **GIVEN** ADC-202's status has not been updated for 60 seconds
- **WHEN** the Pharmacist views the inventory of ADC-202
- **THEN** the inventory is labelled "stale" with its last-update time

**Scenario 3 — Not logged in (off-normal)**
- **GIVEN** a user who is not authenticated
- **WHEN** the user requests the inventory of ADC-202
- **THEN** access is denied and no inventory data is displayed

### US-INV-02 — Be told which cabinets run low
**Traces to:** FR-INV-03, NFR-USA-01

**As a** Pharmacist, **I want** cabinets to be flagged when a medication falls below its threshold **so that** I can restock them before a nurse finds an empty drawer.

**Scenario 1 — Below threshold (normal)**
- **GIVEN** the Insulin threshold of ADC-101 is 5 units
- **WHEN** ADC-101 reports Insulin at 4 units
- **THEN** ADC-101 is flagged "Low Stock" for Insulin
- **AND** ADC-101 appears on the dashboard's main view without further navigation

**Scenario 2 — Exactly at threshold (normal, boundary)**
- **GIVEN** the Insulin threshold of ADC-101 is 5 units
- **WHEN** ADC-101 reports Insulin at 5 units
- **THEN** ADC-101 is not flagged "Low Stock" for Insulin

**Scenario 3 — Flagged cabinet goes offline (off-normal)**
- **GIVEN** ADC-101 is flagged "Low Stock" for Insulin
- **WHEN** ADC-101 is marked "offline"
- **THEN** ADC-101 stays on the dashboard's main view with both the "Low Stock" flag and the "OFFLINE" status

### US-INV-03 — Find the medication on the same floor
**Traces to:** FR-INV-04, FR-INV-05

**As a** Pharmacist, **I want** to know which other cabinets on the same floor still hold a medication that is running low **so that** a nurse can fetch it nearby instead of waiting for a pharmacy delivery.

**Scenario 1 — Stock available on the floor (normal)**
- **GIVEN** ADC-101 (Floor 3) is flagged "Low Stock" for Heparin
- **AND** ADC-102 (Floor 3) holds 20 units of Heparin, above its threshold
- **AND** ADC-305 (Floor 5) holds 30 units of Heparin, above its threshold
- **WHEN** the Pharmacist requests other sources of Heparin for ADC-101
- **THEN** the list shows ADC-102 only

**Scenario 2 — Other cabinet below its own threshold (normal)**
- **GIVEN** ADC-103 (Floor 3) holds Heparin below its own threshold
- **WHEN** the Pharmacist requests other sources of Heparin for ADC-101
- **THEN** ADC-103 is not listed

**Scenario 3 — Nothing on the floor (off-normal)**
- **GIVEN** no other Floor 3 cabinet holds Heparin above its threshold
- **WHEN** the Pharmacist requests other sources of Heparin for ADC-101
- **THEN** a "no stock available" message is displayed

### US-INV-04 — See hospital-wide stock of a medication
**Traces to:** FR-INV-06, NFR-SEC-01

**As a** Pharmacist, **I want** the total quantity of a medication across all cabinets **so that** I can decide when to order more from the supplier.

**Scenario 1 — Total across cabinets (normal)**
- **GIVEN** 5 cabinets hold respectively 4, 6, 10, 0 and 12 units of Ativan
- **WHEN** the Pharmacist requests the aggregated inventory for Ativan
- **THEN** a total of 32 units is displayed

**Scenario 2 — Medication stocked nowhere (off-normal)**
- **GIVEN** no cabinet holds Ketamine
- **WHEN** the Pharmacist requests the aggregated inventory for Ketamine
- **THEN** a total of 0 units is displayed

**Scenario 3 — Not logged in (off-normal)**
- **GIVEN** a user who is not authenticated
- **WHEN** the user requests the aggregated inventory
- **THEN** access is denied and no inventory data is displayed

## Theme: Alarm Management (ALM)

### US-ALM-01 — See cabinet alarms as soon as they happen
**Traces to:** FR-ALM-01, FR-ALM-02, FR-ALM-03, FR-ALM-04, NFR-PRF-01, NFR-PRF-02, NFR-ACC-01, NFR-ACC-02

**As a** Nurse, **I want** to see every alarm raised by a cabinet with its severity **so that** I can go to the cabinet before a patient misses a dose.

**Scenario 1 — Alarm reaches the dashboard (normal)**
- **GIVEN** ADC-101 is online
- **WHEN** ADC-101 raises a "tamper" alarm of severity critical at 10:00:00
- **THEN** the dashboard shows "Tamper – ADC-101 – CRITICAL" before 10:00:02
- **AND** the alarm is presented with both a visual cue and an audible cue
- **AND** the severity is shown as a text label, not only as a colour

**Scenario 2 — Incomplete alarm (off-normal)**
- **GIVEN** ADC-101 is online
- **WHEN** ADC-101 sends an alarm message with no severity
- **THEN** the message is rejected and logged
- **AND** no alarm is displayed on the dashboard

**Scenario 3 — Many cabinets connected (normal, load)**
- **GIVEN** 50 ADCs are connected
- **WHEN** one of them raises an alarm
- **THEN** the alarm is displayed on the dashboard within 2 seconds

### US-ALM-02 — Acknowledge an alarm
**Traces to:** FR-ALM-05, FR-ALM-06, NFR-SEC-02, NFR-SAF-02, NFR-AUD-01, NFR-USA-03

**As a** Nurse, **I want** to acknowledge an alarm **so that** my colleagues know someone is already handling it and nobody goes twice.

**Scenario 1 — Acknowledgement (normal)**
- **GIVEN** an unacknowledged critical alarm for ADC-101 is displayed
- **WHEN** a Nurse acknowledges it
- **THEN** the alarm is marked "acknowledged" with the Nurse's user ID
- **AND** the audit log records the Nurse's user ID, the action, ADC-101 and the time
- **AND** a trained Nurse completes the acknowledgement in under 15 seconds from the alarm's appearance

**Scenario 2 — Already acknowledged (off-normal)**
- **GIVEN** the alarm for ADC-101 was acknowledged by Nurse A
- **WHEN** Nurse B attempts to acknowledge it
- **THEN** Nurse B is shown a message naming Nurse A as the acknowledging user
- **AND** the alarm's acknowledgement remains attributed to Nurse A

**Scenario 3 — Role not permitted (off-normal)**
- **GIVEN** a user logged in with the Administrator role
- **WHEN** the user attempts to acknowledge the alarm
- **THEN** the system refuses with a permission message and the alarm stays unacknowledged

**Scenario 4 — Nobody acknowledges (off-normal)**
- **GIVEN** an alarm has been displayed for 10 minutes without any acknowledgement
- **WHEN** any user views the alarm list
- **THEN** the alarm is still shown as unacknowledged

## Theme: Cabinet Health Monitoring (HLT)

### US-HLT-01 — See each cabinet's state
**Traces to:** FR-COM-03, FR-HLT-01, FR-DSH-01, NFR-SAF-03

**As a** Technician, **I want** to see the state each cabinet reports and when it last communicated **so that** I know which cabinets need a visit.

**Scenario 1 — Reported state (normal)**
- **GIVEN** ADC-101 sends heartbeats every 30 seconds
- **WHEN** ADC-101 reports the state "maintenance"
- **THEN** the dashboard shows ADC-101 as "MAINTENANCE" with the time of its last heartbeat

**Scenario 2 — Heartbeat received (normal)**
- **GIVEN** ADC-101's last heartbeat was at 12:00:00
- **WHEN** a new heartbeat arrives at 12:00:30
- **THEN** the last-heartbeat time of ADC-101 shows 12:00:30

**Scenario 3 — Reported "online" but silent (off-normal)**
- **GIVEN** ADC-101 last reported "online" and its last heartbeat was 50 seconds ago
- **WHEN** the Technician views the dashboard
- **THEN** ADC-101 is shown as "UNREACHABLE", never as "ONLINE"

### US-HLT-02 — Detect a cabinet that stops communicating
**Traces to:** FR-HLT-02, FR-HLT-03, FR-HLT-04, NFR-SAF-01, NFR-SAF-03, NFR-AVL-01, NFR-AVL-02

**As a** Technician, **I want** to be alerted when a cabinet stops communicating **so that** I can restore the connection before nurses need that cabinet.

**Scenario 1 — Unreachable (normal)**
- **GIVEN** ADC-101's last heartbeat was at 12:00:00
- **WHEN** it is 12:00:45 and no new heartbeat has arrived
- **THEN** ADC-101 is shown as "UNREACHABLE" and labelled "stale" with its last-update time

**Scenario 2 — Offline (off-normal)**
- **GIVEN** ADC-101's last heartbeat was at 12:00:00
- **WHEN** it is 12:01:15 and no new heartbeat has arrived
- **THEN** ADC-101 is shown as "OFFLINE"
- **AND** a communication alert for ADC-101 is raised on the dashboard

**Scenario 3 — Offline overrides the reported state (off-normal)**
- **GIVEN** ADC-101 last reported "maintenance"
- **WHEN** 75 seconds elapse without a heartbeat
- **THEN** ADC-101 is shown as "OFFLINE", not "MAINTENANCE"

**Scenario 4 — Other cabinets unaffected (off-normal)**
- **GIVEN** ADC-101 is "OFFLINE" and ADC-102 is online
- **WHEN** ADC-102 raises an alarm
- **THEN** the alarm from ADC-102 is displayed within 2 seconds
- **AND** the dashboard remains accessible to logged-in users

### US-HLT-03 — Know when a cabinet is back
**Traces to:** FR-HLT-05

**As a** Technician, **I want** a cabinet to return to its normal state as soon as it communicates again **so that** I do not travel to fix a cabinet that has already recovered.

**Scenario 1 — Back from offline (normal)**
- **GIVEN** ADC-101 is "OFFLINE" and last reported "online"
- **WHEN** a heartbeat from ADC-101 is received
- **THEN** ADC-101 is shown as "ONLINE" and the "stale" label is removed

**Scenario 2 — Back before going offline (normal)**
- **GIVEN** ADC-101 is "UNREACHABLE" since 12:00:45
- **WHEN** a heartbeat arrives at 12:01:00
- **THEN** ADC-101 is shown as "ONLINE" and is never shown as "OFFLINE"

**Scenario 3 — Back but in fault (off-normal)**
- **GIVEN** ADC-101 is "OFFLINE"
- **WHEN** ADC-101 sends a heartbeat reporting the state "fault"
- **THEN** ADC-101 is shown as "FAULT", not "ONLINE"

## Theme: Operator Dashboard (DSH)

### US-DSH-01 — Spot cabinets needing attention first
**Traces to:** FR-DSH-01, NFR-USA-01, NFR-USA-02, NFR-SAF-01

**As a** Nurse, **I want** the cabinets that need attention to stand out when I open the dashboard **so that** I do not miss a problem while caring for patients.

**Scenario 1 — Problems on the main view (normal)**
- **GIVEN** ADC-101 is "OFFLINE", ADC-102 is flagged "Low Stock" and ADC-103 has no issue
- **WHEN** the Nurse opens the dashboard
- **THEN** ADC-101 and ADC-102 are visible on the main view without further navigation

**Scenario 2 — Same label everywhere (normal)**
- **GIVEN** ADC-101 is "OFFLINE"
- **WHEN** ADC-101 appears on the dashboard, in an alarm report and in its event history
- **THEN** its status is labelled "OFFLINE" in all three views

**Scenario 3 — Outdated status (off-normal)**
- **GIVEN** ADC-104's status has not been updated for 60 seconds
- **WHEN** the Nurse opens the dashboard
- **THEN** ADC-104 is labelled "stale" with its last-update time

### US-DSH-02 — Narrow down the cabinet list
**Traces to:** FR-DSH-02, FR-DSH-03

**As a** Technician, **I want** to filter and sort the cabinet list **so that** I can plan my rounds among dozens of cabinets.

**Scenario 1 — Filter by status (normal)**
- **GIVEN** 3 ADCs are "OFFLINE" and 20 are online
- **WHEN** the Technician filters the list on status "OFFLINE"
- **THEN** only the 3 offline ADCs are displayed

**Scenario 2 — Sort by identifier (normal)**
- **GIVEN** ADC-205, ADC-101 and ADC-150 are registered
- **WHEN** the Technician sorts the list by identifier
- **THEN** the list shows ADC-101, ADC-150, ADC-205 in that order

**Scenario 3 — No match (off-normal)**
- **GIVEN** no ADC is in state "fault"
- **WHEN** the Technician filters the list on status "FAULT"
- **THEN** an empty list is displayed with a message stating that no cabinet matches

## Theme: Historical Data Management (HIS)

### US-HIS-01 — Review a cabinet's past activity
**Traces to:** FR-HIS-02, FR-HIS-03, FR-HIS-04, NFR-AUD-02, NFR-AUD-03

**As a** Pharmacist, **I want** to review a cabinet's past dispensing activity and status changes **so that** I can explain a stock discrepancy found during an inventory count.

**Scenario 1 — History over a range (normal)**
- **GIVEN** ADC-101 recorded dispensing activity and status changes between 1 and 15 September
- **WHEN** the Pharmacist requests the history of ADC-101 from 1 to 15 September
- **THEN** all dispensing activities and status changes of that period are displayed

**Scenario 2 — Invalid range (off-normal)**
- **GIVEN** the Pharmacist enters an end date earlier than the start date
- **WHEN** the Pharmacist requests the history
- **THEN** an "invalid date range" message is displayed and no history is shown

**Scenario 3 — No data (off-normal)**
- **GIVEN** ADC-101 recorded no event between 1 and 3 August
- **WHEN** the Pharmacist requests the history of ADC-101 for that range
- **THEN** a "no data found" message is displayed

**Scenario 4 — Attempt to alter history (off-normal)**
- **GIVEN** a history entry is displayed
- **WHEN** any user attempts to modify or delete it
- **THEN** the system refuses and the entry is unchanged

### US-HIS-02 — Reconstruct an incident
**Traces to:** FR-HIS-01, NFR-AUD-01, NFR-REL-01, NFR-SAF-02

**As** Hospital risk management, **I want** the alarms of the past year and the actions taken on them **so that** we can reconstruct what happened during an incident review.

**Scenario 1 — Year-old alarm (normal)**
- **GIVEN** an alarm was raised by ADC-101 300 days ago and acknowledged by a Nurse
- **WHEN** Hospital risk management requests alarms for that date
- **THEN** the alarm is shown with its timestamp, severity and the acknowledging user ID

**Scenario 2 — Command trace (normal)**
- **GIVEN** a Technician sent a command to ADC-205 last month
- **WHEN** Hospital risk management consults the audit log for ADC-205
- **THEN** the entry shows the Technician's user ID, the command, ADC-205 and the time

**Scenario 3 — Never acknowledged (off-normal)**
- **GIVEN** an alarm raised 30 days ago was never acknowledged
- **WHEN** Hospital risk management consults it
- **THEN** it is shown as "unacknowledged"

## Theme: Reporting (RPT)

### Epic EP-RPT-01 — Medication consumption reports
**As a** Pharmacist, **I want** medication consumption reports **so that** I can manage hospital stock and detect abnormal use.
Split into US-RPT-01 to US-RPT-05 below (one story per report criterion).

### US-RPT-01 — Consumption over a period
**Traces to:** FR-RPT-01

**As a** Pharmacist, **I want** a consumption report over a chosen period **so that** I can compare usage from one month to the next.

**Scenario 1 — Report generated (normal)**
- **GIVEN** 120 units of medication were dispensed in September
- **WHEN** the Pharmacist generates a consumption report from 1 to 30 September
- **THEN** the report shows a total of 120 units dispensed

**Scenario 2 — Empty period (off-normal)**
- **GIVEN** no dispensing occurred on 25 December
- **WHEN** the Pharmacist generates a report for 25 December
- **THEN** the report shows 0 units dispensed

**Scenario 3 — Invalid range (off-normal)**
- **GIVEN** the Pharmacist enters an end date earlier than the start date
- **WHEN** the Pharmacist generates the report
- **THEN** an "invalid date range" message is displayed and no report is produced

### US-RPT-02 — Consumption per cabinet
**Traces to:** FR-RPT-02

**As a** Pharmacist, **I want** to restrict a consumption report to one cabinet **so that** I can size that cabinet's stock to its actual use.

**Scenario 1 — One cabinet (normal)**
- **GIVEN** ADC-101 dispensed 40 units and ADC-102 dispensed 60 units in September
- **WHEN** the Pharmacist generates the September report for ADC-101
- **THEN** the report shows 40 units

**Scenario 2 — Cabinet with no activity (off-normal)**
- **GIVEN** ADC-310 dispensed nothing in September
- **WHEN** the Pharmacist generates the September report for ADC-310
- **THEN** the report shows 0 units

**Scenario 3 — Cabinet offline during the period (off-normal)**
- **GIVEN** ADC-101 was "OFFLINE" from 10 to 12 September
- **WHEN** the Pharmacist generates the September report for ADC-101
- **THEN** the report includes the activities recorded outside the offline period

### US-RPT-03 — Consumption per medication
**Traces to:** FR-RPT-03

**As a** Pharmacist, **I want** to restrict a consumption report to one medication **so that** I can anticipate the next supplier order for it.

**Scenario 1 — One medication (normal)**
- **GIVEN** 30 units of Morphine and 50 units of Insulin were dispensed in September
- **WHEN** the Pharmacist generates the September report for Morphine
- **THEN** the report shows 30 units

**Scenario 2 — Medication never dispensed (off-normal)**
- **GIVEN** Ketamine was not dispensed in September
- **WHEN** the Pharmacist generates the September report for Ketamine
- **THEN** the report shows 0 units

**Scenario 3 — Combined with a cabinet (normal)**
- **GIVEN** ADC-101 dispensed 10 units of Morphine in September
- **WHEN** the Pharmacist generates the September report for Morphine and ADC-101
- **THEN** the report shows 10 units

### US-RPT-04 — Consumption per patient
**Traces to:** FR-RPT-04, NFR-SEC-04

**As a** Pharmacist, **I want** to restrict a consumption report to one patient **so that** I can check that a patient's medication matches their prescription.

**Scenario 1 — One patient (normal)**
- **GIVEN** patient P-4521 received 6 doses of Heparin in September
- **WHEN** the Pharmacist generates the September report for patient P-4521
- **THEN** the report shows 6 doses of Heparin with the patient identifier

**Scenario 2 — Patient identifiers protected (off-normal)**
- **GIVEN** a user logged in with the Nurse role
- **WHEN** the user opens a consumption report
- **THEN** no patient identifier is displayed

**Scenario 3 — Patient with no dispensing (off-normal)**
- **GIVEN** patient P-7788 received no medication in September
- **WHEN** the Pharmacist generates the September report for patient P-7788
- **THEN** the report shows 0 units

### US-RPT-05 — Consumption per staff member
**Traces to:** FR-RPT-05, NFR-SEC-04

**As an** Administrator, **I want** to restrict a consumption report to one staff member **so that** unusual withdrawal patterns can be investigated.

**Scenario 1 — One staff member (normal)**
- **GIVEN** staff member S-118 withdrew 25 units in September
- **WHEN** the Administrator generates the September report for S-118
- **THEN** the report shows 25 units attributed to S-118

**Scenario 2 — Staff member with no withdrawal (off-normal)**
- **GIVEN** staff member S-200 withdrew nothing in September
- **WHEN** the Administrator generates the September report for S-200
- **THEN** the report shows 0 units

**Scenario 3 — Combined with a medication (normal)**
- **GIVEN** S-118 withdrew 12 units of Morphine in September
- **WHEN** the Administrator generates the September report for S-118 and Morphine
- **THEN** the report shows 12 units

### US-RPT-06 — Alarm report
**Traces to:** FR-RPT-06, FR-RPT-07

**As** Hospital risk management, **I want** a report of the alarms over a period, which I can export **so that** safety indicators can be presented to the hospital's quality committee.

**Scenario 1 — Display (normal)**
- **GIVEN** 14 alarms occurred in September
- **WHEN** Hospital risk management requests the September alarm report
- **THEN** the report lists the 14 alarms with timestamp, ADC and severity

**Scenario 2 — Export (normal)**
- **GIVEN** the September alarm report is displayed
- **WHEN** Hospital risk management exports it
- **THEN** a downloadable file containing the 14 alarms is produced

**Scenario 3 — No alarm (off-normal)**
- **GIVEN** no alarm occurred on 1 October
- **WHEN** Hospital risk management requests the alarm report for 1 October
- **THEN** the report states that 0 alarms occurred

### US-RPT-07 — Reopen a past report
**Traces to:** FR-RPT-08, NFR-SEC-04

**As an** Administrator, **I want** to reopen a report generated earlier with its parameters **so that** I can present exactly the figures that were used in a past decision.

**Scenario 1 — Reopen (normal)**
- **GIVEN** a Morphine consumption report was generated on 1 October for September
- **WHEN** the Administrator opens it on 15 October
- **THEN** the report is displayed with its generation timestamp and its parameters (September, Morphine)

**Scenario 2 — Data changed since (normal)**
- **GIVEN** new dispensing data for September was recorded after 1 October
- **WHEN** the Administrator opens the report generated on 1 October
- **THEN** the report shows the figures as generated on 1 October

**Scenario 3 — Patient identifiers protected (off-normal)**
- **GIVEN** a saved report containing patient identifiers
- **WHEN** a user with the Technician role opens it
- **THEN** no patient identifier is displayed

## Theme: User Management (USR)

### US-USR-01 — Require login before any data is shown
**Traces to:** FR-USR-01, NFR-SEC-01

**As the** Hospital privacy officer, **I want** every access to the dashboard to require authentication **so that** patient and medication data are never exposed to someone passing by a workstation.

**Scenario 1 — Valid login (normal)**
- **GIVEN** a Nurse with a valid account
- **WHEN** the Nurse authenticates with correct credentials
- **THEN** the dashboard is displayed

**Scenario 2 — Wrong credentials (off-normal)**
- **GIVEN** a Nurse with a valid account
- **WHEN** the Nurse authenticates with a wrong password
- **THEN** access is denied and no dashboard data is displayed

**Scenario 3 — No session (off-normal)**
- **GIVEN** a user who is not authenticated
- **WHEN** the user requests the dashboard directly
- **THEN** the authentication screen is displayed instead of any data

### US-USR-02 — Restrict functions by role
**Traces to:** FR-USR-02, NFR-SEC-02

**As an** Administrator, **I want** each function to be available only to the roles allowed to use it **so that** a mistake by an unqualified user cannot affect a cabinet.

**Scenario 1 — Permitted role (normal)**
- **GIVEN** a user logged in with the Technician role
- **WHEN** the user sends a command to ADC-205
- **THEN** the command is sent

**Scenario 2 — Forbidden role (off-normal)**
- **GIVEN** a user logged in with the Nurse role
- **WHEN** the user attempts to send a configuration to ADC-205
- **THEN** the system refuses with a permission message and nothing is sent

**Scenario 3 — Role change (normal)**
- **GIVEN** a user's role is changed from Nurse to Technician by the Administrator
- **WHEN** the user logs in again
- **THEN** the user can send commands to ADCs

## Requirements without a story

- **NFR-REL-02** (fewer than 1 unplanned outage per 1,000 hours), **NFR-AVL-03** (99.5% monthly availability) and **NFR-AVL-04** (30 days without restart) are internal NFRs: they are verified by operational monitoring of the system, not by a user-facing scenario.
