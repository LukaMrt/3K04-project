# State Machine Diagrams - Part B (Hospital Monitoring System)

## 1. Cabinet Health & Connectivity State Machine

```mermaid
stateDiagram-v2
    direction TB

    state RegistrationCheck <<choice>>
    [*] --> RegistrationCheck : registration request
    RegistrationCheck --> Rejected : [request invalid] / log the rejection [FR-HIS-08]
    RegistrationCheck --> Monitored : [new identifier] / store the ADC, last heartbeat time set to the registration time [FR-COM-01, FR-HLT-06]
    Rejected --> [*]

    state Monitored {
        direction LR

        state "Connectivity (detected by the system)" as Connectivity {
            [*] --> Reachable
            Reachable --> Reachable : heartbeat / record reception time, restart timer [FR-COM-03]
            Reachable --> Unreachable : after(45 s) without heartbeat / label status and inventory stale, record status change [FR-HLT-02, NFR-SAF-01, FR-HIS-03]
            Unreachable --> Reachable : heartbeat / clear stale label [FR-HLT-05]
            Unreachable --> Offline : after(75 s) without heartbeat / record status change, raise communication loss alarm [FR-HLT-03, FR-HLT-04]
            Offline --> Reachable : heartbeat / resynchronise inventory and transactions [FR-HLT-05, FR-INV-01]
        }

        --

        state "Reported operational state (from heartbeats)" as Operational {
            [*] --> NotReported
            NotReported --> Online : heartbeat reports online
            NotReported --> Maintenance : heartbeat reports maintenance
            NotReported --> Fault : heartbeat reports fault
            Online --> Maintenance : heartbeat reports maintenance
            Online --> Fault : heartbeat reports fault
            Maintenance --> Online : heartbeat reports online
            Maintenance --> Fault : heartbeat reports fault
            Fault --> Online : heartbeat reports online
            Fault --> Maintenance : heartbeat reports maintenance
        }
    }
```

The two regions run in parallel for each registered ADC.

- **Displayed status** (D-02, NFR-SAF-03): UNREACHABLE or OFFLINE whenever the connectivity region is not in *Reachable*; otherwise the state of the reported operational region.
- **Commands**: a "maintenance mode" command changes nothing in this machine until a heartbeat reports "maintenance"; its outcome is tracked by the command itself (FR-COM-06, FR-COM-11).
- **Invalid events**: a heartbeat from an unregistered ADC is discarded and logged, and causes no transition (NFR-SEC-03); a registration of an already registered ADC (re-registration, e.g. after a restart) only replaces its contact address and location and causes no transition: the connectivity and reported states, and the last heartbeat time, are kept (FR-COM-02).

## 2. Alarm Lifecycle State Machine

```mermaid
stateDiagram-v2
    direction TB

    state Origin <<choice>>
    state Validation <<choice>>
    [*] --> Origin : alarm event
    Origin --> Validation : [alarm transaction received in a heartbeat]
    Origin --> Unacknowledged : [ADC marked offline] / create "communication loss" alarm, severity error [FR-HLT-04]

    Validation --> [*] : [transaction ID already received] / not recorded again, ACK "received" [FR-COM-08, FR-REQ-01]
    Validation --> Rejected : [ADC, timestamp, type or severity missing, or unknown severity] / log, ACK "rejected" [FR-ALM-02, FR-ALM-03, FR-REQ-01]
    Validation --> Unacknowledged : [valid] / record, then ACK "received" [FR-ALM-01, FR-REQ-01]

    Unacknowledged : entry / display within 2 s with text label, visual and audible cue (NFR-PRF-01, NFR-ACC-01, NFR-ACC-02)
    Unacknowledged : do / repeat the audible cue every 60 s if critical (NFR-SAF-04)

    Unacknowledged --> Unacknowledged : acknowledge request [role not permitted] / permission message [NFR-SEC-02]
    Unacknowledged --> Unacknowledged : ADC communicates again / stays unacknowledged [FR-HLT-07]
    Unacknowledged --> Acknowledged : acknowledge request [nurse, pharmacist or technician] / record user, audit log [FR-ALM-05, NFR-AUD-01, D-09]
    Acknowledged --> Acknowledged : acknowledge request / refuse, show who acknowledged [FR-ALM-06]

    Unacknowledged --> [*] : after(1 year) / purge [FR-HIS-01, FR-HIS-09]
    Acknowledged --> [*] : after(1 year) / purge [FR-HIS-01, FR-HIS-09]
    Rejected --> [*] : after(1 year) / purge the log entry [FR-HIS-08, FR-HIS-09]
```
