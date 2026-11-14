"""Launch the ADC graphical interface connected to the Hospital Monitoring System (Part B).

    python connected_gui.py --monitor http://localhost:3333 --port 8701 --label "ADC West 214" --floor 2

The ADC registers with the Monitoring System, sends its heartbeats and answers its commands
(monitor_link.py). gui_main.py still launches the interface with the simulated link only.
A second ADC on the same machine needs another --port and another --identity file.
"""
import argparse
import tkinter as tk

from adc_app import ADCApplication
from adc_gui import ADCDesktopApp
from monitor_link import MonitorLink


def parse_args():
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--monitor", default="http://localhost:3333", help="base URL of the Monitoring System")
    parser.add_argument("--host", default="127.0.0.1", help="address the Monitoring System uses to reach this ADC")
    parser.add_argument("--port", type=int, default=8701, help="port of the command server of this ADC")
    parser.add_argument("--label", default="ADC Demo Room", help="name shown on the dashboard")
    parser.add_argument("--floor", type=int, default=1)
    parser.add_argument("--location", default="Demo Room", help="location shown on the dashboard")
    parser.add_argument("--identity", default="adc_identity.json", help="file keeping the adcId across restarts")
    return parser.parse_args()


def main():
    args = parse_args()
    app = ADCApplication()
    link = MonitorLink(app, args.monitor, "http://{}:{}".format(args.host, args.port), args.label,
                       args.floor, args.location, listen=(args.host, args.port),
                       identity_path=args.identity)
    link.start()

    root = tk.Tk()
    gui = ADCDesktopApp(root, app)
    title = root.title()
    shown = {"state": None}

    def refresh():
        # The link runs in other threads: the window is updated from the Tk loop only.
        root.title("{} · {}".format(title, link.status_text()))
        state = (app.faults.mode, len(app.faults.active_faults()))
        if shown["state"] is not None and state != shown["state"]:
            gui._draw()  # a remote command changed the mode: show it without waiting for a click
        shown["state"] = state
        root.after(1000, refresh)

    root.after(1000, refresh)
    try:
        root.mainloop()
    finally:
        link.stop()


if __name__ == "__main__":
    main()
