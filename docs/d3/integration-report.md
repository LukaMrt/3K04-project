# 4. Integration Report

## 4.1 Integration plan

**Interface.** The two parts follow the ADC ↔ Monitoring interface contract v1.0 (Appendix A): JSON over HTTP(S), every identifier a UUID v4, every acknowledgement the synchronous HTTP response.

| Direction | What crosses the interface | When |
| --- | --- | --- |
| ADC → Monitoring | Registration: identifier, label, contact address, floor and location | At start-up, and again when the Monitoring System no longer knows the ADC |
| ADC → Monitoring | Heartbeat: operational state, complete inventory, every transaction not yet acknowledged (completed dispenses, alarms) | Every 30 s, and at once on a new alarm or a change of state |
| Monitoring → ADC | One acknowledgement per transaction (`received` or `rejected`) | In the response to each heartbeat |
| Monitoring → ADC | Commands (`set_maintenance_mode`) and configurations, at the contact address of the ADC | When an operator sends them; answered within 10 s |

**Approach and order.** The two parts were built independently against the contract, each with a stand-in for the other: the Monitoring System was developed and tested first (D2) with a simulated ADC that speaks the contract (driver of its heartbeats, stub of its command endpoint), and the ADC with a simulated, in-memory link. The integration then replaced the ADC's simulated link by a network adapter (`adc/monitor_link.py`), the only ADC module that knows the protocol; the other ADC modules did not change for the integration. A gap analysis of the ADC against the contract came first (28 gaps, decisions D3-A-01 and D3-D-01 to D3-D-04), then the adapter, then the end-to-end scenarios. One change was needed on the Monitoring side: the low-stock list of the dashboard became live (D3-D-05).

**Responsibilities.** ADC: Karan (Part A, D1 and D2 code). Monitoring System: Malika Mehta and Luka Maret (Part B). Gap analysis, ADC network adapter and end-to-end scenarios: Luka Maret, reviewed with the team.

**Testing the two parts together.** Four end-to-end scenarios, run with both real parts (the ADC graphical interface and the Monitoring dashboard): a dispense on the ADC reaches the Monitoring history and stock; an ADC alarm is displayed within 2 s and acknowledged; the link drops (UNREACHABLE at 45 s, OFFLINE at 75 s with one communication loss alarm) and the dispense made during the outage is recorded once when it comes back; a maintenance command is delivered both ways. All passed on Nov 13 and Nov 17, 2026 (12 of 12 automated checks on the second run). Each part's own tests (section 3) keep stubbing the other part.

## 4.2 What went wrong

| # | Problem | Root cause |
| --- | --- | --- |
| 1 | The first ADC prototype could not talk to the Monitoring System at all: no network transport, its own message format, non-UUID identifiers, local timestamps, uppercase values (28 gaps). | Part A never received the contract file: it built its link from the other Part B documents, and no checkpoint compared an implementation with the contract before D3. |
| 2 | A dispense would have reached the Monitoring System as "started" and never as completed. | The ADC rewrites its audit event in place when the withdrawal is confirmed, while the Monitoring side assumed that a transaction sent again is identical (A-26); that obligation was written in Part B's documents only. |
| 3 | During the first joint run, the "Low stock" box of the dashboard only changed on reload, while statuses and alarms were live. | The live channel (D-27) was designed for alarms and statuses only: low stock was treated as page content, and no test or demonstration scenario checked that it changes while a dashboard stays open. |

## 4.3 What would need to be different

| # | Change (design, interface or process) | Problem it would have avoided |
| --- | --- | --- |
| 1 | Keep the contract as one versioned file in the shared repository from D1, approved by both parts, and run the same contract examples in each part's tests. | 1 |
| 2 | Write the obligations of each side in the contract itself (a transaction is immutable once queued; a command received twice is applied once), and give each part a reference stand-in of the other (a fake Monitoring System for the ADC, as the fake ADC was for the Monitoring System). | 2 |
| 3 | Run a first joint test at the end of D2, even with an incomplete ADC, with one integration owner per part, instead of discovering the boundary behaviour in D3. | 1, 3 |
