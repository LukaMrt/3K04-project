# Introduction - Part A (Automated Dispensing Cabinet)

## 1. Purpose of this document

This document introduces **Deliverable 2** for **Part A: Automated Dispensing Cabinet (ADC)** of MECHTRON / SFWRENG 3K04 (Fall 2026). Deliverable 1 (D1) establishes what the ADC must do. Deliverable 2 refines its safety-critical behaviour, decomposes it into modules that hide anticipated changes, documents module and external interfaces, and maps the design to the code demonstrated to the TAs.

The baseline is **`ADC-Part-A-Requirements-Deliverable-1 (1).pdf`**: **82 functional requirements and 50 non-functional requirements**. Its existing `FR-…`, `NFR-…`, `US-…`, `A-…`, `D-…` and `O-…` identifiers are retained. D2 introduces separate **`SPEC-…`** identifiers for precise specification items. Where the D1 requirement is already testable without further formal refinement, the traceability table says **As stated**; optional requirements stay optional. The original D1 document, user stories and UML models remain the baseline and should be retained alongside these files in the repository.

Intended readers: the Part A team, TAs, and the Part B (Hospital Monitoring System) team.

## 2. System context

The ADC controls access to medication stored in a cabinet with **five containers, each with capacity for at most 20 medication units** (D1 A-01/A-02). A user authenticates with an individual account. Level 1 users can dispense only permitted medications and quantities; Level 2 users can replenish, correct inventory, configure policies and clear Error faults; Level 3 has the Level 2 rights plus administrative, maintenance and Critical-fault recovery rights (FR-AUTH-07–10). An authorized dispense requires medication permission, sufficient confirmed quantity, withdrawal-policy permission, a safe operating/fault state and capacity for an audit record before the corresponding location is unlocked (FR-DISP-02–04, NFR-SAF-01/02).

Medication quantity is **software-recorded and confirmed by the user, not measured by a counting sensor** (D1 A-03). The ADC handles locks/drawers/door sensing through a hardware interface, stores events and faults locally, and exchanges status, transactions and commands with Part B. The ADC remains responsible for all local safety decisions: a remote command does not bypass authentication, inventory, policy, logging or fault checks (FR-COM-06/07, NFR-SAF-08). Loss of Monitoring communication does not, by itself, disable otherwise safe local work (FR-COM-10).

The current demonstration program is a **Python 3.9+ command-line prototype**, with in-memory data, simulated drawer hardware and simulated communication. It is **not** a clinically deployable ADC, and its limitations are explicitly documented in [implementation notes](implementation-notes.md).

## 3. Changes since Deliverable 1

The **requirement baseline is unchanged** in this package: there is no claim that the Part A team revised the wording or renumbered any D1 requirement. The changes below concern the *D2 design and implementation*, not an approved revision of D1.

### 3.1 Corrected coverage and design models

| D1 items | D2 change / clarification | Reason |
| --- | --- | --- |
| FR-INV-11 | Included explicitly in the precise specification and traceability table. | An earlier functional-requirements Markdown extract omitted this D1 requirement: replenishment above the 20-unit limit must be rejected without changing stock. |
| FR-INV-10, FR-MODE-08, FR-MODE-09, NFR-AVA-04 | Kept in traceability as **optional**. | They were absent from an earlier Part A traceability Markdown extract but are present in D1. |
| D1 architecture, §5 | Refined into modules based on information hiding, including storage, hardware and communication adapters. | A design module is not necessarily a class or entity in the D1 domain model. |
| D1 architecture drawing, §5 | Replaced for D2 purposes by a Mermaid system/interface view and USES hierarchy embedded in the Markdown documents. | D1 describes its own architecture drawing as a working draft needing consistency with its component table. The D2 views are architectural refinements, not claims that the D1 drawing was already corrected. |
| FR-DISP-06, FR-COM-07 | Explicitly distinguish **requested quantity**, **user-confirmed actual withdrawal** and **remote unlock**. | The current demo obtains quantity confirmation *before* calling the simulated unlock routine, and its remote demo path auto-uses requested quantity as confirmation; these are implementation gaps, not changes to D1 safety requirements. |

### 3.2 Precise behavioural refinement

The single system-level four-variable model is in [precise-specification.md](precise-specification.md). Five grouped safety-critical specifications, each with state, preconditions, postconditions, invariants and exceptions, are in [safety-critical-specifications.md](safety-critical-specifications.md):

1. Authentication/authorization and safe session termination.
2. Safe medication dispensing, local unlock, and remote-unlock gating.
3. Duplicate dispensing/remote-command prevention.
4. Inventory integrity and auditable stock changes.
5. Fault response, lockdown and authorized recovery.

Other behaviour is captured by `SPEC-…` function tables or left **As stated** where D1 is already precise enough. [Traceability](traceability.md) contains one row for **each of the 132 D1 requirements**.

### 3.3 External interface and open points

Part B's supplied D2 files describe a proposed/agreed **JSON-over-HTTPS registration and heartbeat protocol**, synchronous per-transaction acknowledgements, UUID v4 identifiers, heartbeats every 30 seconds (also on alarms/state changes), and Monitoring-to-ADC command/configuration endpoints. Those Part B files reference **`interface-adc-monitoring.md`**, but that contract file was **not among the supplied attachments**. Accordingly, [the Part A external interface section](modular-design-and-interfaces.md#4-external-interface-adc--monitoring-system) records Part B's stated expectations, separates them from the Part A prototype and does not invent exact payload schemas or assert integrated interoperability.

The current Part A prototype uses synthetic IDs such as `ADC-DEMO-001`, `MED-001` and shortened prefixed hexadecimal identifiers, simulated in-memory acknowledgement, and no live HTTP server. It therefore does **not** yet meet Part B's described identifier or transport contract. **Privacy-field mismatch to resolve:** Part A FR-COM-14 requires authorized inventory information including the *patient name*, while Part B D2 assumption A-21 says patients have no display label/name on the interface; the teams must agree a privacy-preserving schema without silently weakening Part A requirements. The team must reconcile and test the actual shared interface before claiming integration.

### 3.4 Correctness notes from the implementation review

| D1 item(s) | Observed prototype behaviour | D2 action |
| --- | --- | --- |
| FR-AUTH-04/05, NFR-PERF-05 | Inactivity is checked only when blocking CLI input returns. | Mark partial; do not claim timed asynchronous enforcement. |
| FR-DISP-06 | The CLI asks for quantity confirmation before calling the simulated unlock routine. | Distinguish formal requirement from demo sequence; rework before claiming compliance. |
| FR-COM-07 | Remote demo path passes requested quantity as confirmed quantity. | Mark partial/nonconforming; never present as clinical-safe remote dispensing. |
| FR-LOG-12, NFR-REL-03 | Some inventory mutations occur before the audit write; a later logger error could leave an unlogged change. | Record as a transaction/atomicity gap. |
| FR-COM-02/05/06/14 | No scheduled HTTPS heartbeats, live command endpoint, production source authentication or full inventory transmission. | Mark as integration work remaining. |
| FR-FAULT-05/09/11, FR-MODE-05 | Fault-clear cause is manually marked resolved; open-door/session and complete lockdown rules are not fully enforced by the demo. | Mark partial and avoid claiming full coverage. |

## 4. Document structure

| File | Content |
| --- | --- |
| [introduction.md](introduction.md) | Purpose, scope, D1 continuity and changes. |
| [precise-specification.md](precise-specification.md) | One four-variable model; M, C, I, O, NAT, IN, OUT and REQ function tables; specification index. |
| [safety-critical-specifications.md](safety-critical-specifications.md) | Five detailed safety-critical contracts with preconditions, postconditions and invariants. |
| [modular-decomposition.md](modular-decomposition.md) | Anticipated changes, Parnas module secrets, hierarchy and USES diagram. |
| [modular-design-and-interfaces.md](modular-design-and-interfaces.md) | Exported module operations and ADC ↔ Monitoring interface. |
| [implementation-notes.md](implementation-notes.md) | Actual Python file/class mapping, D1 models → code, tests, limitations and demonstration. |
| [traceability.md](traceability.md) | **82 FR + 50 NFR**, with user stories, precise-spec IDs, modules and code. |
| [assumptions-and-decisions.md](assumptions-and-decisions.md) | D1 assumptions carried forward, D2 decisions, hazards, privacy and accessibility. |


