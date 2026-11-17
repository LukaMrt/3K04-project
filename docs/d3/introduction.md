# 1. Introduction and Context

## 1.1 The two parts

**ADC (Automated Dispensing Cabinet).** A cabinet of five containers (at most 20 units each) that gives medication to authenticated staff with three authorization levels. A dispense is staged: the request is checked (permission, stock, withdrawal policy, mode, audit capacity), one drawer is unlocked, the drawer is closed, and only the quantity the user confirms leaves the stock. Faults put the cabinet in Fault mode, and every protected action is audited locally. The prototype is a Python application with a graphical interface and simulated hardware. Its safety-critical functions are authentication and authorization, safe dispensing and unlock, duplicate prevention, inventory integrity, and fault response.

**Hospital Monitoring System.** A web application that supervises the cabinets of the hospital: it registers them, follows their heartbeats and marks them unreachable (45 s) or offline (75 s), records and displays their alarms until a member of staff acknowledges them, keeps their inventories and flags low stock, stores the history and produces reports, and sends maintenance commands and configurations, each page restricted by role. Its safety-critical functions are offline detection, alarm reception, alarm acknowledgement, command sending, and status and stock display.

The two parts communicate through the interface contract of Appendix A.

## 1.2 Team and division of work

| Member | Built in D1/D2 | D3 work |
| --- | --- | --- |
| Karan | ADC (Part A) | ADC testing plan; dispense and link-drop end-to-end scenarios |
| Malika Mehta | Monitoring System (Part B) | Monitoring testing plan; alarm end-to-end scenario; integration report |
| Luka Maret | Monitoring System (Part B) | Scoping and gap analysis of the ADC against the contract; hazard analyses of both parts; ADC network adapter and first joint run |

The whole team reviews every section, and each member presents both parts in the demonstration.

## 1.3 Integration outcome

The ADC and the Monitoring System work together end to end. A cabinet registers by itself, sends its state and complete inventory every 30 s, and its dispenses and alarms reach the Monitoring System, which records each of them once; an alarm is shown on the dashboard within 2 s and acknowledged there; a maintenance command sent from the dashboard is applied by the cabinet and confirmed; when the link drops, the cabinet keeps working locally, the dashboard shows it unreachable then offline with a communication loss alarm, and everything done during the outage arrives once the link is back. These four scenarios passed with both real parts (section 4). What is not integrated: the remote unlock of the ADC prototype, left out on purpose because it would need its own hazard analysis (D3-D-02); configurations are implemented on both sides but were only tested with a stand-in, not end to end; the link runs over HTTP, accepted outside production (Part B D-35), instead of HTTPS; and the ADC keeps its data in memory, so a restarted cabinet keeps its identity but returns to its initial demonstration stock.
