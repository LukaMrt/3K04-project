# Integration Log (not part of the PDF)

Every problem hit while connecting the ADC and the Monitoring System, written as it happens. It feeds
section 4.2 of the integration report (three problems with their root cause).

| Date | Symptom (what we saw) | Root cause (why) | Fix or workaround | Time lost |
| --- | --- | --- | --- | --- |
| 2026-11-13 | First review of the ADC code against contract v1.0: no network transport, its own message format, non-UUID identifiers, local timestamps, uppercase enumerations; 28 gaps listed in `interface-gaps-adc.md` | Part A never received the contract file (their D2 says so) and built a simulated adapter from Part B's other documents | Gap list shared with Part A; adapter to write in `MonitorCommunication` | - |
