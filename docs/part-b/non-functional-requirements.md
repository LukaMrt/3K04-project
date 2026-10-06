# Non-Functional Requirements - Part B (Hospital Monitoring System)

## Safety (SAF) - what must never happen?

- **NFR-SAF-01** The system shall label as "stale", together with its last-update time, any ADC status or inventory that has not been updated for 45 seconds or more.
- **NFR-SAF-02** The system shall never display an alarm as acknowledged unless a user has explicitly acknowledged it.
- **NFR-SAF-03** The system shall display an ADC as "online" only while it is marked neither "unreachable" (FR-HLT-02) nor "offline" (FR-HLT-03).
- **NFR-SAF-04** The system shall repeat the audible cue of an unacknowledged critical alarm every 60 seconds until it is acknowledged.

## Security & Privacy (SEC) - who may do what?

- **NFR-SEC-01** The system shall require authentication before displaying any patient-related or medication-related data.
- **NFR-SEC-02** The system shall restrict alarm acknowledgement, ADC commands and ADC configuration to the roles permitted for them (D-14).
- **NFR-SEC-03** The system shall discard, and log the discard of, any heartbeat sent by an ADC that is not registered.
- **NFR-SEC-04** The system shall display patient identifiers, in reports and in event history, only to users holding one of the following roles: pharmacist, administrator.
- **NFR-SEC-05** The system shall exchange messages with ADCs only over an encrypted channel.

## Reliability (REL) - how often may it fail?

- **NFR-REL-01** The system shall make every transaction it has acknowledged as "received" to an ADC retrievable from the historical data for its whole retention period.
- **NFR-REL-02** The system shall have fewer than 1 unplanned outage per 1,000 hours of operation.
- **NFR-REL-03** The system shall display, for each ADC, an inventory identical to the complete inventory contained in the latest heartbeat received from that ADC.

## Availability (AVL) - when must it be usable?

- **NFR-AVL-01** The system shall remain available to authenticated users while one or more ADCs are offline.
- **NFR-AVL-02** The system shall keep processing events from connected ADCs while one or more other ADCs are offline.
- **NFR-AVL-03** The system shall be available to authenticated users at least 99.5% of each calendar month, excluding scheduled maintenance windows.
- **NFR-AVL-04** The system shall operate for at least 30 consecutive days without requiring a restart.
- **NFR-AVL-05** The system shall record the timestamp of each of its own start-ups and shutdowns, so that its availability (NFR-AVL-03) and its uptime (NFR-AVL-04) can be verified.

## Performance (PRF) - how fast?

- **NFR-PRF-01** The system shall display a new alarm on the dashboard no later than 2 seconds after its receipt, or after its generation for a communication loss alarm.
- **NFR-PRF-02** The system shall meet NFR-PRF-01 with up to 50 simultaneously connected ADCs.

## Traceability / Auditability (AUD) - can we reconstruct what happened?

- **NFR-AUD-01** The system shall log every alarm acknowledgement, every ADC command and every configuration sent to an ADC with the user ID, the action, the target ADC and the timestamp.
- **NFR-AUD-02** The system shall prevent every user role from modifying historical data.
- **NFR-AUD-03** The system shall prevent every user role from deleting historical data.
- **NFR-AUD-04** The system shall log every account creation, account deactivation and role change with the administrator's user ID, the target account and the timestamp.
- **NFR-AUD-05** The system shall log the outcome (delivered, failed, refused) of every command and configuration, with its identifier, the target ADC and the timestamp.
- **NFR-AUD-06** The system shall log every display of patient identifiers with the user ID, the report or ADC history displayed and the timestamp.

## Usability (USA) - can the intended user do it correctly?

- **NFR-USA-01** The system shall show on the dashboard's main view, without further navigation, every ADC in at least one of the following situations: unreachable, offline, in fault, flagged "low stock", holding an unacknowledged critical alarm.
- **NFR-USA-02** The system shall display each status, severity and flag value with the single label fixed by D-16, on the dashboard, in reports and in history views.
- **NFR-USA-03** The system shall allow a trained user to acknowledge an unacknowledged alarm in under 15 seconds from its appearance on the dashboard.

## Accessibility (ACC)

- **NFR-ACC-01** The system shall present every new alarm with both a visual cue and an audible cue.
- **NFR-ACC-02** The system shall display every status and severity value as a text label, never by colour alone.
- **NFR-ACC-03** The system shall allow every dashboard function to be performed with the keyboard alone.
- **NFR-ACC-04** The system's user interface shall conform to WCAG 2.0 level AA (AODA, Integrated Accessibility Standards).
