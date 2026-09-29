# Use Case Diagrams — Part B (Hospital Monitoring System)

## 0. Overview

The use cases are grouped into six packages, detailed in diagrams 1 to 6. Actors are linked to use cases only inside those diagrams; this table gives, for each package, the actors that take part in it.

```mermaid
flowchart LR
    subgraph MS["Hospital Monitoring System"]
        direction TB
        P_COM["ADC Communication<br/>(diagram 1)"]
        P_DSH["Dashboard & Cabinet Health<br/>(diagram 2)"]
        P_INV["Inventory Supervision<br/>(diagram 3)"]
        P_ALM["Alarm Management<br/>(diagram 4)"]
        P_RPT["History & Reporting<br/>(diagram 5)"]
        P_USR["User Management & Audit<br/>(diagram 6)"]
    end

    classDef package fill:#f7f7f7,stroke:#666,stroke-width:1px,stroke-dasharray: 3 3;
    class P_COM,P_DSH,P_INV,P_ALM,P_RPT,P_USR package;
    style MS fill:none,stroke:#334,stroke-width:2px;
```

| Package | Actors |
| --- | --- |
| ADC Communication | ADC Unit, Technician, Administrator |
| Dashboard & Cabinet Health | Nurse, Pharmacist, Technician, Administrator |
| Inventory Supervision | Nurse, Pharmacist |
| Alarm Management | Nurse, Pharmacist, Technician, Administrator |
| History & Reporting | Pharmacist, Administrator, Hospital risk management |
| User Management & Audit | all five user roles (authentication); Administrator, Hospital risk management (audit log) |

## 1. ADC Communication

```mermaid
flowchart LR
    subgraph Primary[" "]
        direction TB
        Technician["Technician"]
        Admin["Administrator"]
    end

    subgraph MS["Hospital Monitoring System — ADC Communication"]
        RegisterADC(["Register ADC"])
        Heartbeat(["Send Heartbeat<br/>(status, inventory, transactions)"])
        AckEvent(["Acknowledge Transactions"])
        SendCmd(["Send Command to ADC"])
        SendConfig(["Send Configuration to ADC"])
        AuditLog(["Log Audit Trail"])
    end

    subgraph Partner[" "]
        ADC["ADC Unit"]
    end

    ADC --- RegisterADC
    ADC --- Heartbeat
    Technician --- SendCmd
    Admin --- SendCmd
    Admin --- SendConfig

    SendCmd --- ADC
    SendConfig --- ADC
    AckEvent --- ADC

    Heartbeat -. "«include»" .-> AckEvent
    SendCmd -. "«include»" .-> AuditLog
    SendConfig -. "«include»" .-> AuditLog

    classDef actor fill:#e8eef7,stroke:#334,stroke-width:1.5px,color:#112;
    classDef usecase fill:#fff,stroke:#666,stroke-width:1px;
    class ADC,Technician,Admin actor;
    class RegisterADC,Heartbeat,AckEvent,SendCmd,SendConfig,AuditLog usecase;
    style Primary fill:none,stroke:none;
    style Partner fill:none,stroke:none;
    style MS fill:none,stroke:#334,stroke-width:2px;
```

## 2. Dashboard & Cabinet Health

```mermaid
flowchart LR
    subgraph Actors[" "]
        direction TB
        Nurse["Nurse"]
        Pharmacist["Pharmacist"]
        Technician["Technician"]
        Admin["Administrator"]
    end

    subgraph MS["Hospital Monitoring System — Dashboard & Cabinet Health"]
        ViewDash(["View Dashboard"])
        FilterSort(["Filter / Sort ADCs"])
        MonitorHealth(["Monitor Cabinet Health"])
        DetectOffline(["Detect Unreachable / Offline"])
    end

    Nurse --- ViewDash
    Pharmacist --- ViewDash
    Technician --- ViewDash
    Admin --- ViewDash

    ViewDash -. "«include»" .-> MonitorHealth
    FilterSort -. "«extend»" .-> ViewDash
    DetectOffline -. "«extend»" .-> MonitorHealth

    classDef actor fill:#e8eef7,stroke:#334,stroke-width:1.5px,color:#112;
    classDef usecase fill:#fff,stroke:#666,stroke-width:1px;
    class Nurse,Pharmacist,Technician,Admin actor;
    class ViewDash,FilterSort,MonitorHealth,DetectOffline usecase;
    style Actors fill:none,stroke:none;
    style MS fill:none,stroke:#334,stroke-width:2px;
```

## 3. Inventory Supervision

```mermaid
flowchart LR
    subgraph Actors[" "]
        direction TB
        Nurse["Nurse"]
        Pharmacist["Pharmacist"]
    end

    subgraph MS["Hospital Monitoring System — Inventory Supervision"]
        ViewInv(["View Inventory"])
        LowStock(["Identify Low Stock"])
        SameFloor(["Find Stock on Same Floor"])
        ViewAggInv(["View Aggregated Inventory"])
    end

    Nurse --- ViewInv
    Pharmacist --- ViewInv
    Pharmacist --- ViewAggInv
    Pharmacist --- SameFloor

    LowStock -. "«extend»" .-> ViewInv

    classDef actor fill:#e8eef7,stroke:#334,stroke-width:1.5px,color:#112;
    classDef usecase fill:#fff,stroke:#666,stroke-width:1px;
    class Nurse,Pharmacist actor;
    class ViewInv,LowStock,SameFloor,ViewAggInv usecase;
    style Actors fill:none,stroke:none;
    style MS fill:none,stroke:#334,stroke-width:2px;
```

## 4. Alarm Management

```mermaid
flowchart LR
    subgraph Actors[" "]
        direction TB
        Nurse["Nurse"]
        Pharmacist["Pharmacist"]
        Technician["Technician"]
        Admin["Administrator"]
    end

    subgraph MS["Hospital Monitoring System — Alarm Management"]
        ViewAlarms(["View Active Alarms"])
        AckAlarm(["Acknowledge Alarm"])
        AuditLog(["Log Audit Trail"])
    end

    Nurse --- ViewAlarms
    Pharmacist --- ViewAlarms
    Technician --- ViewAlarms
    Admin --- ViewAlarms
    Nurse --- AckAlarm
    Pharmacist --- AckAlarm
    Technician --- AckAlarm

    AckAlarm -. "«extend»" .-> ViewAlarms
    AckAlarm -. "«include»" .-> AuditLog

    classDef actor fill:#e8eef7,stroke:#334,stroke-width:1.5px,color:#112;
    classDef usecase fill:#fff,stroke:#666,stroke-width:1px;
    class Nurse,Pharmacist,Technician,Admin actor;
    class ViewAlarms,AckAlarm,AuditLog usecase;
    style Actors fill:none,stroke:none;
    style MS fill:none,stroke:#334,stroke-width:2px;
```

## 5. History & Reporting

```mermaid
flowchart LR
    subgraph Actors[" "]
        direction TB
        Pharmacist["Pharmacist"]
        Admin["Administrator"]
        RiskMgmt["Hospital risk management"]
    end

    subgraph MS["Hospital Monitoring System — History & Reporting"]
        ViewHistory(["View Event History"])
        GenConsumeReport(["Generate Consumption Report"])
        GenAlarmReport(["Generate Alarm Report"])
        ExportAlarmReport(["Export Alarm Report"])
        ViewSavedReports(["View Saved Reports"])
    end

    Pharmacist --- ViewHistory
    Pharmacist --- GenConsumeReport
    Pharmacist --- ViewSavedReports
    Admin --- ViewHistory
    Admin --- GenConsumeReport
    Admin --- GenAlarmReport
    Admin --- ViewSavedReports
    RiskMgmt --- ViewHistory
    RiskMgmt --- GenAlarmReport
    RiskMgmt --- ViewSavedReports

    ExportAlarmReport -. "«extend»" .-> GenAlarmReport

    classDef actor fill:#e8eef7,stroke:#334,stroke-width:1.5px,color:#112;
    classDef usecase fill:#fff,stroke:#666,stroke-width:1px;
    class Pharmacist,Admin,RiskMgmt actor;
    class ViewHistory,GenConsumeReport,GenAlarmReport,ExportAlarmReport,ViewSavedReports usecase;
    style Actors fill:none,stroke:none;
    style MS fill:none,stroke:#334,stroke-width:2px;
```

## 6. User Management & Audit

```mermaid
flowchart LR
    subgraph Actors[" "]
        direction TB
        Nurse["Nurse"]
        Pharmacist["Pharmacist"]
        Technician["Technician"]
        Admin["Administrator"]
        RiskMgmt["Hospital risk management"]
    end

    subgraph MS["Hospital Monitoring System — User Management & Audit"]
        Authenticate(["Authenticate User"])
        CheckRole(["Check Role Permission"])
        ManageAccounts(["Manage Accounts and Roles"])
        ViewAudit(["View Audit Log"])
    end

    Nurse --- Authenticate
    Pharmacist --- Authenticate
    Technician --- Authenticate
    Admin --- Authenticate
    RiskMgmt --- Authenticate
    Admin --- ManageAccounts
    Admin --- ViewAudit
    RiskMgmt --- ViewAudit

    ManageAccounts -. "«include»" .-> CheckRole
    ViewAudit -. "«include»" .-> CheckRole

    classDef actor fill:#e8eef7,stroke:#334,stroke-width:1.5px,color:#112;
    classDef usecase fill:#fff,stroke:#666,stroke-width:1px;
    class Nurse,Pharmacist,Technician,Admin,RiskMgmt actor;
    class Authenticate,CheckRole,ManageAccounts,ViewAudit usecase;
    style Actors fill:none,stroke:none;
    style MS fill:none,stroke:#334,stroke-width:2px;
```

"Authenticate User" and "Check Role Permission" are included by every use case started by a user in diagrams 1 to 5 (all of them except "Register ADC", "Send Heartbeat" and "Acknowledge Transactions", which the ADC Unit starts); the «include» arrows are not repeated there to keep them readable.

## 7. User stories → use cases

| Story | Use case (diagram) |
| --- | --- |
| US-COM-01 | Register ADC (1) — started by the ADC Unit; the Administrator is the stakeholder who benefits |
| US-COM-02 | Send Command to ADC (1) |
| US-COM-03 | Send Configuration to ADC (1) |
| US-REQ-01 | Send Heartbeat, Acknowledge Transactions (1) |
| US-INV-01 | View Inventory (3) |
| US-INV-02 | Identify Low Stock (3) |
| US-INV-03 | Find Stock on Same Floor (3) |
| US-INV-04 | View Aggregated Inventory (3) |
| US-ALM-01 | View Active Alarms (4) |
| US-ALM-02 | Acknowledge Alarm (4) |
| US-HLT-01 | Monitor Cabinet Health (2) |
| US-HLT-02 | Detect Unreachable / Offline (2) |
| US-HLT-03 | Monitor Cabinet Health (2) |
| US-DSH-01 | View Dashboard (2) |
| US-DSH-02 | Filter / Sort ADCs (2) |
| US-HIS-01 | View Event History (5) |
| US-HIS-02 | View Event History (5), View Audit Log (6) |
| US-RPT-01 to US-RPT-05 | Generate Consumption Report (5) |
| US-RPT-06 | Generate Alarm Report, Export Alarm Report (5) |
| US-RPT-07 | View Saved Reports (5) |
| US-USR-01 | Authenticate User (6) |
| US-USR-02 | Check Role Permission (6) |
| US-USR-03 | Manage Accounts and Roles (6) |
