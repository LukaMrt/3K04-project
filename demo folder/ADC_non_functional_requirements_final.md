# ADC Non-Functional Requirements - revised draft v3

Working draft updated after the latest functional requirement decisions.

## Safety

### NFR-SAF-01 - safe dispensing checks
The ADC shall not allow medication access unless authorization, recorded inventory, withdrawal-policy, logging, and active fault checks permit the operation.

Related: AUTH-01 to AUTH-03, DISP-02 to DISP-04, DISP-07 to DISP-12, FAULT-03.

### NFR-SAF-02 - locked medication access
Medication storage locations shall remain locked except while an authorized dispensing, replenishment, inventory-correction, maintenance, or accepted remote operation requires access.

Related: DISP-04, DISP-11, COM-05 to COM-07.

### NFR-SAF-03 - duplicate request protection
The same dispensing request ID shall not result in more than one completed dispensing operation.

Related: DISP-05, LOG-02.

### NFR-SAF-04 - uncertain inventory
If a medication's recorded quantity is reported as incorrect or cannot be confirmed, the medication shall be unavailable for dispensing until Level 2 or Level 3 confirms/corrects the record.

Related: INV-07, INV-08, DISP-03.

### NFR-SAF-05 - withdrawal-limit bypass protection
Where multiple medication records are assigned to the same withdrawal-policy group, withdrawals from all records in that group shall count toward the same configured quantity/time limit.

Related: DISP-07 to DISP-12.

### NFR-SAF-06 - safe fault response
Error and critical faults shall prevent normal medication operations until the triggering condition is resolved and the required authorization clears the fault.

Related: FAULT-03 to FAULT-06, MODE-02, MODE-05.

### NFR-SAF-07 - safe timeout with open door
A door that is already open shall remain physically closable after a session timeout. After it closes, the ADC shall enter error lockdown and require Level 2 or Level 3 fault-clear authorization.

Related: AUTH-05, FAULT-09, MODE-05.

### NFR-SAF-08 - remote commands cannot bypass local safety
A remote request from the Monitoring System shall not bypass local authorization, inventory, withdrawal-policy, logging, or fault-state checks. The ADC shall explicitly confirm that these checks pass before a remote unlock is performed.

Related: COM-05 to COM-08, DISP-02 to DISP-08.

### NFR-SAF-09 - safe operation during communication loss
Loss of communication with the Monitoring System shall not disable local authentication, inventory checks, withdrawal limits, logging, or fault handling.

Related: COM-09 to COM-12, MODE-07.

## Security

### NFR-SEC-01 - individual user authentication
Each ADC user shall authenticate using an individual user account and password so protected actions can be associated with a specific user.

Related: AUTH-01, LOG-01, LOG-07.

### NFR-SEC-02 - password requirements
User passwords shall contain at least 8 characters, including at least 3 numeric characters and at least 3 special characters.

Related: AUTH-11.

### NFR-SEC-03 - authorization levels
The ADC shall enforce the permissions assigned to Level 1, Level 2, and Level 3 users.

Related: AUTH-02, AUTH-07 to AUTH-10.

### NFR-SEC-04 - medication-specific permissions
Level 1 users shall only access medications allowed by rules configured by Level 2 or Level 3.

Related: AUTH-08, DISP-02 to DISP-04.

### NFR-SEC-05 - failed-login protection
The failed-login attempt limit and lockout duration shall only be configurable by Level 3. Leaving the login screen shall not reset the failed-attempt state.

Related: AUTH-06.

### NFR-SEC-06 - inactivity timeout
After 15 seconds without user input, the ADC shall begin its configured inactivity countdown. If the countdown finishes, the current session shall end and re-authentication shall be required.

Related: AUTH-04, AUTH-05.

### NFR-SEC-07 - protected log/configuration access
Level 2 shall only access records needed for its permitted replenishment, inventory, and error-recovery work. Level 3 shall have access to full logs and administrative/security settings.

Related: AUTH-09, AUTH-10, LOG-06.

### NFR-SEC-08 - patient information protection
Patient names stored with medication records shall not be displayed to unauthenticated users. Patient information shall only be available through authorized ADC functions or the authenticated ADC-Monitoring System interface.

Related: INV-02, INV-09, COM-14.

### NFR-SEC-09 - Monitoring System authentication
The ADC shall only accept commands from an authenticated Monitoring System source and shall reject malformed, unauthorized, duplicated, or invalid commands before they change ADC state.

Related: COM-05 to COM-08, COM-13.

### NFR-SEC-10 - remote command identity
Remote commands that change ADC state shall include a command identifier and enough authorization/source information for the action to be validated and audited.

Related: COM-05 to COM-08, LOG-07.

## Reliability

### NFR-REL-01 - stable medication identifiers
Each medication inventory record shall have a unique identifier that remains unchanged while that record exists and is not reused for another active medication record.

Related: INV-01, INV-02.

### NFR-REL-02 - one medication record per storage location
A storage location shall not be assigned to more than one active medication record at the same time.

Related: INV-03.

### NFR-REL-03 - inventory and log consistency
After a completed dispensing, replenishment, or inventory-correction operation, the recorded inventory and its event record shall show the same resulting quantity/outcome.

Related: INV-05 to INV-07, DISP-06, LOG-02, LOG-03.

### NFR-REL-04 - fault persistence
An error or critical fault shall remain active until the triggering condition is resolved and an authorized user clears the fault.

Related: FAULT-03 to FAULT-05.

### NFR-REL-05 - communication retry
Unacknowledged event and fault records shall remain stored locally and be retried until acknowledged by the Monitoring System.

Related: COM-11, COM-12.

### NFR-REL-06 - duplicate synchronization protection
Unique record/command IDs and acknowledgements shall be used so retransmission does not create duplicate events, faults, or remote operations.

Related: COM-12, COM-13.

### NFR-REL-07 - remote command/result matching
Each remote command response shall identify the command it belongs to and report the actual ADC result.

Related: COM-08.

## Availability

### NFR-AVA-01 - local operation during Monitoring System outage
The ADC shall continue locally permitted operations while the Monitoring System is unavailable, provided all local safety and audit checks can still be satisfied.

Related: COM-09 to COM-11.

### NFR-AVA-02 - communication recovery
When communication is restored, the ADC shall resume status communication and retry unsent records without requiring a restart.

Related: COM-11, COM-12.

### NFR-AVA-03 - safety over availability
Medication access may remain unavailable while an error or critical fault is active. Safety shall take priority over continued dispensing availability.

Related: FAULT-03 to FAULT-06, MODE-05.

### NFR-AVA-04 - optional restart support
Software restart and recovery of retained state are optional for the current minimum implementation.

Related: INV-10, MODE-08, MODE-09.

## Performance

### NFR-PERF-01 - authentication response
The ADC shall grant or reject a local login attempt within 3 seconds of credential submission.

Related: AUTH-01 to AUTH-03.

### NFR-PERF-02 - fault response
The ADC shall enter the required local fault state within 3 seconds of an error or critical fault condition being detected.

Related: FAULT-01 to FAULT-06, MODE-02.

### NFR-PERF-03 - status update interval
While communication is available, the ADC shall send current status information to the Monitoring System every 30 seconds.

Related: COM-01 to COM-04, COM-15.

### NFR-PERF-04 - communication retry
Unacknowledged information shall be eligible for retransmission on following communication cycles until acknowledged.

Related: COM-11 to COM-13.

### NFR-PERF-05 - inactivity timing
The ADC shall begin the inactivity countdown after 15 seconds without user input and shall terminate the session when the configured 1-900 second countdown expires.

Related: AUTH-04, AUTH-05.

## Traceability / auditability

### NFR-AUD-01 - actions that must be logged
The ADC shall record login attempts, dispensing operations, replenishment, inventory corrections, permission/configuration changes, detected faults, fault clears, communication failures, and Monitoring System commands that change ADC state.

Related: LOG-01 to LOG-07, COM-05 to COM-08.

### NFR-AUD-02 - log record contents
Where applicable, records shall include a unique record ID, ADC ID, timestamp, responsible user/remote source, event type, outcome, and affected medication/storage location.

Related: LOG-01 to LOG-08.

### NFR-AUD-03 - timestamps
Log timestamps shall use the ADC's configured local time zone and `MM/DD/YYYY` with a 24-hour time value. Only Level 3 may change the time-zone setting.

Related: LOG-01 to LOG-07, MODE-04.

### NFR-AUD-04 - local log capacity
The ADC shall store at least 500 event records and at least 100 fault records locally.

Related: LOG-09.

### NFR-AUD-05 - no overwrite of unsent records
The ADC shall not overwrite event/fault records that have not been acknowledged by the Monitoring System.

Related: LOG-10, COM-12.

### NFR-AUD-06 - controlled log clearing
Only Level 3 users shall clear local logs, and only after the records being removed have been acknowledged by the Monitoring System. A log-clear action shall itself be recorded.

Related: LOG-11.

### NFR-AUD-07 - full log handling
If a required audit record cannot be created because local storage is full and synchronization is unavailable, the ADC shall not perform a protected action that would otherwise be unaudited.

Related: LOG-12.

## Usability / accessibility

### NFR-USA-01 - clear authorization messages
When an operation is denied due to permissions, the ADC shall display the authorization level or permission required without revealing password information.

Related: AUTH-02, AUTH-03.

### NFR-USA-02 - inactivity feedback
When the inactivity countdown begins, the ADC shall display the remaining time and indicate that user input will cancel the countdown.

Related: AUTH-04.

### NFR-USA-03 - repeat withdrawal warning
A repeat withdrawal warning shall show the previous withdrawal time/quantity, remaining allowed quantity, and policy reset time.

Related: DISP-09, DISP-10.

### NFR-USA-04 - medication identification
Medication selection information shown to authorized users shall use a consistent layout containing medication name, strength, patient name, recorded quantity, and storage location so duplicate medication records can be distinguished.

Related: INV-02, INV-09.

### NFR-USA-05 - fault messages
Fault messages shall show the fault severity, a short description, and the next required action when one is available.

Related: FAULT-01 to FAULT-12, MODE-05, MODE-06.

### NFR-USA-06 - fault-mode display
While in Fault Mode, the display shall clearly indicate that normal cabinet operation is locked down and identify the authorization level required to clear the fault.

Related: MODE-05, FAULT-04.

### NFR-USA-07 - warnings shall not rely on colour alone
Warnings and fault states shall use text labels and/or symbols in addition to any colour coding.

Related: FAULT-06, MODE-05.

### NFR-USA-08 - readable prompts
Login, dispensing, inventory, warning, and fault screens shall use readable labels and provide a clear next action rather than only technical error codes.
