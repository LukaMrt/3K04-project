# Stakeholders — Part B (Hospital Monitoring System)

| Stakeholder              | Type                      | What they care about                                                                            | Priority (power / interest)                             |
| ------------------------ | ------------------------- | ----------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| Nurse                    | Direct user               | Seeing alarms quickly, acknowledging them easily, knowing which cabinet needs attention         | Low power / high interest → keep informed and represent |
| Pharmacist               | Direct user               | Inventory levels across cabinets, low-stock detection, restock suggestions, consumption reports | Low power / high interest → keep informed and represent |
| Technician               | Direct user               | Cabinet health (unreachable / offline / fault), sending commands to ADCs, maintenance follow-up | Low power / high interest → keep informed and represent |
| Administrator            | Direct user               | User accounts and roles, ADC configuration, alarm reports                                       | High power / high interest → manage closely             |
| Patient                  | Indirect / affected       | Receiving the right medication on time; privacy of their data                                   | Low power / high interest → keep informed and represent |
| Hospital privacy officer | Governing                 | PHIPA compliance: who can see patient-related data                                              | High power / low interest → keep satisfied              |
| Hospital risk management | Governing                 | Reconstructing incidents: audit trail, alarm history, retention                                 | High power / high interest → manage closely             |
| Hospital IT              | Governing                 | System availability, uptime, network integration                                                | High power / low interest → keep satisfied              |
| ADC team (Part A)        | External (partner system) | A stable, agreed interface between the ADC and the Monitoring System                            | High power / high interest → manage closely             |

## Regulations used as requirement sources

| Regulation      | Why it applies                                                                          |
| --------------- | --------------------------------------------------------------------------------------- |
| PHIPA (Ontario) | The system handles personal health information (patients in consumption reports)        |
| AODA (Ontario)  | Alarms and statuses must be perceivable by all users (not colour-only, not visual-only) |
