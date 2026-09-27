# Sequence Diagrams — Part B (Hospital Monitoring System)

## 1. ADC Registration and Heartbeat (Scenario 3)

```mermaid
sequenceDiagram
    participant ADC as ADC Unit
    participant Unknown as Unregistered device
    participant CommMgr as ADC Communication Manager
    participant HealthMon as Cabinet Health Monitor
    participant InvSup as Inventory Supervisor
    participant HistStore as Historical Data Store
    participant Dashboard as Operator Dashboard

    ADC->>CommMgr: register(id, address, location with floor)
    alt identifier not yet registered
        CommMgr->>CommMgr: store registration (FR-COM-01)
        CommMgr-->>ADC: registration accepted
        CommMgr->>Dashboard: add ADC to the cabinet list
    else identifier already registered
        CommMgr->>CommMgr: log rejection
        CommMgr-->>ADC: registration rejected (FR-COM-02)
    end

    opt heartbeat sent by a device that never registered (e.g. ADC-999)
        Unknown->>CommMgr: heartbeat
        CommMgr->>CommMgr: discard and log, no acknowledgement (NFR-SEC-03)
        Note over Unknown,CommMgr: Unregistered senders are ignored, so a rogue or misconfigured device cannot inject data
    end

    loop at most every 30 s
        ADC->>CommMgr: heartbeat(status, complete inventory, unacknowledged transactions) (FR-COM-07)
        CommMgr->>CommMgr: skip transaction IDs already received (FR-COM-08)
        CommMgr-->>ADC: acknowledgement(status per transaction ID: received / rejected) (FR-REQ-01)
        Note over ADC: removes the acknowledged transactions from memory
        CommMgr->>HealthMon: reception time and reported status (FR-COM-03)
        CommMgr->>InvSup: complete inventory (FR-INV-01)
        CommMgr->>HistStore: new dispensing activities (FR-HIS-02)
        HealthMon->>Dashboard: show reported state (FR-HLT-01)
    end

    opt acknowledgement lost on the network
        ADC->>CommMgr: next heartbeat resends the same transactions
        CommMgr->>CommMgr: already received, not recorded again (FR-COM-08)
        CommMgr-->>ADC: acknowledgement lists them again as "received"
    end

    opt no heartbeat for 45 s
        HealthMon->>Dashboard: mark "unreachable" and label data "stale" (FR-HLT-02, NFR-SAF-01)
        opt still no heartbeat at 75 s
            HealthMon->>Dashboard: mark "offline" whatever the reported state (FR-HLT-03)
            HealthMon->>Dashboard: raise communication alert (FR-HLT-04)
        end
        opt ADC communicates again
            ADC->>CommMgr: heartbeat(status, complete inventory, transactions kept during the outage)
            CommMgr-->>ADC: acknowledgement(status per transaction ID)
            CommMgr->>InvSup: complete inventory, resynchronised (FR-INV-01)
            CommMgr->>HistStore: transactions kept during the outage
            CommMgr->>HealthMon: reception time and reported status
            HealthMon->>Dashboard: return to last reported state (FR-HLT-05)
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
    alt ADC, type and severity present
        CommMgr-->>ADC: acknowledgement(alarm ID: "received") (FR-REQ-01)
        CommMgr->>AlarmMgr: forward new alarm
        AlarmMgr->>HistStore: record alarm with timestamp, ADC, type, severity (FR-ALM-01)
        AlarmMgr->>Dashboard: push unacknowledged alarm (FR-ALM-04)
        Dashboard-->>User: alarm within 2 s, text severity label, visual and audible cue (NFR-PRF-01, NFR-ACC-01, NFR-ACC-02)
    else a field is missing
        CommMgr->>CommMgr: reject and log the alarm (FR-ALM-02)
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
            Dashboard-->>User: name of the acknowledging user (FR-ALM-06)
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
        CommMgr->>HistStore: log user ID, command, ADC, time (NFR-AUD-01)
        CommMgr->>ADC: command
        alt ADC acknowledges within 10 s
            ADC-->>CommMgr: acknowledgement
            CommMgr-->>Dashboard: command delivered
            Dashboard-->>Tech: "delivered"
        else no acknowledgement within 10 s
            CommMgr->>CommMgr: mark the command "failed" (FR-COM-06)
            CommMgr-->>Dashboard: command failed
            Dashboard-->>Tech: failure notification
        end
    end

    Note over Tech,ADC: Same sequence for a configuration sent by an Administrator (FR-COM-05)
```
