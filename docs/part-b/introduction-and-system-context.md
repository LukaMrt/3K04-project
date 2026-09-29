# Introduction and System Context — Part B (Hospital Monitoring System)

## 1. Purpose of this document

This document specifies the requirements of the **Hospital Monitoring System**, the supervisory software that centralizes the monitoring of the hospital's Automated Dispensing Cabinets (ADCs). It is the Deliverable 1 of SFWRENG 3K04 (Fall 2026), Part B. It states what the system must do and for whom, and models it with requirements, user stories with acceptance criteria, and UML diagrams. The design and the tests of the next deliverables trace back to the identifiers defined here.

Intended readers: the team, the teaching assistants, and the ADC team (Part A), with whom the interface between both systems is defined.

## 2. Project purpose

A hospital operates several ADCs in different locations. As their number grows, pharmacy personnel need one system to watch how they operate and to spot problems. The Monitoring System provides this centralized view for inventory, alarms, cabinet status and maintenance activities, and lets authorized staff send commands and configuration to a cabinet.

The system is **safety-critical**, even though it never releases medication. A malfunction can lead to harm, for example by hiding or misrouting a critical alarm, showing an offline cabinet as healthy, sending a command to the wrong cabinet, or assuming that an uncertain command succeeded. These hazards shaped the requirements (safety, security, auditability, accessibility) and the decisions listed in [assumptions-and-decisions.md](assumptions-and-decisions.md).

## 3. Scope

The Monitoring System is responsible for:

- collecting information from ADC units;
- monitoring cabinet status;
- managing alarms;
- storing historical information;
- generating reports;
- providing operator dashboards;
- monitoring cabinet health;
- responding to requests received from ADC units;
- distributing configuration and operational information to ADC units.

The following items are **out of scope**:

- physical ADC hardware;
- direct control of cabinet components;
- internal design of the ADC software;
- hospital patient information systems;
- medication decision processes;
- network infrastructure design.

## 4. System context

The Monitoring System is one part of a larger hospital medication management solution. It does not operate the dispensing mechanism: the ADC keeps control of its locks, slots, sensors, motor and final local safety checks. The Monitoring System is a separate piece of software, developed independently of the ADC software and integrated with it later through a communication interface defined jointly by both teams.

| Element                  | Role in the context                                                                                                                     |
| ------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- |
| Nurse                    | Views statuses, alarms and inventory; acknowledges alarms                                                                               |
| Pharmacist               | Views inventory, history and reports; acknowledges alarms                                                                               |
| Technician               | Views cabinet health; sends commands; acknowledges alarms                                                                               |
| Administrator            | Sends commands and configuration; generates reports; manages roles                                                                      |
| Hospital risk management | Reviews alarm history, alarm reports and the audit log                                                                                  |
| ADC units (Part A)       | Partner system: send registrations and heartbeats; receive acknowledgements, commands and configuration                                 |
| Other stakeholders       | Patient, Hospital privacy officer, Hospital IT: no direct use case, but source of requirements (see [stakeholders.md](stakeholders.md)) |

The exchanges between the Monitoring System and the ADC units cover the operational status, the inventory, the alarms and the dispensing activities sent by the ADC, and the acknowledgements, commands and configuration sent by the Monitoring System. The boundary between both systems, and the messages that cross it, are shown in the [high-level architecture diagram](diagrams/high-level-architecture.md). The exact message formats are still to be agreed with the ADC team (open points O-01 to O-04).

## 5. Operational scenarios

The requirements and models are organized around four scenarios:

1. **Inventory monitoring**: a pharmacist reviews the inventory of several ADCs and the system identifies the cabinets that need attention.
2. **Alarm reception**: an ADC sends an alarm; the system receives, records and displays it.
3. **ADC communication failure**: an ADC stops communicating; the system detects it and updates the cabinet status.
4. **Historical review**: a pharmacist reviews previous dispensing activities of an ADC.

## 6. Constraints and assumptions

The design considers the constraints of the project description: communicate with multiple ADC units, keep the information received from the ADCs consistent, store important events, control user access, detect communication problems, keep historical information available, and support future expansion.

The team relies on the four given assumptions (multiple ADCs, communication interfaces provided by the ADCs, hospital network available, users with valid accounts), plus additional assumptions and decisions that fill the gaps of the description. All of them are documented, with the requirements they affect, in [assumptions-and-decisions.md](assumptions-and-decisions.md).

## 7. Document structure

| Section                     | Content                                                                                                                                                                                  |
| --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Stakeholders                | [stakeholders.md](stakeholders.md)                                                                                                                                                       |
| Functional requirements     | [functional-requirements.md](functional-requirements.md) — by capability (COM, INV, ALM, HIS, RPT, DSH, HLT, REQ, USR)                                                                   |
| Non-functional requirements | [non-functional-requirements.md](non-functional-requirements.md) — safety, security, reliability, availability, performance, auditability, usability, accessibility                      |
| User stories                | [user-stories.md](user-stories.md) — with Given/When/Then acceptance criteria                                                                                                            |
| High-level architecture     | [diagrams/high-level-architecture.md](diagrams/high-level-architecture.md)                                                                                                               |
| UML models                  | [diagrams/use-case-diagram.md](diagrams/use-case-diagram.md), [diagrams/activity-diagram.md](diagrams/activity-diagram.md), [diagrams/sequence-diagram.md](diagrams/sequence-diagram.md) |
| Traceability                | [traceability.md](traceability.md) — requirement → story → component → stakeholder or source                                                                                             |
| Assumptions and decisions   | [assumptions-and-decisions.md](assumptions-and-decisions.md), including ethical and accessibility considerations                                                                         |

Requirement identifiers follow the pattern `FR-<theme>-<nn>` and `NFR-<theme>-<nn>`; stories are `US-<theme>-<nn>`. Assumptions, decisions and open points are `A-`, `D-` and `O-` numbered.
