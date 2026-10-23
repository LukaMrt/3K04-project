# Specification of Safety-Critical Functions

These safety-critical functions are formally specified with Pre-conditions, Post-conditions / Effects, State Invariants, and Exceptions.

## 1. Offline Detection (`checkTimeouts`)
* **Module:** Cabinet Health Monitor
* **State Invariant:** For every registered ADC `a`, its connectivity status is strictly determined by silence duration `silence(a) = now - lastContact(a)`. An ADC marked `Unreachable` or `Offline` shall **never** be displayed as `Online`.
* **Pre-conditions:** Executed periodically (e.g., every 1 second by a system scheduler).
* **Post-conditions / Effects:** For each registered ADC `a`:
  * **Transition to Unreachable:** If `45s <= silence(a) < 75s` and connectivity was `Reachable`: set connectivity to `Unreachable`, label status and inventory as `stale`, record status change in history, and announce status change.
  * **Transition to Offline:** If `silence(a) >= 75s` and connectivity was not `Offline`: set connectivity to `Offline`, record status change in history, invoke `AlarmManager.raiseCommunicationLoss(a)`, and announce status change.
  * **Communication Loss Alarm:** Generates an alarm of type `communication_loss` and severity `error` with timestamp = current time. This alarm is raised **only once** upon entering `Offline`.
* **Exceptions:** `StorageUnavailableError` (if status change logging fails).

---

## 2. Alarm Handling (`recordFromAdc`)
* **Module:** Alarm Manager
* **State Invariant:** Unacknowledged `critical` alarms repeat their audible cue every 60 seconds. No alarm can be marked as acknowledged without explicit authorized user action.
* **Pre-conditions:** Alarm transaction payload received via a heartbeat from a registered ADC.
* **Post-conditions / Effects:**
  * **Valid New Alarm:** If transaction ID is new, required fields are present (ADC ID, timestamp, type, severity), and severity in `{"info", "warning", "error", "critical"}`:
    * Store alarm as `unacknowledged` using the ADC's originating timestamp.
    * Announce alarm to Dashboard for display within 2 seconds with text severity label, visual cue, and audible cue.
    * Return transaction acknowledgement status `received`.
  * **Duplicate Transaction ID:** Do not record or display again; return transaction acknowledgement status `received`.
  * **Invalid / Missing Fields / Unknown Severity:** Reject alarm, log rejection reason in system log, do not display on dashboard, and return transaction acknowledgement status `rejected`.
* **Exceptions:** `StorageUnavailableError`.

---

## 3. Alarm Acknowledgement (`acknowledge`)
* **Module:** Alarm Manager
* **State Invariant:** Once an alarm becomes `acknowledged`, it can **never** revert to `unacknowledged`. Re-establishing communication with an offline ADC does **not** clear an unacknowledged communication loss alarm.
* **Pre-conditions:** User is authenticated; User role in `{"Nurse", "Pharmacist", "Technician"}` (Administrators cannot acknowledge alarms). Target `alarmId` exists.
* **Post-conditions / Effects:**
  * **If Currently Unacknowledged:**
    * Change alarm state to `acknowledged(userId, timestamp)`.
    * Append audit log entry `(userId, "acknowledge", targetAdc, timestamp)`.
    * Stop active audible cue repetition and remove alarm from active unacknowledged list.
  * **If Already Acknowledged:**
    * Reject acknowledgement request, leave state unchanged, and display to the requesting user which user previously acknowledged it and when.
* **Exceptions:** `UnknownAlarmError`, `StorageUnavailableError`.

---

## 4. Command Sending (`sendCommand`)
* **Module:** ADC Communication Manager
* **State Invariant:** No command or configuration message shall be sent to an ADC marked `Offline`. A command is marked `delivered` **only** when the received response contains matching `commandId` **and** `adcId`.
* **Pre-conditions:** User is authenticated; User role in `{"Technician", "Administrator"}`. Target `adcId` is registered.
* **Post-conditions / Effects:**
  * **If Target ADC is Offline:** Refuse request immediately without transmitting over network; inform user "ADC is offline"; record audit outcome `refused`.
  * **If Target ADC is Not Offline:** Transmit command payload `(commandId, adcId, command, parameters)` to ADC; append audit entry `(userId, action, targetAdc, timestamp)`; start 10-second timer.
  * **On Matching Acknowledgement within 10s:** Mark command status `delivered`, notify requesting user.
  * **On Timeout (>10s) or Mismatched Ack:** Mark command status `failed`, notify requesting user, log outcome `failed`. No automatic retries are performed.
* **Exceptions:** `UnknownAdcError`.
