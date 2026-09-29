# Conceptual Domain / Class Model — Part B (Hospital Monitoring System)

```mermaid
classDiagram
    direction TB

    class User {
        +String userId
        +String fullName
        +UserRole role
        +authenticate(credentials) bool
    }

    class UserRole {
        <<enumeration>>
        NURSE
        PHARMACIST
        TECHNICIAN
        ADMINISTRATOR
    }

    class ADC {
        +String adcId
        +String contactAddress
        +String location
        +int floor
        +OperationalState reportedState
        +ConnectivityStatus connectivityStatus
        +DateTime lastHeartbeatTime
        +bool isStaleData
        +sendReadyCommand(command)
    }

    class OperationalState {
        <<enumeration>>
        NORMAL
        MAINTENANCE
        FAULT
    }

    class ConnectivityStatus {
        <<enumeration>>
        ONLINE
        UNREACHABLE
        OFFLINE
    }

    class Medication {
        +String medicationId
        +String name
        +String form
        +String dosage
    }

    class InventoryItem {
        +int currentQuantity
        +int lowStockThreshold
        +String drawerLocation
        +DateTime expirationDate
        +bool isLowStock()
    }

    class Alarm {
        +String alarmId
        +String alarmType
        +AlarmSeverity severity
        +DateTime timestamp
        +bool isAcknowledged
        +DateTime acknowledgedAt
    }

    class AlarmSeverity {
        <<enumeration>>
        INFO
        WARNING
        ERROR
        CRITICAL
    }

    class DispensingActivity {
        +String transactionId
        +DateTime timestamp
        +int quantityDispensed
        +String patientId
        +String staffMemberId
    }

    class AuditLogEntry {
        +String logId
        +DateTime timestamp
        +String actionType
        +String targetAdcId
        +String executedByUserId
    }

    class Report {
        +String reportId
        +ReportType reportType
        +DateTime generatedAt
        +DateTime startDate
        +DateTime endDate
        +exportToFile() File
    }

    %% Relationships and Cardinalities
    User "1" -- "0..*" AuditLogEntry : performs >
    User "0..1" -- "0..*" Alarm : acknowledges >
    User "1" -- "0..*" Report : generates >

    ADC "1" *-- "1..*" InventoryItem : contains >
    Medication "1" -- "0..*" InventoryItem : categorizes >

    ADC "1" -- "0..*" Alarm : triggers >
    ADC "1" -- "0..*" DispensingActivity : records >
    ADC "1" -- "0..*" AuditLogEntry : targets >

    Alarm "0..*" -- "0..1" Report : compiled_into >
    DispensingActivity "0..*" -- "0..1" Report : compiled_into >
```
