# 3K04 ADC Functional Requirements - revised draft v3

Working draft updated after the NFR review and the latest project decisions.

## 1\. Authentication / access control

|ID|Requirement|
|-|-|
|**FR-AUTH-01**|The ADC shall require each user to authenticate using their own user account and password before permitting protected cabinet operations.|
|**FR-AUTH-02**|The ADC shall determine whether an authenticated user is permitted to perform the requested operation based on their authorization level and medication-specific permissions.|
|**FR-AUTH-03**|The ADC shall deny an operation when the authenticated user lacks the required permission and shall display the authorization level or permission required.|
|**FR-AUTH-04**|After 15 seconds without user input, the ADC shall begin an inactivity countdown. The countdown shall be configurable by a Level 3 user from 1 to 900 seconds. User input before the countdown finishes shall cancel the countdown.|
|**FR-AUTH-05**|When the inactivity countdown finishes, the ADC shall terminate the current session and reject protected operations until the user re-authenticates. If a medication door is open, it shall remain physically closable without authentication and the ADC shall enter error lockdown after the door is closed.|
|**FR-AUTH-06**|The ADC shall temporarily block additional login attempts after a configurable number of consecutive failed attempts. The attempt limit and lockout duration shall only be configurable by Level 3 users. The failed-attempt state shall not be cleared by leaving the login screen and may only be manually cleared by Level 2 or Level 3 authorization.|
|**FR-AUTH-07**|The ADC shall support three authorization levels: Level 1, Level 2, and Level 3.|
|**FR-AUTH-08**|Level 1 users shall only be able to dispense medications and quantities permitted by rules previously configured by Level 2 or Level 3 users.|
|**FR-AUTH-09**|Level 2 users shall be permitted to replenish medication, correct inventory, configure medication access and withdrawal limits, view fault-related records needed for those tasks, and clear error faults.|
|**FR-AUTH-10**|Level 3 users shall have Level 2 permissions in addition to administrative settings, password and permission management, maintenance functions, full log access/management, and critical-fault clearing.|
|**FR-AUTH-11**|User passwords shall contain at least 8 characters, including at least 3 numeric characters and at least 3 special characters.|

## 2\. Medication inventory management

|ID|Requirement|
|-|-|
|**FR-INV-01**|The ADC shall assign each active medication inventory record a unique system-generated medication ID.|
|**FR-INV-02**|The ADC shall store the medication name, strength, patient name, recorded quantity, storage location, insertion date, date of last access, user of last access, and configured withdrawal policy separately from the medication ID.|
|**FR-INV-03**|The ADC shall associate each active medication inventory record with one storage location and shall not associate more than one active medication record with the same storage location at the same time.|
|**FR-INV-04**|The ADC shall allow Level 2 or Level 3 users to register medication added during replenishment and enter its required medication information.|
|**FR-INV-05**|The ADC shall update its recorded inventory after a replenishment operation using the quantity confirmed by the authorized user.|
|**FR-INV-06**|The ADC shall update its recorded inventory after a completed dispensing operation using the quantity confirmed as withdrawn by the user.|
|**FR-INV-07**|The ADC shall allow Level 2 or Level 3 users to correct a recorded inventory discrepancy. The correction shall record the previous quantity, corrected quantity, responsible user, and time of correction.|
|**FR-INV-08**|The ADC shall mark a medication as unavailable if its recorded quantity is reported as incorrect or cannot be confirmed. It shall remain unavailable until Level 2 or Level 3 authorization confirms or corrects the inventory.|
|**FR-INV-09**|The ADC shall allow authorized users to view medication information relevant to their permissions, including medication name, strength, patient name, recorded quantity, and storage location.|
|**FR-INV-10**|**\[Optional]** The ADC shall retain recorded inventory and other required operational information across a software restart.|

## 3\. Medication dispensing

|ID|Requirement|
|-|-|
|**FR-DISP-01**|The ADC shall accept a dispensing request that identifies the requested medication record and quantity.|
|**FR-DISP-02**|Before beginning a dispensing operation, the ADC shall verify the user's medication permission, recorded inventory quantity, active withdrawal policy, and current fault state.|
|**FR-DISP-03**|The ADC shall reject a dispensing request when the requested quantity exceeds recorded inventory, the medication is unavailable, the user lacks permission, the withdrawal limit would be exceeded, or the ADC is in an error or critical Fault Mode.|
|**FR-DISP-04**|The ADC shall provide access only to the storage location associated with the authorized dispensing request.|
|**FR-DISP-05**|Each dispensing request shall have a unique request ID, and the ADC shall prevent the same request ID from producing more than one completed dispensing operation.|
|**FR-DISP-06**|The ADC shall not mark a dispensing operation as complete until the user confirms the quantity actually withdrawn. If the operation is not confirmed, the ADC shall treat the dispensing operation as incomplete.|
|**FR-DISP-07**|Level 2 or Level 3 users shall be able to configure a withdrawal policy containing a maximum quantity and a time window.|
|**FR-DISP-08**|The ADC shall reject a dispensing request that would exceed the applicable withdrawal policy and shall record the rejected attempt.|
|**FR-DISP-09**|When a new dispensing request is made while a previous withdrawal under the same policy is still within its active time window, the ADC shall display the previous withdrawal time and quantity, the remaining allowed quantity, and the time at which the withdrawal window resets.|
|**FR-DISP-10**|If a repeat request is still within the configured withdrawal limit, the ADC shall allow the authenticated user to confirm that the repeat withdrawal is intentional before continuing.|
|**FR-DISP-11**|Level 2 or Level 3 users shall be able to remove medication during an explicit replenishment or inventory-correction workflow without being blocked by the normal Level 1 withdrawal limit. The override shall be selected explicitly and logged.|
|**FR-DISP-12**|Level 2 or Level 3 users shall be able to assign multiple medication records to the same withdrawal-policy group. The ADC shall apply the group's quantity/time limit across all medication records assigned to that group.|

### Withdrawal-policy group note

A withdrawal-policy group is separate from a medication ID. It is used when more than one stored medication record should count toward the same withdrawal limit.

Example:

* `MED-001`: Vyvanse 20 mg, Patient A, Container 1
* `MED-006`: Vyvanse 20 mg, Patient A, Container 4
* Both can be assigned to `POLICY-001: maximum 1 unit / 24 h`

A withdrawal from either container counts toward the same limit. This prevents somebody from bypassing the limit by switching containers.

The ADC does **not** automatically decide which records should share a policy. Level 2 or Level 3 configures it. Records for different patients can remain in separate policy groups even when medication name/strength are identical.

## 4\. Event logging

|ID|Requirement|
|-|-|
|**FR-LOG-01**|The ADC shall record each login attempt, including the attempted user identifier when available, the time of the attempt, and whether authentication succeeded.|
|**FR-LOG-02**|The ADC shall record each dispensing request and its outcome, including the request ID, medication ID, requested or confirmed quantity, responsible user, and timestamp.|
|**FR-LOG-03**|The ADC shall record medication replenishments and manual inventory corrections, including the responsible user, affected medication, previous quantity where applicable, resulting quantity, and timestamp.|
|**FR-LOG-04**|The ADC shall record each detected fault, including a unique fault-record ID, fault severity, fault type, cause or triggering condition when known, ADC ID, timestamp, and relevant ADC state.|
|**FR-LOG-05**|The ADC shall record failed or unsuccessful communication attempts with the Monitoring System.|
|**FR-LOG-06**|Level 2 users shall be able to view the active fault and medication/activity records needed to perform replenishment, inventory correction, or error-fault recovery. Level 3 users shall be able to view the full local event and fault history.|
|**FR-LOG-07**|The ADC shall associate medication withdrawal, replenishment, inventory-correction, fault-clear, and configuration records with the responsible authenticated user and time of activity.|
|**FR-LOG-08**|Each event and fault record shall have a unique record ID and shall track whether the record has been acknowledged by the Monitoring System.|
|**FR-LOG-09**|The ADC shall support storage of at least 500 event records and at least 100 fault records locally.|
|**FR-LOG-10**|The ADC shall not overwrite unacknowledged event or fault records when local log storage becomes full.|
|**FR-LOG-11**|Level 3 users shall be able to clear local records only after those records have been transmitted to and acknowledged by the Monitoring System. Clearing records shall itself create an audit event.|
|**FR-LOG-12**|If a required audit record cannot be created because local log storage is full and synchronization is unavailable, the ADC shall reject protected operations that would otherwise occur without an audit record.|

## 5\. Fault detection

|ID|Requirement|
|-|-|
|**FR-FAULT-01**|The ADC shall detect when a medication door or drawer fails to close after a dispensing or replenishment operation.|
|**FR-FAULT-02**|The ADC shall detect when a medication door or drawer fails to unlock following an authorized access request.|
|**FR-FAULT-03**|The ADC shall prevent normal medication access while an error or critical fault remains active.|
|**FR-FAULT-04**|The ADC shall provide a restricted fault-clear authentication path while in Fault Mode. Error faults may be cleared by Level 2 or Level 3 users, while critical faults may only be cleared by Level 3 users.|
|**FR-FAULT-05**|The ADC shall prevent a recorded fault from being cleared while its triggering condition is still present.|
|**FR-FAULT-06**|The ADC shall classify detected conditions as informational, warning, error, or critical. Informational and warning conditions shall keep the ADC in Normal Mode. Error and critical conditions shall place the ADC in Fault Mode.|
|**FR-FAULT-07**|The ADC shall display and record an informational condition when a dispensing request is rejected because the medication is empty, a withdrawal limit has been reached, or a repeat-withdrawal warning is generated.|
|**FR-FAULT-08**|The ADC shall display, record, and communicate warning conditions including a medication door remaining open during an active session, low medication quantity, or loss of Monitoring System communication.|
|**FR-FAULT-09**|The ADC shall treat a medication door remaining open after the authenticated session expires as an error fault and shall enter Fault Mode after the door is closed.|
|**FR-FAULT-10**|The ADC shall record and flag detected unauthorized-access attempts.|
|**FR-FAULT-11**|The ADC shall enter Fault Mode when the software can no longer determine a safe operational state, required authorization data is unavailable/corrupted, or required inventory state is unusable. Such conditions shall be treated as critical faults.|
|**FR-FAULT-12**|The ADC shall generate a low-medication warning when recorded quantity falls to 10% or less of the quantity entered when the medication was initially loaded.|

## 6\. Operational mode management

|ID|Requirement|
|-|-|
|**FR-MODE-01**|The ADC shall support Normal, Maintenance, and Fault operating modes.|
|**FR-MODE-02**|The ADC shall enter Fault Mode within 3 seconds after an error or critical fault condition is detected.|
|**FR-MODE-03**|The ADC shall allow an authorized Level 3 user to enter Maintenance Mode.|
|**FR-MODE-04**|Maintenance Mode shall support test functions, general system information, password and permission changes, configuration changes, and access to fault and event logs.|
|**FR-MODE-05**|Fault Mode shall lock medication access where possible, disable normal login and medication operations, display the active fault and required authorization level, and notify the Monitoring System. A restricted fault-clear login shall remain available.|
|**FR-MODE-06**|Fault information displayed by the ADC shall include the fault severity and fault type, such as door, inventory, authorization, communication, or software fault.|
|**FR-MODE-07**|Normal Mode shall support authentication, permitted medication dispensing, inventory operations, event logging, fault detection, and external communication.|
|**FR-MODE-08**|**\[Optional]** The ADC shall support software-initiated restart, sleep, and shutdown operations for Level 3 users.|
|**FR-MODE-09**|**\[Optional]** After a software restart, the ADC shall restore locally retained operational information required to resume safe operation.|

## 7\. External communication - ADC / Monitoring System

|ID|Requirement|
|-|-|
|**FR-COM-01**|Each ADC shall exchange operational information with the separate Monitoring System.|
|**FR-COM-02**|While communication is available, the ADC shall send a status update to the Monitoring System every 30 seconds.|
|**FR-COM-03**|The ADC shall transmit new or unsent medication-activity records, event records, and fault records to the Monitoring System.|
|**FR-COM-04**|Every ADC status message shall include the ADC's unique cabinet ID. The ADC shall also store its configured hospital room or wing location.|
|**FR-COM-05**|The ADC shall receive commands and remote operation requests sent by the Monitoring System, including authorized remote unlock requests.|
|**FR-COM-06**|Before accepting a Monitoring System command, the ADC shall validate the authenticated source, command ID, command format, supplied authorization information, and applicable local safety conditions.|
|**FR-COM-07**|A remote unlock request shall not unlock a storage location until the ADC has independently confirmed the request by completing its local authorization, inventory, withdrawal-policy, logging, and fault-state checks. A request from Part B alone shall not be sufficient to activate the lock.|
|**FR-COM-08**|The ADC shall send the outcome of each accepted Monitoring System command back to the Monitoring System and include the associated command ID.|
|**FR-COM-09**|The ADC shall detect when communication with the Monitoring System is lost and shall record and display a communication warning.|
|**FR-COM-10**|The ADC shall continue locally permitted operations while the Monitoring System is unavailable, provided local safety, authorization, inventory, logging, and fault checks can still be satisfied.|
|**FR-COM-11**|The ADC shall store operational records locally while the Monitoring System is unavailable and shall retry transmission after communication is restored.|
|**FR-COM-12**|The ADC shall retain an unsent record until the Monitoring System acknowledges its record ID.|
|**FR-COM-13**|The ADC and Monitoring System shall use unique event, fault, and command identifiers so retransmitted information is not treated as a new event or command.|
|**FR-COM-14**|The ADC shall transmit authorized inventory information to the Monitoring System, including medication ID, medication name, strength, patient name, recorded quantity, storage location, last-access information, and configured withdrawal-policy information required by the agreed interface.|
|**FR-COM-15**|ADC status information shall include, at minimum, cabinet ID, configured location, number of occupied and empty storage locations, active faults, and log/synchronization status.|

## Current assumptions / decisions

* The prototype assumes **5 medication storage containers**.
* Each storage container is assumed to hold a maximum of **20 medication units**.
* Medication quantity is **software-recorded/manual**. The prototype does not use a medication-counting sensor.
* The user confirms the quantity actually withdrawn before recorded inventory is updated.
* Passwords are individual to each user rather than shared by authorization level.
* Patient name is part of the medication record.
* Withdrawal-policy groups are configured manually by Level 2 or Level 3. The ADC does not infer that different medication strengths or different patients should share a limit.
* Level 2 has limited log access needed for replenishment, inventory correction, and current error-fault recovery. Level 3 has full historical log access.
* The ADC has a unique cabinet ID and configurable hospital room/wing location.
* The ADC uses a configurable local time zone. Log timestamps use `MM/DD/YYYY` with a 24-hour clock.
* The Monitoring System status cycle is currently **30 seconds**.
* Part B may request remote unlocking, but Part A must independently validate and confirm the request before access is provided.
* The exact authentication technology used between Part A and Part B is a later design decision.
* Restart, sleep, shutdown, and restart-state restoration are optional for the minimum implementation.

