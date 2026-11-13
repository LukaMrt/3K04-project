# ADC Control Center — Desktop GUI (Part A, Deliverable 2)

This is a **working desktop interface** for the existing Python Automated Dispensing Cabinet (ADC) project. It is not a mockup: its actions invoke the same `Authentication`, `InventoryManager`, `DispensingController`, `FaultManager`, `EventLogger`, `HardwareInterface`, and `MonitorCommunication` services as the original terminal demo.

## Start the GUI

1. Extract the ZIP and open the **`ADC_Project_D2_GUI`** folder in VS Code.
2. Install Python 3.9+ from python.org; the standard Windows/macOS installer normally includes **Tkinter**. No `pip install` or external Python packages are needed.
3. Run either:

   ```bash
   python gui_main.py
   ```

   Or on Windows:

   ```powershell
   py gui_main.py
   ```

   On Windows you may also double-click `Launch_ADC_GUI.bat`.
4. The old command-line interface is still available using `python main.py`.

If Python reports `No module named tkinter` (typically on a minimal Linux Python installation), install the operating system's Tk Python package. For Debian/Ubuntu this is commonly `sudo apt install python3-tk`.

> IMPORTANT: Run this on your computer with a graphical desktop. It is not a website. It deliberately uses **fictional medication/patient data, simulated locks, and simulated Monitoring communication**. Do not use it for real clinical work.

## Demo accounts

| User | Password | Level | Role |
|---|---|---|---|
| `nurse1` | `Nurse123!!!` | L1 | Nurse / authorized withdrawal |
| `pharm1` | `Pharm123!!!` | L2 | Pharmacist / stock and Error recovery |
| `admin1` | `Admin123!!!` | L3 | Admin / configuration, audit and Maintenance |

For convenience, the login screen includes **quick-fill** buttons. These are only for the course demo and **must not be included in a real authentication system**.

## What the screens do

| GUI screen | Backend module called | Actions |
|---|---|---|
| Login | `Authentication` | Individual login, optional L2/L3 lockout recovery |
| Overview | `InventoryManager`, `FaultManager`, `HardwareInterface`, `EventLogger` | Live state of stock, active faults, current mode, audit capacity, open drawer |
| Inventory | `InventoryManager`, `AccessControl` | View records; L2+ replenish/correct/mark unavailable/register medications/configure withdrawal policies |
| Dispense | `DispensingController` | **Stage 1** validate+unlock, **Stage 2** simulate close, **Stage 3** confirm actual quantity; cancel/quarantine uncertain stock |
| Faults | `FaultManager`, `HardwareInterface` | Demo fault injection; permission-checked simulated cause resolution and clearance |
| Monitoring | `MonitorCommunication` | Simulated link online/offline; status cycles every 30s while GUI runs; queued events and simulated acknowledgements; export JSON; simulated remote unlock |
| Audit Log | `EventLogger` | L2+ role-filtered event history; L3 acknowledgement and clearing acknowledged records |
| Settings | `FaultManager`, `Authentication`, `EventLogger` | L3 Maintenance, authentication lockout settings, inactivity timer |

The GUI implements an **event-loop session timer**, with a 15-second default grace period plus a 60-second countdown. Interactions reset the timer. If a pending withdrawal expires, the GUI tries to safely cancel it and mark the stock uncertain. This is a **prototype-level GUI timer**, not an independent hardware watchdog and not a substitute for a production safety controller.

## Demonstration script (5–8 minutes)

1. **Authentication:** Quick-fill Nurse and sign in. On Overview show NORMAL mode, 2 assigned drawers, 18 initial units, and Monitoring OFFLINE.
2. **Dispensing:** Open Dispense. Choose `MED-001`, request **2**, start. Explain why the drawer is unlocked but the inventory is unchanged. Close the simulated drawer. Enter **1** as the actual quantity and complete. Open Inventory and show 9 units remain.
3. **Authorization:** Sign out; sign in as Pharmacist. Inventory → select `MED-001` → replenish 1 unit; quantity returns to 10. Sign in as Nurse again and show that L2 inventory mutation buttons aren't available (authorization is **also** checked by the backend).
4. **Off-normal:** Sign in as Pharmacist → Faults → inject `DRAWER_UNLOCK` with `ERROR` severity. Observe FAULT mode. Try dispensing or replenishment; show refusal. Select the fault → **Simulate cause resolved** → **Clear selected fault**, showing Normal Mode restoration.
5. **Monitoring:** Toggle simulated link OFF. Click Send status cycle and export the outbox JSON. Toggle link ON: simulated acknowledgements clear pending messages. Show that this is a **simulation**, not a live Part B endpoint.
6. **Tests:** In a terminal, run `python -m unittest discover -p "test_*.py" -v` to show the original and GUI integration tests.

**Important:** `MED-001` begins with 10 units **each time you restart** the demo. Inventory, audit events, and idempotency records are held in memory and are not saved across restarts.

## Safety and boundaries

- A normal dispense must pass role, medication, stock, withdrawal policy, mode, duplicate-request, drawer and audit-capacity checks in `DispensingController`; the GUI does **not** implement its own competing policy.
- Replenishment and correction require L2+ and Normal Mode and must write an audit record before changing in-memory quantity.
- The simulated Monitoring connector uses a demo-only authorization marker. The current project **does not implement the agreed Part B HTTPS interface or cryptographic peer authentication**.
- The interface includes demo-only controls (quick-fill passwords, simulated fault injection and a fake repair button) that must not be offered to production hospital operators.
- Timeouts use the desktop event loop and do not run while the application is closed or OS-suspended. Real sensor feedback, persistent transactional storage and hardware-level fail-safe interlocks are outside this prototype.

## Test instructions

Original business-logic tests plus new GUI integration tests:

```bash
python -m unittest discover -p "test_*.py" -v
```

On a graphical desktop, GUI integration tests run using Tkinter. On a headless CI runner with no display, the GUI integration class is skipped; the backend tests still run. For Linux CI with `xvfb-run`:

```bash
xvfb-run -a python -m unittest discover -p "test_*.py" -v
```

## Files added

- `adc_gui.py` — GUI presentation adapter and all screens. No duplicated dispensing/inventory rules.
- `gui_main.py` — desktop entry point; CLI remains in `main.py`.
- `Launch_ADC_GUI.bat` — double-click launcher for Windows.
- `test_gui_integration.py` — seven GUI workflow tests.
- `GUI_README.md` — this user guide.
- `GUI_DESIGN_UPDATE.md` — documentation of how the GUI affects the D2 design and modular decomposition.
- `GUI_SCREENSHOT.png` — actual screenshot of the running GUI under a virtual display.
