# Non-Functional Requirements — Part B (Hospital Monitoring System)

## Safety

- **NFR1** The system shall never present stale ADC status information as current without indicating when it was last updated.

## Security

- **NFR2** The system shall require authentication before granting access to the dashboard or to any patient-related or medication-related data.
- **NFR3** The system shall restrict actions (e.g., acknowledging an alarm, sending a command to an ADC) to users whose role permits them.
- **NFR4** The system shall only accept events from ADCs that have completed the registration process.

## Reliability

- **NFR5** The system shall not lose an event (ping, inventory update, alarm) received from a registered ADC.
- **NFR6** The system shall correctly detect an ADC as offline within a bounded, defined time after its last ping.

## Availability

- **NFR7** The system shall remain available to operator users, and shall keep operating normally for still-connected ADCs, even while one or more ADCs are offline.
- **NFR8** The system shall be able to run continuously without requiring a restart during normal operation.

## Performance

- **NFR9** The system shall reflect a newly received alarm on the dashboard within 2 seconds of receipt.
- **NFR10** The system shall support a variable number of simultaneously connected ADCs without significant degradation in response time.

## Traceability / Auditability

- **NFR11** The system shall record, for every sensitive action (alarm acknowledgment, command sent to an ADC), the identity of the user, the action, and the timestamp.
- **NFR12** The system shall retain historical event data in a way that allows it to be reviewed later without alteration.

## Usability

- **NFR13** The system shall present ADC status and alarms in a way that lets a user identify a cabinet requiring attention without navigating through unrelated information.
- **NFR14** The system shall use consistent terminology and status labels across the dashboard, reports, and history views.
