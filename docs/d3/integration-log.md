# Integration Log (not part of the PDF)

Every problem hit while connecting the ADC and the Monitoring System, written as it happens. It feeds
section 4.2 of the integration report (three problems with their root cause).

| Date | Symptom (what we saw) | Root cause (why) | Fix or workaround | Time lost |
| --- | --- | --- | --- | --- |
| 2026-11-13 | First review of the ADC code against contract v1.0: no network transport, its own message format, non-UUID identifiers, local timestamps, uppercase enumerations; 28 gaps listed in `interface-gaps-adc.md` | Part A never received the contract file (their D2 says so) and built a simulated adapter from Part B's other documents | Gap list shared with Part A; adapter to write in `MonitorCommunication` | - |
| 2026-11-13 | A dispense would have reached the Monitoring System as "started" and never as completed (G-14) | The ADC rewrites its audit event in place when the withdrawal is confirmed, and its simulated link sends every unacknowledged event | The new link (`adc/monitor_link.py`) only sends completed dispenses; no change to `dispensing.py` | - |
| 2026-11-13 | First run against the real Monitoring System: registration, dispense → history and stock, fault → alarm in 2 s and acknowledgement, maintenance command both ways, link drop 75 s → OFFLINE + one communication loss alarm, then the dispense made during the outage recorded once | - (all scenarios passed) | Adapter on branch `feat/adc-monitoring-link`; the low-stock box of the dashboard only updates on reload | - |
