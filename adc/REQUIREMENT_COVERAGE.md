# Functional requirement coverage matrix

This table is intentionally conservative. “Partial” means a demonstrable prototype path exists but the complete timing, persistence, security, or integration requirement is not fully realized. “Not implemented” means there is no claim of coverage.

|Requirement|Code location|Status / caveat|
|---|---|---|
|FR-AUTH-01|`authentication.py; access_control.py; adc_app.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-AUTH-02|`authentication.py; access_control.py; adc_app.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-AUTH-03|`authentication.py; access_control.py; adc_app.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-AUTH-04|`authentication.py; access_control.py; adc_app.py`|Partial — CLI expiry is checked on return from input; no asynchronous watchdog.|
|FR-AUTH-05|`authentication.py; access_control.py; adc_app.py`|Partial — CLI expiry is checked on return from input; no asynchronous watchdog.|
|FR-AUTH-06|`authentication.py; access_control.py; adc_app.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-AUTH-07|`authentication.py; access_control.py; adc_app.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-AUTH-08|`authentication.py; access_control.py; adc_app.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-AUTH-09|`authentication.py; access_control.py; adc_app.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-AUTH-10|`authentication.py; access_control.py; adc_app.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-AUTH-11|`authentication.py; access_control.py; adc_app.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-INV-01|`inventory.py; data_store.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-INV-02|`inventory.py; data_store.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-INV-03|`inventory.py; data_store.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-INV-04|`inventory.py; data_store.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-INV-05|`inventory.py; data_store.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-INV-06|`inventory.py; data_store.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-INV-07|`inventory.py; data_store.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-INV-08|`inventory.py; data_store.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-INV-09|`inventory.py; data_store.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-INV-10|`inventory.py; data_store.py`|Optional requirement not implemented.|
|FR-DISP-01|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-02|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-03|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-04|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-05|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-06|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-07|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-08|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-09|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-10|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-11|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-DISP-12|`dispensing.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-LOG-01|`event_logger.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-LOG-02|`event_logger.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-LOG-03|`event_logger.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-LOG-04|`event_logger.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-LOG-05|`event_logger.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-LOG-06|`event_logger.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-LOG-07|`event_logger.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-LOG-08|`event_logger.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-LOG-09|`event_logger.py`|Partial — bounded in-memory capacity and refusal logic; no durable storage.|
|FR-LOG-10|`event_logger.py`|Partial — bounded in-memory capacity and refusal logic; no durable storage.|
|FR-LOG-11|`event_logger.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-LOG-12|`event_logger.py`|Partial — bounded in-memory capacity and refusal logic; no durable storage.|
|FR-FAULT-01|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-02|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-03|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-04|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-05|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-06|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-07|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-08|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-09|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-10|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-11|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-FAULT-12|`fault_manager.py; hardware_interface.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-MODE-01|`fault_manager.py; dispensing.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-MODE-02|`fault_manager.py; dispensing.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-MODE-03|`fault_manager.py; dispensing.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-MODE-04|`fault_manager.py; dispensing.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-MODE-05|`fault_manager.py; dispensing.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-MODE-06|`fault_manager.py; dispensing.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-MODE-07|`fault_manager.py; dispensing.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-MODE-08|`fault_manager.py; dispensing.py`|Optional requirement not implemented.|
|FR-MODE-09|`fault_manager.py; dispensing.py`|Optional requirement not implemented.|
|FR-COM-01|`monitor_communication.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-COM-02|`monitor_communication.py`|Partial — status_cycle() exists; no background 30-second scheduler.|
|FR-COM-03|`monitor_communication.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-COM-04|`monitor_communication.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-COM-05|`monitor_communication.py`|Partial — demo command validation/local re-check; no production cryptographic source authentication.|
|FR-COM-06|`monitor_communication.py`|Partial — demo command validation/local re-check; no production cryptographic source authentication.|
|FR-COM-07|`monitor_communication.py`|Partial — demo command validation/local re-check; no production cryptographic source authentication.|
|FR-COM-08|`monitor_communication.py`|Partial — demo command validation/local re-check; no production cryptographic source authentication.|
|FR-COM-09|`monitor_communication.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-COM-10|`monitor_communication.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-COM-11|`monitor_communication.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-COM-12|`monitor_communication.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-COM-13|`monitor_communication.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-COM-14|`monitor_communication.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|
|FR-COM-15|`monitor_communication.py`|Partial — prototype behaviour; inspect DESIGN_NOTES.md and README.md for limitations.|