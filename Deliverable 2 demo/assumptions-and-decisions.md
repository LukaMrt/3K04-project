# Assumptions & Decisions since Deliverable 1 - Part A (Automated Dispensing Cabinet)

This document follows Part B's distinction between a **D1 baseline** and the **new D2 architectural/implementation choices**. D1 already uses assumption IDs `A-01` onward and decisions `D-01` onward. To avoid accidentally colliding with any unprovided D1 appendix version, **new Part A D2 items use `A2-…` and `D2-…`**, not invented continuations of the original D1 numbering. No original requirement or D1 ID is renumbered. Where the Part B team reports its own `A-…`/`D-…` IDs, they remain *Part B* IDs, not Part A requirements.

## 1. Changes to D1 items

No approval of new Part A functional/non-functional requirement wording was provided. The **82 FR and 50 NFR** in the original Part A D1 PDF remain the baseline.

| D1 item | D2 interpretation / evidence | Status |
| --- | --- | --- |
| FR-INV-11 | Reject the full over-capacity replenishment, leaving quantity unchanged; D1 A-16 clarifies no partial acceptance. | D1 requirement explicitly restored to D2 coverage |
| FR-INV-10, FR-MODE-08/09, NFR-AVA-04 | Restart persistence and restart/sleep/shutdown functionality are **optional**. | Retained as optional, not represented as mandatory completed features |
| A-03 | Physical medication quantity is manually confirmed, never inferred from a sensor. | Carried forward; physical confirmation timing remains a prototype gap |
| A-05 | Door-close timeout is configurable; **10 seconds is proposed, not yet a finalized value**. | Open decision for the team |
| D1 §5 architecture drawing | D1 itself notes that the drawing was a working draft. | D2 Markdown contains a new information-hiding module/USES view |
| Part A ↔ Part B open points | Part B's documents claim they have been closed in an interface contract, but the actual contract Markdown was not attached to this request. | **Verification pending; do not claim contract compliance** |

## 2. D1 assumptions carried forward

The following are source-grounded D1 assumptions from the original Part A document, restated for design traceability (not new):

| ID | D1 assumption (summary) | Affects |
| --- | --- | --- |
| A-01 | Prototype has five medication containers. | FR-INV-03 |
| A-02 | Each container holds at most 20 units. | FR-INV-11 |
| A-03 | Quantity is software-recorded and manually confirmed; no counting sensor. | FR-INV-05/06, FR-DISP-06 |
| A-04 | Cabinet hardware exists conceptually; sensors/actuators have software interfaces; hospital network is available; users supply credentials and authorized staff load medication. | ADC boundary and all modules |
| A-05 | Allowed door-close period is configurable; proposed default 10 s, to be agreed. | FR-FAULT-01 |
| A-06 | Unauthorized access means failed-attempt threshold reached or request above user's level; both recorded/flagged. | FR-FAULT-10 |
| A-07 | Passwords belong to individual users; not shared by authorization level. | FR-AUTH-01 |
| A-08 | Patient name is part of medication record. | FR-INV-02, NFR-SEC-08 |
| A-09 | L2/L3 configure policy groups manually; ADC never infers them. | FR-DISP-12 |
| A-10 | Each ADC has unique cabinet ID and configurable hospital room/wing location. | FR-COM-04 |
| A-11 | ADC uses configurable local time zone; logs use MM/DD/YYYY and 24-hour time. | NFR-AUD-03 |
| A-12 | Default lockout: three failed attempts and five minutes; Level 3 configurable. | FR-AUTH-06 |
| A-13 | Compliance Officer accesses records through Level 3 account or Monitoring System; no fourth ADC authorization level. | FR-LOG-06 |
| A-14 | ADC sends status every 30 seconds when communication available. | FR-COM-02 |
| A-15 | INFO/WARNING allow Normal; ERROR/CRITICAL require Fault. | FR-FAULT-06 |
| A-16 | Replenishment beyond 20 is rejected in full, not partially accepted. | FR-INV-11 |

D1 decisions `D-01` through `D-04` visible in the supplied PDF establish Level 1 medication rules, INFO/WARNING vs Error/Critical mode policy, safe door closure on session expiry, and fault-clear authorization. The full existing D1 decision register remains authoritative; these are **not** D2 decisions.

## 3. New D2 assumptions

These are **explicit design or demonstration assumptions**, not confirmed additions to D1 requirements.

| ID | Assumption | Basis / rationale | Affects |
| --- | --- | --- | --- |
| A2-01 | The D2 technical demo may use simulated drawer hardware. | Current Python code uses `HardwareInterface` with fail switches; no physical equipment supplied. | Demo of FR-FAULT-01/02, FR-DISP-04; cannot prove physical timing |
| A2-02 | Demo users, medication records and patient names are fictional. | Seeded accounts/medications in `data_store.py`; avoid using actual patient data. | Safety, privacy and TA demo |
| A2-03 | The Python prototype and Part B's documented HTTPS server are **not** yet connected. | Verified source code vs supplied Part B D2 docs. | FR-COM-01–15; integration status |
| A2-04 | Until the missing shared `interface-adc-monitoring.md` is reviewed, Part B's D2 tables are the only available source for proposed HTTP paths, heartbeat and identifier details. | Contract is referenced but not provided; do not fabricate schema. | Integration planning |
| A2-05 | A command from the Monitoring System cannot prove a physical user withdrew a specified quantity. | D1 A-03 and FR-DISP-06; remote source is not a counting sensor. | FR-COM-07, FR-DISP-06 |
| A2-06 | A demo's seven passing unit tests are not a substitute for verification of strict timing, storage durability, physical safety, or integrated communication. | Existing `test_adc.py` coverage. | D2 demonstration claims |

**Interface privacy conflict:** Part A FR-COM-14 names *patient name* among inventory fields for authorized transmission; Part B assumption A-21 says patients have no display label/name in its interface. That difference must be settled with the Part B team and the actual contract. The Part A documentation does not silently replace D1 patient names with patient UUIDs.

## 4. New D2 design decisions

These decisions explain the current design and recommended safety refinements. A decision marked **Target** is a required design fix *not yet implemented*; **Implemented** describes observed prototype code; **Partial** means the prototype has a related mechanism but not all required semantics.

| ID | Decision | Rationale / secret | Implementation evidence / status |
| --- | --- | --- | --- |
| D2-01 | Use `ADCApplication` as composition root and UI adapter. | UI changes should not force changes to inventory and permissions. | `adc_app.py` — Implemented, but session timing still leaks into UI |
| D2-02 | Separate password authentication from role/medication authorization. | Credential verifier and role permission rules change independently. | `authentication.py`, `access_control.py` — Implemented with hash helpers in DataStore |
| D2-03 | Centralize medication quantity, location and capacity rules in Inventory Manager. | A future storage/hardware change should not duplicate the 20-unit rule. | `inventory.py` — Implemented; missing audit atomicity |
| D2-04 | Centralize dispense safety checks and policy-window history in Dispensing Controller. | Prevent inconsistent local vs remote safety decisions. | `dispensing.py` — Partial (confirmation ordering, atomicity) |
| D2-05 | Hide simulated or physical lock/door technology behind the same hardware boundary. | A mock or real actuator should not change policy decisions. | `hardware_interface.py` — Implemented as simulation only |
| D2-06 | Keep the three-mode state in Fault Manager for this prototype rather than creating an empty separate Mode class. | Single owner for current fault/mode guards; D1 domain entities need not equal D2 modules. | `fault_manager.py` — Implemented for basic mode variable; full Fault Mode behaviour incomplete |
| D2-07 | Keep audit records in an Event Logger with capacities 500 events/100 faults and preserve unacknowledged events. | No silent loss of evidence. | `event_logger.py` — Partial for fault ack and atomic commits |
| D2-08 | Place status, command validation, outbox and acknowledgements at a single communication boundary. | Protocol can change independently of dispensing rules. | `monitor_communication.py` — Simulated only |
| D2-09 | Use in-memory stores for the teaching prototype and explicitly label persistence absent. | Minimal setup for interactive demo. | `data_store.py`, `EventLogger` — Implemented demo choice; not production durability |
| D2-10 | Introduce stable request/command identity and idempotent completion. | A duplicate must not cause repeated physical dispensing. | `completed_requests`, `_seen_commands` — Partial; no restart persistence |
| D2-11 | **Target:** ensure quantity confirmation occurs after actual physical access and any uncertain quantity makes medication unavailable for reconciliation. | FR-DISP-06, FR-INV-08, NFR-SAF-04; prevent false inventory accuracy. | Not fully implemented; current CLI and remote demo violate intended ordering |
| D2-12 | **Target:** make inventory mutation and its audit outcome a single logical atomic commit. | FR-LOG-12; NFR-REL-03. | Not implemented; code mutates stock before audit record |
| D2-13 | **Target:** verify fault cause is genuinely resolved before clearing; restrict all ordinary medication functions during Fault Mode. | FR-FAULT-05, FR-MODE-05. | Partial; UI can mark cause resolved without independent sensor check |
| D2-14 | **Target:** replace demo source marker with authenticated partner commands and persistent IDs matching agreed schema. | FR-COM-06/07/13, NFR-SEC-09/10. | Not implemented; interface contract and cryptographic transport pending |
| D2-15 | **Target:** move inactivity to an independent clock/event loop and keep door physically closable on session expiry. | FR-AUTH-04/05 and NFR-SAF-07. | Not fully implemented in blocking CLI |
| D2-16 | **Target:** implement Part B registration/heartbeat/ack endpoints and stable UUID identity only after exact shared contract review. | Prevent a plausible but incompatible wire protocol. | Not implemented; Part B D2 contract expectations documented separately |

## 5. Ethical, safety, privacy and accessibility considerations

| Principle | Required design response | Prototype evidence and limit |
| --- | --- | --- |
| Patient safety | Never unlock unless identity, stock, policy, fault, mode and audit conditions pass. Unknown safety evidence fails closed. | Common guards in `DispensingController`; formal hardware/confirmation and atomicity gaps remain |
| Patient privacy | Patient names only to authenticated/authorized local users or authenticated Monitoring connection (NFR-SEC-08). | `Medication.patient_name` stored; current `_show_inventory()` displays all med records to logged-in users without per-record view authorization; refine before real use |
| Accountability | Associate protected actions, attempts, fault clears and configurations with user/source, unique ID and time. Do not overwrite unacknowledged records. | Event log includes user/time/outcome; fault acknowledgement and formatting incomplete |
| Safety over availability | Fault Mode prevents normal dispensing even offline; lack of network must not weaken local checks. | Mode guard in `dispensing.py`; remaining fault-mode activities need gating |
| Human factors | Display explicit denial reason, required level, repeat history/reset time, fault severity/next action, readable text. | CLI has text prompts, but not a continuous countdown, complete repeat reset time, or fully specified Fault Mode display |
| Accessibility | Use words/symbols as well as colour; keyboard-operable prompts; clear next action, no reliance on colour alone. | CLI is text/keyboard based but no screen-reader, ergonomic or accessibility testing exists |
| Cybersecurity | Individual salted password verifiers, role controls, authenticated transport, validated remote requests, replay protection. | PBKDF2 and local role checks present; remote demo string marker is not cryptographic authentication |
| Responsible disclosure | Distinguish required formal behaviour from incomplete demonstration implementations. | This package marks gaps explicitly; real medication/patient use is prohibited |

