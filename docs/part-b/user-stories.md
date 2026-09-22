# User Stories & Acceptance Criteria — Part B (Hospital Monitoring System)

## ADC Communication Management

- **US-01 ADC Registration** [corresponds with FR1, NFR4]
  - **User Story:** As a **System Administrator**, I want the system to allow an ADC to register using its identifier, contact address, and location so that only authenticated and registered cabinets can transmit data.
  - **Acceptance Criteria:**
    - **Given** an unregistered ADC attempts to register with a valid identifier ("ADC-101"), contact address ("192.168.1.50"), and location ("ICU-Ward-3"),
    - **When** the registration request is processed by the Monitoring System,
    - **Then** the ADC is recorded as registered, added to the active cabinet list, and permitted to send events.
    - **Given** an unregistered or unauthenticated device attempts to send an inventory update or ping,
    - **When** the Monitoring System receives the payload,
    - **Then** the system rejects the event, logs an unauthenticated access attempt, and returns an authorization failure error.

- **US-02 Periodic Presence Ping** [corresponds with FR2]
  - **User Story:** As a **System Administrator**, I want the system to receive a periodic presence signal every 30 seconds from each registered ADC so that cabinet connectivity is continuously monitored.
  - **Acceptance Criteria:**
    - **Given** a registered ADC ("ADC-101") sends a periodic presence heartbeat every 30 seconds,
    - **When** the Monitoring System receives the ping within the expected time window,
    - **Then** the system updates the timestamp of the last received signal for "ADC-101" and maintains its active state.

- **US-03 Remote Command Distribution** [corresponds with FR3]
  - **User Story:** As an **Operator**, I want to send configuration data or commands to a specific ADC so that cabinet behavior can be updated remotely.
  - **Acceptance Criteria:**
    - **Given** an authorized Operator selects registered cabinet "ADC-102" and specifies configuration parameters,
    - **When** the Operator submits the command,
    - **Then** the Monitoring System transmits the payload specifically to "ADC-102"'s contact address and records the command dispatch.

- **US-04 Scalable Concurrent Connectivity** [corresponds with FR4, NFR10]
  - **User Story:** As a **System Administrator**, I want the system to accept simultaneous connections from a variable number of ADCs so that network scaling does not cause performance degradation.
  - **Acceptance Criteria:**
    - **Given** the system is currently connected to 10 ADCs,
    - **When** 15 additional registered ADCs establish concurrent connections simultaneously,
    - **Then** the Monitoring System accepts all connections without dropping packets or degrading UI responsiveness.

- **US-05 Event Receipt Acknowledgment** [corresponds with FR26]
  - **User Story:** As an **ADC System**, I want the Monitoring System to acknowledge receipt of each event (ping, inventory update, alarm) so that delivery is confirmed.
  - **Acceptance Criteria:**
    - **Given** an ADC transmits a valid event (ping, inventory change, or alarm),
    - **When** the Monitoring System receives the event payload,
    - **Then** the system immediately returns a confirmation receipt message containing the event ID back to the originating ADC.

## Inventory Supervision

- **US-06 Store Inventory Updates** [corresponds with FR5]
  - **User Story:** As a **Pharmacist**, I want the system to receive and record inventory updates from each ADC so that centralized stock levels remain accurate.
  - **Acceptance Criteria:**
    - **Given** ADC-101 transmits an inventory payload indicating a medication count change,
    - **When** the Monitoring System ingests the message,
    - **Then** the central data repository updates the stock level for that medication at ADC-101 along with the current timestamp.

- **US-07 Single Cabinet Inventory View** [corresponds with FR6]
  - **User Story:** As a **Pharmacist**, I want to view the current inventory of a specific ADC so that I can check stock availability at a particular location.
  - **Acceptance Criteria:**
    - **Given** an authorized Pharmacist selects "ADC-202 (ER-Ward)" from the dashboard,
    - **When** the user requests the cabinet inventory view,
    - **Then** the system displays the complete list of stored medications, drawer locations, quantities, and expiration dates for ADC-202.

- **US-08 Low Stock Threshold Identification** [corresponds with FR7]
  - **User Story:** As a **Pharmacist**, I want the system to automatically identify ADCs where medication levels drop below a set threshold so that stock can be replenished before running out.
  - **Acceptance Criteria:**
    - **Given** the low-stock threshold for Insulin at ADC-101 is configured to 5 units,
    - **When** an inventory update reduces the stock level to 4 units,
    - **Then** the system automatically flags ADC-101 as "Low Stock" for Insulin and displays a restocking alert on the dashboard.

- **US-09 Nearest Restock Location Search** [corresponds with FR8]
  - **User Story:** As a **Pharmacist**, I want the system to locate the nearest ADC with available medication stock when another ADC needs restocking so that inventory transfers are efficient.
  - **Acceptance Criteria:**
    - **Given** ADC-101 (Ward A) requires restocking for Heparin,
    - **When** the user triggers the "Find Nearest Stock" function,
    - **Then** the system queries registered ADCs with available Heparin above threshold and returns the nearest physical location (e.g., ADC-102 in Ward B).

- **US-10 Aggregated Multi-ADC Inventory View** [corresponds with FR9]
  - **User Story:** As a **Pharmacy Manager**, I want to view aggregated medication inventory across multiple ADCs so that hospital-wide medication stock can be managed effectively.
  - **Acceptance Criteria:**
    - **Given** multiple ADCs store units of Ativan across 5 hospital wards,
    - **When** the Pharmacy Manager requests an aggregated inventory view for Ativan,
    - **Then** the system presents the total combined units across the network, broken down by ward and individual cabinet.

## Alarm Management

- **US-11 Alarm Logging & Categorization** [corresponds with FR10, FR13]
  - **User Story:** As an **Operator**, I want incoming ADC alarms to be logged with a timestamp, source ADC, alarm type, and severity level (info, warning, error, critical) so that alerts are properly categorized and traceable.
  - **Acceptance Criteria:**
    - **Given** an ADC transmits a cabinet tamper or failure message,
    - **When** the Monitoring System ingests the alarm,
    - **Then** the system records the entry in the persistent alarm log with the timestamp, originating ADC ID, alarm code, and mapped severity level (info, warning, error, or critical).

- **US-12 Real-time Alert Dashboard Display** [corresponds with FR11, NFR9]
  - **User Story:** As a **Clinical Operator**, I want new alarms displayed on the dashboard within 2 seconds of receipt so that critical events are noticed immediately.
  - **Acceptance Criteria:**
    - **Given** a critical alarm payload is received by the Monitoring System at T=0.0s,
    - **When** the server processes the alarm event,
    - **Then** the active alarm is rendered on the operator dashboard with visual indicators before T=2.0s.

- **US-13 Alarm Acknowledgment & Authorization** [corresponds with FR12, NFR3]
  - **User Story:** As an **Authorized User**, I want to acknowledge active alarms so that other team members know the incident is being addressed.
  - **Acceptance Criteria:**
    - **Given** an active critical alarm on the dashboard and an authenticated user with alarm handling privileges (e.g., Nurse),
    - **When** the user clicks "Acknowledge",
    - **Then** the alarm state updates to "Acknowledged", displaying the user's ID and timestamp.
    - **Given** a logged-in user whose assigned role lacks alarm handling permissions,
    - **When** the user attempts to acknowledge an alarm,
    - **Then** the system blocks the action and presents a permission denied warning.

## Cabinet Health Monitoring & System Availability

- **US-14 Operational State Tracking** [corresponds with FR19, FR23]
  - **User Story:** As an **Operator**, I want to track the operational state (online, offline, maintenance, or fault) of all ADCs on a central dashboard so that overall cabinet health is visible.
  - **Acceptance Criteria:**
    - **Given** an ADC changes its operational state to "Maintenance",
    - **When** the ADC reports its status update to the Monitoring System,
    - **Then** the central dashboard updates the cabinet's state badge to "Maintenance".

- **US-15 Offline State Detection** [corresponds with FR24, NFR6]
  - **User Story:** As an **Operator**, I want an ADC marked as offline if no ping is received within 75 seconds so that device disconnects are detected within a bounded timeframe.
  - **Acceptance Criteria:**
    - **Given** ADC-101 transmitted its last heartbeat at 12:00:00,
    - **When** 75 seconds elapse (12:01:15) without receiving a new ping,
    - **Then** the Monitoring System automatically updates ADC-101's status to "OFFLINE" and raises a communication alert.

- **US-16 Unreachable Warning Detection** [corresponds with FR25]
  - **User Story:** As an **Operator**, I want an ADC marked as temporarily unreachable if no ping is received within 45 seconds so that potential communication delays are highlighted early.
  - **Acceptance Criteria:**
    - **Given** ADC-101 transmitted its last ping at 12:00:00,
    - **When** 45 seconds elapse (12:00:45) without a new ping,
    - **Then** the system flags ADC-101 as "Temporarily Unreachable" on the dashboard prior to triggering the full offline state.

- **US-17 Stale Data Warning Indicator** [corresponds with NFR1]
  - **User Story:** As a **Dashboard User**, I want the system to clearly indicate when status data was last updated so that outdated information is never mistaken for current status.
  - **Acceptance Criteria:**
    - **Given** cabinet status data displayed on the dashboard was last updated at 10:15:00 AM,
    - **When** fresh status data is delayed past the expected update window,
    - **Then** the interface displays the "Last Updated: 10:15:00 AM" timestamp and visually flags the status data as stale.

- **US-18 Fault-Tolerant Availability** [corresponds with NFR7, NFR8]
  - **User Story:** As a **System Operator**, I want the Monitoring System to run continuously without restarts and remain operational for online ADCs even if individual ADCs go offline so that monitoring functions are never interrupted.
  - **Acceptance Criteria:**
    - **Given** multiple connected ADCs actively transmitting heartbeats,
    - **When** one or more ADCs experience network loss and go offline,
    - **Then** the Monitoring System continues uninterrupted operation for all remaining online ADCs without requiring a server restart.

## Historical Data Management & Auditability

- **US-19 1-Year Alarm History Retention** [corresponds with FR14]
  - **User Story:** As an **Auditor**, I want alarm history retained for 1 year so that long-term safety incidents can be investigated.
  - **Acceptance Criteria:**
    - **Given** alarm records generated up to 365 days prior exist in the storage system,
    - **When** an Auditor queries alarm records for that historical period,
    - **Then** the system retrieves the complete set of historical alarm logs including original timestamps and severity levels.

- **US-20 6-Month Dispensing & Status Retention** [corresponds with FR15]
  - **User Story:** As an **Auditor**, I want dispensing activity and status history retained for 6 months so that medication usage trends can be audited.
  - **Acceptance Criteria:**
    - **Given** dispensing activity and status logs recorded up to 6 months prior,
    - **When** an authorized user executes a search for medication access logs,
    - **Then** the system returns complete activity logs containing user IDs, cabinet IDs, and transaction details.

- **US-21 Immutable Event History Review** [corresponds with FR16, NFR12]
  - **User Story:** As an **Authorized User**, I want to review the unalterable event history of any ADC over a specified time period so that past cabinet activity can be verified.
  - **Acceptance Criteria:**
    - **Given** an authorized user requests event history for ADC-101 over a specific date range,
    - **When** the system retrieves the logs,
    - **Then** the historical event data is displayed in a read-only format that preserves original data integrity without allowing edits or deletions.

- **US-22 Sensitive Action Audit Logging** [corresponds with FR28, NFR11]
  - **User Story:** As an **Auditor**, I want the identity, timestamp, and action recorded whenever a user acknowledges an alarm or sends a command so that complete operational accountability is maintained.
  - **Acceptance Criteria:**
    - **Given** an authenticated user executes a sensitive action (e.g., acknowledging an alarm or issuing a remote ADC command),
    - **When** the command is processed by the Monitoring System,
    - **Then** an immutable audit record is created capturing the user ID, exact action description, target ADC ID, and timestamp.

## Reporting

- **US-23 Filtered Medication Consumption Reports** [corresponds with FR17]
  - **User Story:** As a **Pharmacist / Administrator**, I want to generate medication consumption reports filtered by period, ADC, medication, patient, or staff member so that usage patterns and costs can be evaluated.
  - **Acceptance Criteria:**
    - **Given** a user selects query parameters (e.g., Date Range = "Past Month", Medication = "Morphine", Location = "ICU"),
    - **When** the user clicks "Generate Report",
    - **Then** the system calculates total consumption and outputs a summary grouped by patient, staff member, and cabinet.

- **US-24 Historical Alarm Export** [corresponds with FR18]
  - **User Story:** As a **System Administrator**, I want to export or display historical alarm reports so that safety metrics can be documented and shared.
  - **Acceptance Criteria:**
    - **Given** an alarm report query executed for a selected time window,
    - **When** the user selects "Export Report",
    - **Then** the system outputs a downloadable report file containing the complete list of logged alarms, timestamps, and severity levels.

- **US-25 Saved Report Review** [corresponds with FR22]
  - **User Story:** As an **Authorized User**, I want to view previously generated reports along with their timestamps and query settings so that past reporting results can be referenced.
  - **Acceptance Criteria:**
    - **Given** a list of saved historical reports,
    - **When** an authorized user selects a previously generated report,
    - **Then** the system renders the report content alongside its generation timestamp, author details, and query filter parameters.

## Operator Dashboard & Security

- **US-26 Dashboard Sorting & Filtering** [corresponds with FR20, NFR13]
  - **User Story:** As a **Dashboard User**, I want to filter and sort displayed ADCs (e.g., by status or ID) so that I can quickly identify cabinets needing attention without navigating through unrelated data.
  - **Acceptance Criteria:**
    - **Given** a dashboard displaying multiple ADCs in various operational states,
    - **When** the user applies a filter (e.g., `Status = "Offline"` or `Status = "Fault"`),
    - **Then** the system instantly filters the view to show only matching cabinets.

- **US-27 Role-Based Access Control & Authentication** [corresponds with FR21, FR27, NFR2, NFR3]
  - **User Story:** As a **System Administrator**, I want user authentication required and dashboard access restricted by role (nurse, pharmacist, technician, administrator) so that unauthorized personnel cannot view patient data or perform restricted actions.
  - **Acceptance Criteria:**
    - **Given** an unauthenticated user attempts to view dashboard screens or medication records,
    - **When** the request is made,
    - **Then** access is denied and the user is redirected to the authentication login screen.
    - **Given** an authenticated user logged in under the "Nurse" role,
    - **When** the user attempts to access administrative system configuration,
    - **Then** the system blocks the navigation and displays a role privilege restriction message.

- **US-28 Consistent Terminology & Status Labels** [corresponds with NFR14]
  - **User Story:** As a **Dashboard User**, I want consistent terminology and status labels across all views, reports, and logs so that information is clear and unambiguous.
  - **Acceptance Criteria:**
    - **Given** an ADC cabinet or alarm status string (e.g., "OFFLINE", "CRITICAL", "MAINTENANCE"),
    - **When** viewed across the live dashboard, historical logs, or exported reports,
    - **Then** the exact same status wording and labeling conventions are used across all interfaces.

## System Reliability

- **US-29 Zero Event Loss Guarantee** [NFR5]
  - **User Story:** As a **System Operator**, I want the system to guarantee that no valid event (ping, inventory update, alarm) received from a registered ADC is lost so that operational records remain complete.
  - **Acceptance Criteria:**
    - **Given** a registered ADC transmits a valid event payload across the hospital network,
    - **When** the Monitoring System receives the packet,
    - **Then** the event is reliably persisted in database storage prior to sending an acknowledgment, ensuring zero data loss.
