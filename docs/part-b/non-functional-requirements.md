# Non-Functional Requirements — Part B (Hospital Monitoring System)

## Safety (SAF) — what must never happen?

- **NFR-SAF-01** The system shall label as "stale", together with its last-update time, any ADC status that has not been updated for more than 45 seconds.
- **NFR-SAF-02** The system shall never display an alarm as acknowledged unless a user has explicitly acknowledged it.
- **NFR-SAF-03** The system shall display an ADC as "online" only while it is marked neither "unreachable" (FR-HLT-02) nor "offline" (FR-HLT-03).

## Security & Privacy (SEC) — who may do what?

- **NFR-SEC-01** The system shall require authentication before displaying the dashboard, patient-related data and medication-related data.
- **NFR-SEC-02** The system shall restrict alarm acknowledgement and ADC commands to the roles permitted for them.
- **NFR-SEC-03** The system shall discard any heartbeat sent by an ADC that is not registered.
- **NFR-SEC-04** The system shall display patient identifiers in reports only to users holding one of the following roles: pharmacist, administrator.

## Reliability (REL) — how often may it fail?

- **NFR-REL-01** The system shall make every transaction it has acknowledged to an ADC retrievable from the historical data.
- **NFR-REL-02** The system shall have fewer than 1 unplanned outage per 1,000 hours of operation.

## Availability (AVL) — when must it be usable?

- **NFR-AVL-01** The system shall remain available to operator users while one or more ADCs are offline.
- **NFR-AVL-02** The system shall keep processing events from connected ADCs while one or more other ADCs are offline.
- **NFR-AVL-03** The system shall be available to operator users at least 99.5% of each calendar month, excluding scheduled maintenance windows.
- **NFR-AVL-04** The system shall operate for at least 30 consecutive days without requiring a restart.

## Performance (PRF) — how fast?

- **NFR-PRF-01** The system shall display a newly received alarm on the dashboard within 2 seconds of its receipt.
- **NFR-PRF-02** The system shall meet NFR-PRF-01 with up to 50 simultaneously connected ADCs.

## Traceability / Auditability (AUD) — can we reconstruct what happened?

- **NFR-AUD-01** The system shall log every alarm acknowledgement and every ADC command with the user ID, the action, the target ADC and the timestamp.
- **NFR-AUD-02** The system shall prevent every user role from modifying historical data.
- **NFR-AUD-03** The system shall prevent every user role from deleting historical data.

## Usability (USA) — can the intended user do it correctly?

- **NFR-USA-01** The system shall show on the dashboard's main view, without further navigation, every ADC in at least one of the following situations: unreachable, offline, in fault, flagged "Low Stock", holding an unacknowledged critical alarm.
- **NFR-USA-02** The system shall use the same label for a given status value on the dashboard, in reports and in history views.
- **NFR-USA-03** The system shall allow a trained user to acknowledge an active alarm in under 15 seconds from its appearance on the dashboard.

## Accessibility (ACC)

- **NFR-ACC-01** The system shall present every new alarm with both a visual cue and an audible cue.
- **NFR-ACC-02** The system shall display every status and severity value as a text label, never by colour alone.
