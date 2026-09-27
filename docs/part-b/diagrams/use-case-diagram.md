# Use Case Diagrams — Part B (Hospital Monitoring System)

## 0. Overview

```mermaid
flowchart LR
    subgraph Actors[" "]
        direction TB
        Nurse["Nurse"]
        Pharmacist["Pharmacist"]
        Technician["Technician"]
        Admin["Administrator"]
        RiskMgmt["Hospital risk management"]
        ADC["ADC Unit"]
    end

    subgraph MS["Hospital Monitoring System"]
        direction TB
        Auth(["Authenticate User<br/>(included by every<br/>user use case)"])
        P_COM["ADC Communication<br/>(diagram 1)"]
        P_DSH["Dashboard & Cabinet Health<br/>(diagram 2)"]
        P_INV["Inventory Supervision<br/>(diagram 3)"]
        P_ALM["Alarm Management<br/>(diagram 4)"]
        P_RPT["History & Reporting<br/>(diagram 5)"]
    end

    Nurse --- Auth
    Pharmacist --- Auth
    Technician --- Auth
    Admin --- Auth
    RiskMgmt --- Auth

    ADC --- P_COM
    Technician --- P_COM
    Admin --- P_COM

    Nurse --- P_DSH
    Pharmacist --- P_DSH
    Technician --- P_DSH
    Admin --- P_DSH

    Nurse --- P_INV
    Pharmacist --- P_INV

    Nurse --- P_ALM
    Pharmacist --- P_ALM
    Technician --- P_ALM
    Admin --- P_ALM

    Pharmacist --- P_RPT
    Admin --- P_RPT
    RiskMgmt --- P_RPT

    classDef actor fill:#e8eef7,stroke:#334,stroke-width:1.5px,color:#112;
    classDef usecase fill:#fff,stroke:#666,stroke-width:1px;
    classDef package fill:#f7f7f7,stroke:#666,stroke-width:1px,stroke-dasharray: 3 3;
    class Nurse,Pharmacist,Technician,Admin,RiskMgmt,ADC actor;
    class Auth usecase;
    class P_COM,P_DSH,P_INV,P_ALM,P_RPT package;
    style Actors fill:none,stroke:none;
    style MS fill:none,stroke:#334,stroke-width:2px;
```

## 1. ADC Communication

```mermaid
flowchart LR
    subgraph Primary[" "]
        direction TB
        ADC["ADC Unit<br/>(primary role)"]
        Technician["Technician"]
        Admin["Administrator"]
    end

    subgraph MS["Hospital Monitoring System — ADC Communication"]
        RegisterADC(["Register ADC"])
        Heartbeat(["Send Heartbeat"])
        SubmitEvent(["Submit Event<br/>(inventory / alarm / status)"])
        AckEvent(["Acknowledge Event Receipt"])
        SendCmd(["Send Command to ADC"])
        SendConfig(["Send Configuration to ADC"])
        AuditLog(["Log Audit Trail"])
    end

    subgraph Secondary[" "]
        ADC2["ADC Unit<br/>(secondary role)"]
    end

    ADC --- RegisterADC
    ADC --- Heartbeat
    ADC --- SubmitEvent
    Technician --- SendCmd
    Admin --- SendCmd
    Admin --- SendConfig

    SendCmd --- ADC2
    SendConfig --- ADC2
    AckEvent --- ADC2

    SubmitEvent -. "&lt;&lt;include&gt;&gt;" .-> AckEvent
    SendCmd -. "&lt;&lt;include&gt;&gt;" .-> AuditLog
    SendConfig -. "&lt;&lt;include&gt;&gt;" .-> AuditLog

    classDef actor fill:#e8eef7,stroke:#334,stroke-width:1.5px,color:#112;
    classDef usecase fill:#fff,stroke:#666,stroke-width:1px;
    class ADC,ADC2,Technician,Admin actor;
    class RegisterADC,Heartbeat,SubmitEvent,AckEvent,SendCmd,SendConfig,AuditLog usecase;
    style Primary fill:none,stroke:none;
    style Secondary fill:none,stroke:none;
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

    ViewDash -. "&lt;&lt;include&gt;&gt;" .-> MonitorHealth
    FilterSort -. "&lt;&lt;extend&gt;&gt;" .-> ViewDash
    DetectOffline -. "&lt;&lt;extend&gt;&gt;" .-> MonitorHealth

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

    LowStock -. "&lt;&lt;extend&gt;&gt;" .-> ViewInv
    SameFloor -. "&lt;&lt;extend&gt;&gt;" .-> ViewInv

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

    AckAlarm -. "&lt;&lt;extend&gt;&gt;" .-> ViewAlarms
    AckAlarm -. "&lt;&lt;include&gt;&gt;" .-> AuditLog

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

    ExportAlarmReport -. "&lt;&lt;extend&gt;&gt;" .-> GenAlarmReport

    classDef actor fill:#e8eef7,stroke:#334,stroke-width:1.5px,color:#112;
    classDef usecase fill:#fff,stroke:#666,stroke-width:1px;
    class Pharmacist,Admin,RiskMgmt actor;
    class ViewHistory,GenConsumeReport,GenAlarmReport,ExportAlarmReport,ViewSavedReports usecase;
    style Actors fill:none,stroke:none;
    style MS fill:none,stroke:#334,stroke-width:2px;
```
