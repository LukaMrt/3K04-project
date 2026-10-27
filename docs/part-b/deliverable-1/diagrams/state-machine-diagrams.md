# State Machine Diagrams - Part B (Hospital Monitoring System)

Notation: `event [guard] / action`. Square brackets only hold guards; the requirements a transition realises are given in parentheses. `when(condition)` is a change event: the transition is taken as soon as the condition becomes true.

## 1. Cabinet Health & Connectivity State Machine

One instance per ADC identifier. `silence` is the time elapsed since the ADC's last valid heartbeat, or since its registration until its first heartbeat (FR-HLT-06).

```mermaid
stateDiagram-v2
    direction TB

    state RegistrationCheck <<choice>>
    [*] --> Unregistered
    Unregistered --> Unregistered : heartbeat / discard and log (NFR-SEC-03)
    Unregistered --> RegistrationCheck : registration request
    RegistrationCheck --> Unregistered : [request invalid] / log the rejection (FR-HIS-08)
    RegistrationCheck --> Monitored : [request valid] / store the ADC, last heartbeat time set to the registration time (FR-COM-01, FR-HLT-06)

    state Monitored {
        direction LR

        state "Connectivity (detected by the system)" as Connectivity {
            [*] --> Reachable
            Reachable --> Reachable : heartbeat / record reception time (FR-COM-03)
            Reachable --> Unreachable : when(silence ≥ 45 s) [silence < 75 s] / label status and inventory stale, record status change (FR-HLT-02, NFR-SAF-01, FR-HIS-03)
            Reachable --> Offline : when(silence ≥ 75 s) / raise communication loss alarm, record status change (FR-HLT-03, FR-HLT-04)
            Unreachable --> Reachable : heartbeat / record reception time, clear stale label (FR-HLT-05)
            Unreachable --> Offline : when(silence ≥ 75 s) / raise communication loss alarm, record status change (FR-HLT-03, FR-HLT-04)
            Offline --> Reachable : heartbeat / record reception time, resynchronise inventory and transactions (FR-HLT-05, FR-INV-01)
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

The two regions of *Monitored* run in parallel for each registered ADC.

- **Timed transitions**: both thresholds are measured from the last heartbeat, not from the entry into the current state: an ADC silent since its last heartbeat becomes *Unreachable* at 45 s and *Offline* at 75 s. *Reachable* → *Offline* is taken only if the silence goes past 75 s before the 45 s transition was taken (for example, while the system restarts).
- **Displayed status** (D-02, NFR-SAF-03): UNREACHABLE or OFFLINE whenever the connectivity region is not in *Reachable*; otherwise the state of the reported operational region.
- **Commands**: a "maintenance mode" command changes nothing in this machine until a heartbeat reports "maintenance"; its outcome is tracked by the command itself (FR-COM-06, FR-COM-11).
- **Invalid events**:
  - a heartbeat from an unregistered ADC is discarded and logged, and the ADC stays *Unregistered* (NFR-SEC-03);
  - an invalid registration request leaves the ADC *Unregistered* (FR-HIS-08);
  - a registration of an already registered ADC (re-registration, e.g. after a restart) is an internal event of *Monitored*: it only replaces the ADC's label, contact address and location, and leaves both regions and the last heartbeat time unchanged (FR-COM-02).

## 2. Alarm Lifecycle State Machine

One instance per recorded alarm. An alarm is created in two ways: from a valid alarm transaction received in a heartbeat (FR-ALM-01), or by the system when an ADC is marked offline (communication loss alarm, severity "error", FR-HLT-04). A transaction that is incomplete, has an unknown severity or was already received never creates an alarm: it is rejected or acknowledged as a duplicate before (activity diagram 2, FR-ALM-02, FR-ALM-03, FR-COM-08). `age` is the time elapsed since the alarm was raised.

```mermaid
stateDiagram-v2
    direction TB

    state "Unacknowledged" as Unacknowledged
    state "Acknowledged" as Acknowledged

    [*] --> Unacknowledged : / record the alarm (FR-ALM-01, FR-HLT-04)

    Unacknowledged : entry / display within 2 s with text label, visual and audible cue (NFR-PRF-01, NFR-ACC-01, NFR-ACC-02)
    Unacknowledged : do / repeat the audible cue every 60 s if critical (NFR-SAF-04)
    Unacknowledged : acknowledge request [role not permitted] / show permission message (NFR-SEC-02)

    Unacknowledged --> Acknowledged : acknowledge request [role permitted] / record user and time, write audit entry (FR-ALM-05, NFR-AUD-01, D-09)

    Acknowledged : acknowledge request / refuse, show who acknowledged and when (FR-ALM-06)

    Unacknowledged --> [*] : when(age ≥ 1 year) / purge (FR-HIS-01, FR-HIS-09)
    Acknowledged --> [*] : when(age ≥ 1 year) / purge with its acknowledgement (FR-HIS-01, FR-HIS-09)
```

- **Internal transitions**: the refused acknowledgements are written inside the states (`event [guard] / action`). They do not leave the state, so the entry action (display and cue) is not executed again.
- **ADC communicating again**: no event of the ADC changes an alarm. A communication loss alarm stays *Unacknowledged* when its ADC comes back, until a user acknowledges it (FR-HLT-07, D-18).
- **Permitted roles**: nurse, pharmacist and technician (D-09).
