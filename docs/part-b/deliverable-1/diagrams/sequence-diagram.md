# Sequence Diagrams - Part B (Hospital Monitoring System)

ADCs are designated by their label (e.g. "ADC-205"); the messages carry their identifier, a UUID v4 (A-21).

## 1. ADC Registration and Heartbeat (Scenario 3)

```mermaid
sequenceDiagram
    participant ADC as ADC Unit
    participant Unknown as Unregistered device
    participant CommMgr as ADC Communication Manager
    participant HealthMon as Cabinet Health Monitor
    participant AlarmMgr as Alarm Manager
    participant InvSup as Inventory Supervisor
    participant HistStore as Historical Data Store
    participant Dashboard as Operator Dashboard

    ADC->>CommMgr: register(id, label, address, location with floor)
    alt identifier not yet registered
        CommMgr->>CommMgr: store registration (FR-COM-01)
        CommMgr-->>ADC: registration accepted
        CommMgr->>Dashboard: add ADC to the cabinet list
    else identifier already registered (e.g. the ADC restarted)
        CommMgr->>CommMgr: replace contact address and location (FR-COM-02)
        CommMgr->>HistStore: log re-registration (FR-HIS-08)
        CommMgr-->>ADC: registration accepted
    end

    opt heartbeat sent by a device that never registered (e.g. ADC-999)
        Unknown->>CommMgr: heartbeat
        CommMgr->>HistStore: log discard, no acknowledgement (NFR-SEC-03)
        Note over Unknown,CommMgr: Unregistered senders are ignored, so a rogue or misconfigured device cannot inject data
    end

    loop at most every 30 s
        ADC->>CommMgr: heartbeat(status, complete inventory, unacknowledged transactions) (FR-COM-07)
        CommMgr->>CommMgr: skip transaction IDs already received (FR-COM-08)
        CommMgr->>HistStore: new dispensing activities (FR-HIS-02)
        CommMgr->>HealthMon: reception time and reported status (FR-COM-03)
        CommMgr->>InvSup: complete inventory (FR-INV-01)
        CommMgr-->>ADC: acknowledgement(status per transaction ID: received / rejected), sent once recorded (FR-REQ-01)
        Note over ADC: removes the acknowledged transactions from memory
        HealthMon->>Dashboard: show reported state (FR-HLT-01)
    end

    opt acknowledgement lost on the network
        ADC->>CommMgr: next heartbeat resends the same transactions
        CommMgr->>CommMgr: already received, not recorded again (FR-COM-08)
        CommMgr-->>ADC: acknowledgement lists them again as "received"
    end

    opt no heartbeat for 45 s
        HealthMon->>HistStore: record status change (FR-HIS-03)
        HealthMon->>Dashboard: mark "unreachable" and label status and inventory "stale" (FR-HLT-02, NFR-SAF-01)
        opt still no heartbeat at 75 s
            HealthMon->>HistStore: record status change (FR-HIS-03)
            HealthMon->>Dashboard: mark "offline" whatever the reported state (FR-HLT-03)
            HealthMon->>AlarmMgr: raise "communication loss" alarm (FR-HLT-04)
            AlarmMgr->>HistStore: record the alarm (FR-ALM-01)
            AlarmMgr->>Dashboard: push unacknowledged alarm within 2 s (FR-ALM-04, NFR-PRF-01)
        end
        opt ADC communicates again
            ADC->>CommMgr: heartbeat(status, complete inventory, transactions kept during the outage)
            CommMgr->>HistStore: transactions kept during the outage
            CommMgr->>InvSup: complete inventory, resynchronised (FR-INV-01)
            CommMgr->>HealthMon: reception time and reported status
            CommMgr-->>ADC: acknowledgement(status per transaction ID)
            HealthMon->>HistStore: record status change (FR-HIS-03)
            HealthMon->>Dashboard: show the state reported in the heartbeat (FR-HLT-05)
            Note over AlarmMgr: the "communication loss" alarm stays unacknowledged (FR-HLT-07)
        end
    end
```

## 2. Alarm Reception and Acknowledgement (Scenario 2)

```mermaid
sequenceDiagram
    participant ADC as ADC Unit
    participant CommMgr as ADC Communication Manager
    participant AlarmMgr as Alarm Manager
    participant HistStore as Historical Data Store
    participant Dashboard as Operator Dashboard
    participant UserMgmt as User Management / Auth
    actor User as Nurse

    Note over ADC: raises an alarm and sends a heartbeat immediately, without waiting for the 30 s period
    ADC->>CommMgr: heartbeat(status, inventory, transactions including the new alarm)
    alt alarm ID already received
        CommMgr->>CommMgr: not recorded again (FR-COM-08)
        CommMgr-->>ADC: acknowledgement(alarm ID: "received") (FR-REQ-01)
    else ADC, timestamp, type and a valid severity present
        CommMgr->>AlarmMgr: forward new alarm
        AlarmMgr->>HistStore: record alarm with the ADC's timestamp, ADC, type, severity (FR-ALM-01)
        CommMgr-->>ADC: acknowledgement(alarm ID: "received"), sent once recorded (FR-REQ-01)
        AlarmMgr->>Dashboard: push unacknowledged alarm (FR-ALM-04)
        Dashboard-->>User: alarm within 2 s, text severity label, visual and audible cue (NFR-PRF-01, NFR-ACC-01, NFR-ACC-02)
    else a field is missing or the severity is unknown
        CommMgr->>HistStore: log the rejected alarm (FR-ALM-02, FR-ALM-03, FR-HIS-08)
        CommMgr-->>ADC: acknowledgement(alarm ID: "rejected") (FR-REQ-01)
    end

    User->>Dashboard: acknowledge the alarm
    Dashboard->>UserMgmt: check role permission
    alt role not permitted
        UserMgmt-->>Dashboard: denied
        Dashboard-->>User: permission message (NFR-SEC-02)
    else role permitted
        UserMgmt-->>Dashboard: granted
        Dashboard->>AlarmMgr: acknowledge(alarmId, userId)
        alt alarm already acknowledged
            AlarmMgr-->>Dashboard: refused, acknowledged by another user
            Dashboard-->>User: which user acknowledged it (FR-ALM-06)
        else alarm not yet acknowledged
            AlarmMgr->>HistStore: log user ID, action, ADC, time (NFR-AUD-01)
            AlarmMgr-->>Dashboard: alarm acknowledged (FR-ALM-05)
            Dashboard-->>User: alarm shown acknowledged with the user ID
        end
    end
```

## 3. Command or Configuration to an ADC

```mermaid
sequenceDiagram
    actor Tech as Technician / Administrator
    participant Dashboard as Operator Dashboard
    participant UserMgmt as User Management / Auth
    participant CommMgr as ADC Communication Manager
    participant HistStore as Historical Data Store
    participant ADC as ADC Unit

    Tech->>Dashboard: send a command to ADC-205
    Dashboard->>UserMgmt: check role permission
    alt role not permitted
        UserMgmt-->>Dashboard: denied
        Dashboard-->>Tech: permission message, nothing sent (NFR-SEC-02)
    else role permitted
        UserMgmt-->>Dashboard: granted
        Dashboard->>CommMgr: send command (FR-COM-04)
        alt ADC-205 marked "offline"
            CommMgr->>HistStore: log outcome "refused" (NFR-AUD-05)
            CommMgr-->>Dashboard: refused, ADC offline (FR-COM-12)
            Dashboard-->>Tech: "ADC-205 is offline", nothing sent
        else ADC-205 not offline
            CommMgr->>HistStore: log user ID, command, ADC, time (NFR-AUD-01)
            CommMgr->>ADC: command(command ID)
            alt acknowledgement with the command ID and "ADC-205" within 10 s
                ADC-->>CommMgr: acknowledgement(command ID, ADC-205)
                CommMgr->>HistStore: log outcome "delivered" (NFR-AUD-05)
                CommMgr-->>Dashboard: command delivered (FR-COM-11)
                Dashboard-->>Tech: "delivered"
            else no matching acknowledgement within 10 s
                CommMgr->>CommMgr: mark the command "failed" (FR-COM-06)
                CommMgr->>HistStore: log outcome "failed" (NFR-AUD-05)
                CommMgr-->>Dashboard: command failed
                Dashboard-->>Tech: failure notification
            end
        end
    end

    Note over Tech,ADC: Same sequence for a configuration sent by an Administrator (FR-COM-05)
```
