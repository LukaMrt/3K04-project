# State Machine Diagrams — Part B (Hospital Monitoring System)

## 1. Cabinet Health & Connectivity State Machine

stateDiagram-v2
    direction TB

    [*] --> Registering
    
    state Registering {
        [*] --> PendingAuth
        PendingAuth --> Registered : Valid Credentials & Unique ID [FR-COM-01]
        PendingAuth --> Rejected : Duplicate ID / Unregistered [FR-COM-02]
        Rejected --> [*]
    }

    Registered --> ActiveMonitoring : Heartbeat Started

    state ActiveMonitoring {
        direction LR

        state "Connectivity Health" as Connectivity {
            [*] --> Online : Heartbeat < 30s [FR-COM-03]
            
            Online --> Unreachable : Heartbeat silent > 45s / Label 'Stale' [FR-HLT-02, NFR-SAF-01]
            Unreachable --> Online : Heartbeat received / Clear 'Stale' [FR-HLT-05]
            
            Unreachable --> Offline : Heartbeat silent > 75s / Raise Alert [FR-HLT-03, FR-HLT-04]
            Offline --> Online : Heartbeat received / Recover State & Sync [FR-HLT-05]
        }

        --

        state "Reported Operational State" as Operational {
            [*] --> Normal
            Normal --> Maintenance : ADC Reports Maintenance / Tech Command [FR-COM-04]
            Maintenance --> Normal : Maintenance Complete
            Normal --> Fault : Hardware/Drawer Fault Detected [FR-HLT-01]
            Fault --> Normal : Fault Cleared
        }
    }

    note right of Offline
        D-02: Connectivity status overrides 
        reported state (e.g. Offline device 
        cannot be shown as Healthy/Normal).
    end note

## 2. Alarm Lifecycle State Machine

stateDiagram-v2
    direction LR

    [*] --> Received : Immediate Heartbeat with Alarm Payload [FR-ALM-01]

    state IngestionValidation <<choice>>
    Received --> IngestionValidation

    IngestionValidation --> Rejected : Missing Fields (ADC, Type, Severity) [FR-ALM-02]
    Rejected --> [*] : Log Failure & ACK "rejected" [FR-REQ-01]

    IngestionValidation --> Unacknowledged : Valid Payload [FR-ALM-01]

    state Unacknowledged {
        [*] --> Displayed : Render on Dashboard < 2s [NFR-PRF-01]
        Displayed --> VisualAudibleAlert : Trigger Text, Visual & Audible Cues [NFR-ACC-01, NFR-ACC-02]
    }

    Unacknowledged --> Acknowledging : User clicks 'Acknowledge' [FR-ALM-05]

    state RoleCheck <<choice>>
    Acknowledging --> RoleCheck

    RoleCheck --> Unacknowledged : Role Unauthorized (Admin/Guest) / Display Permission Error [NFR-SEC-02]
    RoleCheck --> AlreadyAckCheck : Role Authorized (Nurse/Pharm/Tech) [D-09]

    state AlreadyAckCheck <<choice>>
    AlreadyAckCheck --> Unacknowledged : Already Acked / Show original User ID [FR-ALM-06]
    AlreadyAckCheck --> Acknowledged : First Ack / Record User, Action, Time [FR-ALM-05, NFR-AUD-01]

    Acknowledged --> PersistentHistory : Retained for 1 Year [FR-HIS-01]
    PersistentHistory --> [*]