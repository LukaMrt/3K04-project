# ADC Non-Functional Requirements - working draft

This is a working draft based on the current functional requirements, the project handout, and the NFR notes already started by the team. I left some values as **[TBD]** where the current requirements do not give enough information yet.

## Safety

### NFR-SAF-01 - fail safe before dispensing
The ADC shall not begin a dispensing operation if the user's authorization, requested medication location, available inventory, or required fault-free state cannot be confirmed.

Applies to: AUTH-01 to AUTH-03, INV-02, INV-07, DISP-02 to DISP-04, FAULT-03.

### NFR-SAF-02 - locked medication locations
Medication compartments shall remain locked except while an authorized operation permits access to that specific location.

Applies to: AUTH-01, AUTH-02, DISP-04, MODE-05.

### NFR-SAF-03 - no duplicate successful dispense
A single dispensing request shall not cause more than one successful dispensing operation, including after repeated input or communication retry.

Applies to: DISP-05, COM-11.

### NFR-SAF-04 - incomplete dispense handling
If a dispensing operation does not complete successfully, the ADC shall not record it as a successful dispense and shall place the operation/location into a state that prevents unsafe continuation until the outcome is known.

Applies to: DISP-06, INV-05, FAULT-03, LOG-02.

### NFR-SAF-05 - open drawer warning
If a drawer remains open when it should be closed, the ADC shall issue a persistent local warning, record the condition, and prevent unsafe dispensing from the affected location until the condition is resolved.

Applies to: AUTH-04, FAULT-01, MODE-05.

### NFR-SAF-06 - safe operation during communication loss
Loss of communication with the Monitoring System shall not disable local authorization, inventory, dispensing-limit, or hardware-fault safety checks.

Applies to: COM-08 to COM-10, MODE-07.

## Security

### NFR-SEC-01 - authorization levels
The ADC shall enforce the configured Level 1, Level 2, and Level 3 permissions so that a lower authorization level cannot perform actions reserved for a higher level.

Applies to: AUTH-02, AUTH-03, AUTH-07, AUTH-08, MODE-03, MODE-04, LOG-06.

### NFR-SEC-02 - password composition
Each authorization-level password shall satisfy the team password policy. Current draft: at least 3 numeric characters and at least 3 special characters.

**Needs confirmation:** minimum total password length and whether letters are also required.

Applies to: AUTH-01, AUTH-02.

### NFR-SEC-03 - failed-login lockout
After **[TBD number]** consecutive failed login attempts, the ADC shall block additional attempts for **[TBD duration]**. These values shall only be configurable by Level 3 authorization.

Current draft mentions a 60 s lockout, but another note says the duration is configurable, so this still needs one final rule.

Applies to: AUTH-06.

### NFR-SEC-04 - inactivity timeout configuration
The authenticated-session inactivity timeout shall be configurable only by Level 3 authorization and shall be limited to integer values from 1 s to 900 s.

Applies to: AUTH-04.

### NFR-SEC-05 - protected local logs
Local event and fault logs shall only be viewable through an authorized access level. Current access model suggests Level 3.

Applies to: LOG-06, MODE-04.

### NFR-SEC-06 - Monitoring System command validation
The ADC shall reject Monitoring System commands that fail the agreed command validation checks before the command can change cabinet state.

Validation should include at minimum message format and command validity; endpoint authentication/integrity method is **[TBD with Part B team]**.

Applies to: COM-05, COM-06.

### NFR-SEC-07 - sensitive information access
Medication, user, and patient-related information stored or displayed by the ADC shall only be available to users whose authorization level permits that information.

Applies to: INV-01, INV-09, LOG-01 to LOG-07, COM-03, COM-12.

## Reliability

### NFR-REL-01 - consistent medication/location mapping
Each active medication record shall have one unique identifier and one defined storage location, and the same location shall not be assigned to multiple medications at the same time.

Applies to: INV-01, INV-02.

### NFR-REL-02 - inventory and dispense consistency
After a completed replenishment, dispensing operation, or approved inventory correction, the recorded inventory and the corresponding event log shall represent the same outcome.

Applies to: INV-03 to INV-06, DISP-06, LOG-02, LOG-03.

### NFR-REL-03 - restart persistence
Recorded inventory data and other locally retained operational information required for safe startup shall survive a normal software restart.

Applies to: INV-08, MODE-09, COM-09.

### NFR-REL-04 - fault interlock persistence
A fault that blocks dispensing shall remain active until the underlying condition is no longer detected and an authorized clear operation is accepted.

Applies to: FAULT-03 to FAULT-05.

### NFR-REL-05 - no loss/duplication during communication recovery
Operational events stored while the Monitoring System is unavailable shall remain locally available until successfully synchronized and shall not be treated as new events more than once.

Applies to: COM-09, COM-10, COM-11.

### NFR-REL-06 - command/result matching
The outcome returned for a Monitoring System command shall correspond to the same command that was received and to the actual local execution result.

Applies to: COM-05 to COM-07.

## Availability

### NFR-AVA-01 - local operation during Monitoring System outage
The ADC shall continue locally permitted operations during temporary loss of communication with the Monitoring System, provided the operation can still satisfy local safety and authorization checks.

Applies to: COM-08, COM-09, MODE-07.

### NFR-AVA-02 - automatic communication recovery
When communication with the Monitoring System is restored, the ADC shall resume communication and begin synchronization of unsent events without requiring a software restart.

Applies to: COM-10.

### NFR-AVA-03 - startup recovery
After a normal restart, the ADC shall restore the locally retained state required for safe operation and reach either a usable operating state or a clearly indicated fault state within **[TBD] s**.

Applies to: INV-08, MODE-08, MODE-09.

## Performance

### NFR-PERF-01 - authentication response
For a locally entered credential, the ADC shall grant or reject authentication within 3 s.

Applies to: AUTH-01, AUTH-02, AUTH-03.

### NFR-PERF-02 - dispensing decision response
After a user submits a dispensing request, the ADC shall complete the authorization, inventory, limit, and fault checks and either reject the request or begin the approved access operation within **[TBD] s**.

Applies to: DISP-01 to DISP-04, DISP-07.

### NFR-PERF-03 - hardware/fault detection response
The ADC shall detect a drawer close failure, unlock failure, or other monitored hardware condition within **[TBD] s** of the condition becoming detectable by the software interface.

Applies to: FAULT-01, FAULT-02, FAULT-06.

### NFR-PERF-04 - Monitoring System status/alert timing
While communication is available, the ADC shall send periodic status every **[TBD] s** and transmit error/critical fault information within **[TBD] s** of detection.

Applies to: COM-02, COM-03, FAULT-07, MODE-05.

### NFR-PERF-05 - inactivity timing
The ADC inactivity timer shall use the configured timeout value consistently. The current draft says the inactivity process begins after 15 s without user input, but this timing needs clarification before the final requirement is written.

Applies to: AUTH-04.

## Traceability / auditability

### NFR-AUD-01 - required event coverage
The ADC shall create local records for login attempts, dispensing operations, replenishments, inventory corrections, detected faults, communication failures, and authorized fault clears.

Applies to: LOG-01 to LOG-05, FAULT-04, FAULT-08.

### NFR-AUD-02 - minimum audit fields
Where applicable, an audit record shall include timestamp, cabinet identifier, responsible authenticated user, action/event type, outcome, and the related medication/compartment or fault information.

Applies to: LOG-01 to LOG-07, COM-04.

### NFR-AUD-03 - mode/configuration changes
Changes to operating mode, passwords/security configuration, dispensing limits, and manual inventory values shall be associated with the responsible authorized user and timestamp.

Applies to: AUTH-04, AUTH-06, INV-06, DISP-07, MODE-03, MODE-04.

### NFR-AUD-04 - offline audit retention
Events created while the Monitoring System is unavailable shall keep their original event information until they are successfully synchronized.

Applies to: COM-09, COM-10.

### NFR-AUD-05 - duplicate trace prevention
Synchronized events shall contain enough identifying information for the ADC/Monitoring System interface to distinguish a newly created event from an event that has already been transmitted.

Applies to: COM-10, COM-11.

## Usability

### NFR-USA-01 - access denial feedback
When an operation is denied because the current user lacks permission, the ADC shall display a message indicating the required authorization level or permission without revealing the required password.

Applies to: AUTH-02, AUTH-03, AUTH-08.

### NFR-USA-02 - session timeout feedback
Before an authenticated session is ended for inactivity, the ADC shall display that the session is about to end and show the remaining timeout/countdown according to the final timeout design.

Applies to: AUTH-04.

### NFR-USA-03 - ended session recovery
After a session has ended, the ADC shall clearly indicate that re-authentication is required and provide a direct path back to the login screen.

Applies to: AUTH-05.

### NFR-USA-04 - fault messages
Local fault messages shall include the fault severity and enough text to tell the user the affected part of the cabinet and the next safe action where one exists.

Applies to: FAULT-01 to FAULT-08, MODE-05, MODE-06.

### NFR-USA-05 - confirmation for risky changes
The ADC shall request confirmation before applying destructive or high-impact manual changes such as deleting medication information, manual inventory correction, password change, or clearing a fault.

Applies to: INV-01, INV-06, FAULT-04, MODE-04.

### NFR-USA-06 - inventory overview readability
The local inventory view shall present the medication, storage location, recorded quantity/status, and availability state in a consistent format.

Applies to: INV-02, INV-07, INV-09.

### NFR-USA-07 - warnings not based on color alone
Warning, error, and critical conditions shall be identified using text labels and/or symbols in addition to any color coding.

Applies to: FAULT-06, MODE-05, MODE-06.

## Other current project constraints / decisions (probably keep outside the NFR section)

These came from the team's current draft but fit better under assumptions/decisions, system constraints, or functional requirements:

- The cabinet has 5 storage blocks.
- Each storage block can hold up to 20 medication units.
- Only one medication type may be assigned to a storage block at a time.
- Current role concept is Level 1 (limited dispensing), Level 2 (replenishment/inventory changes), Level 3 (maintenance/admin).
- Current medication record idea includes medication name, quantity, insertion date, patient name, and staff member/last user.
- Fault levels are informational, warning, error, critical.

