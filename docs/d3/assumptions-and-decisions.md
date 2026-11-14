# 6. Assumptions and Decisions

<!-- Handout §4.6: new assumptions made during D3 and the decisions that followed. The registers of
D1 and D2 remain in force and are not repeated. Agree with Part A on the numbering so that the IDs of
both parts do not collide. -->

The registers of D1 and D2 of both parts remain in force and are not repeated. Both parts already use `A-…` and `D-…` identifiers with overlapping numbers, so the items of this deliverable, which concern the whole team, use the prefixes **D3-A** (assumptions) and **D3-D** (decisions).

The first items come from the comparison of the ADC implementation with the ADC ↔ Monitoring interface contract v1.0 (Appendix A), made when the two parts started their integration.

## 6.1 New assumptions

| ID | Assumption | Source | Affects |
| --- | --- | --- | --- |
| D3-A-01 | One medication "unit" counted by the ADC is one "box" of the interface contract: the ADC reports its recorded quantities as they are in `quantityInBoxes`, with no conversion. | Team, comparison of the ADC with the contract | Contract §2 and §3.2 (`quantityInBoxes`); ADC 20-unit container limit; Monitoring low-stock threshold (FR-INV-03, below 10 boxes) |

## 6.2 New decisions

| ID | Decision | Rationale | Affects |
| --- | --- | --- | --- |
| D3-D-01 | The patient name does not cross the interface: a dispensing transaction carries a `patientId` (UUID v4) only, and the ADC keeps the name locally. | No requirement of the Monitoring System needs the name, and sending it would put health information on the interface for nothing (PHIPA). Part A FR-COM-14 already limits the transmitted inventory information to what the agreed interface requires. | Part A FR-COM-14; contract §2 and §3.2; Part B A-21, NFR-SEC-04 |
| D3-D-02 | The remote unlock of the ADC prototype is left out of the integration: the only command exchanged is `set_maintenance_mode` (contract §4.1, §5.4). | The demo scenarios do not need it, and letting the Monitoring System unlock a drawer is a safety risk that would need its own hazard analysis before being added to the contract. | Part A FR-COM-05, FR-COM-07; contract §4.1 |
| D3-D-03 | The ADC does not send its low-inventory warning as an alarm. | The Monitoring System already flags low stock from the complete inventory of each heartbeat; an alarm as well would show the same condition twice on the dashboard. | Part A low-inventory fault; Part B FR-INV-03 |
| D3-D-04 | ADC faults are sent as alarms with these types: `DRAWER_UNLOCK` and `DRAWER_CLOSE` → `dispensing_failure`, `SESSION_DOOR_OPEN` → `door_left_open`, any other internal fault → `hardware_fault`; the severity keeps its level, in lowercase. | Only the types of the contract (§5.2) get a meaningful label on the dashboard; the mapping is done once, in the ADC communication module. | Contract §5.2, §5.3; Part A FaultManager |
