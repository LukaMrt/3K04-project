# Introduction - Part B (Hospital Monitoring System)

## 1. Purpose of this document

This document is the design document of the **Hospital Monitoring System**, Part B of the SFWRENG 3K04 project (Fall 2026), for Deliverable 2. Deliverable 1 stated what the system must do; this document states how it is built. It refines the D1 requirements into a precise specification, decomposes the system into modules that each hide an anticipated change, documents their interfaces and the external interface with the ADCs, and shows how this design is realised in the code that is demonstrated.

The D1 requirements document is its base: its requirements, user stories, UML models, assumptions and decisions keep their identifiers and remain in force, and everything in this document traces back to them. They are not repeated here; the changes made to them since D1 are listed in section 3.

Intended readers: the team, the teaching assistants, and the ADC team (Part A), with whom the interface between both systems was agreed.

## 2. System context

The Monitoring System is the supervisory software that centralises the monitoring of the hospital's Automated Dispensing Cabinets (ADCs). It receives the status, inventory, alarms and dispensing activities of every ADC, shows them to nurses, pharmacists, technicians, administrators and hospital risk management, detects the ADCs that stop communicating, keeps the history of what happened, produces reports, and sends commands and configuration to the ADCs. It never controls a cabinet directly: the ADC software (Part A) keeps control of its hardware.

The system is safety-critical even though it never releases medication: hiding an alarm, showing a silent cabinet as healthy, or assuming that an uncertain command succeeded can harm a patient. These hazards decide which functions are specified with pre-conditions, post-conditions and invariants (section 2), and which anticipated changes the modules hide.

The full context (scope, out-of-scope items, actors, the four operational scenarios) is the one of the D1 document.

## 3. Changes since Deliverable 1

The D1 identifiers are unchanged: no requirement, story or assumption was renumbered or removed. The changes below were made to the D1 documents, which the team keeps up to date. The baseline is the D1 document as tagged `deliverable-1` in the team repository.

### 3.1 Corrected requirements and models

| D1 items | Change | Reason |
| --- | --- | --- |
| FR-COM-02, US-COM-01 (scenario 2), state machine 1 (registration), sequence diagram (registration), FR-HIS-08 | A registration whose ADC identifier is already registered is now **accepted** as a re-registration: it replaces the label, contact address and location of the ADC and is logged. In D1 it was rejected. The state machine keeps *Rejected* for invalid requests only. | An ADC that restarts registers again with the same identifier (A-22). Rejecting it would leave a working cabinet out of the system until an administrator intervened (D-20). |
| FR-COM-01, FR-DSH-03, US-DSH-02 (scenario 2), class model (`ADC.label`) | An ADC registers with a **label**, and the ADC list is sorted by label instead of identifier. | Identifiers are UUID v4 (A-21): unreadable and meaningless to sort by for users. |
| FR-COM-09, A-13, class model (`staffMemberName`) | A dispensing activity also carries the medication name and the staff member's name. | Reports must name what they show; identifiers alone are unreadable (A-21). |
| FR-HIS-04, FR-HIS-07, high-level architecture | The event history and the audit log are read through Reporting instead of directly from the Historical Data Store. | Reporting is the only module that filters patient identifiers by role and audits their display (D-33, NFR-SEC-04). |
| A-08 | An ADC also sends a heartbeat at once when its operational state changes. | Agreed with Part A, so that a state change reaches the dashboard within 2 s (D-22). |
| D-16 | New displayed label PENDING. | An ADC registered but not yet heard from has no true label (D-21). |

### 3.2 Clarified requirements

Writing the precise specification as complete tables showed cases that D1 left open. They were resolved without changing the requirements' text, by the decisions D-21 to D-26 and D-40 and the assumption A-25 (precise specification, section 4). For example, FR-INV-04 now proposes only ADCs heard from in the last 45 s as stock sources (D-23), and the deactivation of an account closes its open sessions (D-25, FR-USR-05).

### 3.3 Closed open points and new items

- **Interface with Part A.** The open points O-01 to O-04 of D1 are closed by the ADC ↔ Monitoring interface contract (Appendix A) and the assumptions A-18 to A-24 that summarise it.
- **New assumptions and decisions**: A-18 to A-26 and D-20 to D-44, listed with their reasoning in section 6.

## 4. Document structure

| Section | Content |
| --- | --- |
| 1. Introduction | This section: purpose, context, changes since D1 |
| 2. Precise specification | The 4-variable model of the system (monitored and controlled variables, inputs and outputs, NAT and REQ), the required behaviour as function tables (`SPEC-…`), and the safety-critical functions with pre-conditions, post-conditions and invariants |
| 3. Modular design and interfaces | The module guide (anticipated changes, module hierarchy, USES hierarchy, design review test), the interface of each module, and the external ADC ↔ Monitoring interface |
| 4. Implementation notes | Which code implements each module, and how the D1 state machines and activity diagrams are realised |
| 5. Traceability | Every D1 requirement → user story → precise specification → module → code |
| 6. Assumptions and decisions | Every assumption and decision since D1, with ethical and accessibility considerations |
| Appendix A | ADC ↔ Monitoring interface contract v1.0, agreed with Part A |
| Appendix B | How the documents and the code were produced, and our use of AI |

Identifiers: `FR-`, `NFR-` (requirements), `US-` (stories), `A-`, `D-` (assumptions, decisions) come from D1 and are continued; `SPEC-` (specification items), `INV-` (state invariants of the safety-critical functions), and `AC-` and `UC-` (anticipated and unlikely changes) are new in this document.
