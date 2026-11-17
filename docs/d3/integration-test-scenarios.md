# Combined Test Scenarios - ADC ↔ Monitoring System (not part of the PDF)

Issues #74, #75 and #76. The end-to-end scenarios that cross the ADC ↔ Monitoring boundary, run with
both real parts: the ADC graphical interface connected through `adc/monitor_link.py`, and the
Monitoring System dashboard. They are the "testing the two parts together" of the integration report
(section 4.1) and the live part of the demo (#85).

## Set-up

1. Monitoring System: `npm run dev` in `monitoring/`; open http://localhost:3333 and sign in as **Technician** (demo account button).
2. ADC: `python connected_gui.py --monitor http://localhost:3333 --port 8701 --label "ADC West 214" --floor 2` in `adc/`; the window title shows "Monitoring: connected".
3. On the dashboard, the ADC appears **ONLINE**, floor 2, with its inventory.

## Scenarios

| ID | Scenario | Steps | Expected result | Traces to |
| --- | --- | --- | --- | --- |
| E2E-01 (#74) | Dispense on the ADC appears on the Monitoring System | ADC: sign in as `nurse1`, **Dispense** page, *Validate and unlock*, *Close simulated drawer*, *Confirm actual quantity* (1) | Within one heartbeat (≤ 30 s): the dispense is in the Monitoring history once (1 box, `nurse1`, no patient name); the stock of the medication drops by 1 on the dashboard; if it falls below 10 boxes, the "Low stock" box shows it without reload | FR-COM-07, FR-COM-09, FR-INV-01, FR-COM-08; D3-A-01, D3-D-01, D3-D-05 |
| E2E-02 (#75) | Alarm raised by the ADC is received, displayed and acknowledged | ADC: sign in as `admin1`, **Faults** page, *Inject simulated fault* (DRAWER_UNLOCK, ERROR). Dashboard: *Acknowledge*. ADC: select the fault, *Simulate cause resolved*, *Clear selected fault* | The alarm (`dispensing_failure`, ERROR) is on the dashboard within 2 s, with the ADC shown FAULT; after acknowledgement it leaves the list, with who and when recorded; once the fault is cleared on the ADC, the dashboard shows it ONLINE again | NFR-PRF-01, FR-ALM-01 to 05, FR-HLT-01; SR-MON-03, SR-ADC-04; D3-D-04 |
| E2E-03 (#76) | Link dropped, then restored | Stop the link (stop the Monitoring System, or block port 3333). ADC: dispense as in E2E-01 (a second withdrawal inside the policy window needs the "intentional repeat withdrawal" box). Wait 75 s. Restore the link | The ADC keeps working locally. Dashboard: UNREACHABLE after 45 s, then OFFLINE after 75 s with exactly one communication loss alarm. After the link is back: ONLINE within one heartbeat, the dispense made during the outage recorded once, the communication loss alarm still waiting for an acknowledgement | FR-HLT-02 to 04, FR-HLT-07, FR-COM-08, NFR-REL-01; SR-MON-01, SR-MON-02 |
| E2E-04 (#73) | Maintenance command from the Monitoring System | Dashboard: ADC page, *Enter maintenance mode*, then *Leave maintenance mode* | "delivered" shown to the technician; the ADC enters, then leaves, maintenance (its window changes at once) and the dashboard shows MAINTENANCE, then ONLINE; both sendings are in the audit log | FR-COM-04, FR-COM-06, FR-COM-11; SR-MON-04 |

## Runs

| Date | How | Result |
| --- | --- | --- |
| 2026-11-13 | Headless ADC (backend modules + `monitor_link.py`) against the real Monitoring System; acknowledgement and maintenance commands from the dashboard | E2E-01 to E2E-04 passed |
| 2026-11-17 | ADC **graphical interface** driven through its own buttons, against the real Monitoring System; checks read from the Monitoring database; acknowledgement on the dashboard | **12 / 12 checks passed**: dispense recorded once and stock 10 → 9; alarm stored 1.0 s after the click, ADC FAULT, acknowledged, back ONLINE after clearing; link drop: UNREACHABLE at 45 s, OFFLINE at 75 s with one communication loss alarm, ONLINE 15 s after the link was back, outage dispense recorded once, stock 8, communication loss alarm still unacknowledged |

The first 2026-11-17 attempt stopped at E2E-03: the second dispense was refused by the ADC, which asks
for an explicit repeat confirmation inside the withdrawal-policy window (FR-DISP-09/10). This is the
intended ADC behaviour; the step was added to the scenario.
