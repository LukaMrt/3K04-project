"""Tkinter operator interface for the existing Part A ADC demo backend.

This is a presentation adapter, not a replacement for Authentication,
InventoryManager, DispensingController, FaultManager, or MonitorCommunication.
All safety-sensitive operations call the existing module interfaces.
Hardware, patient records, and Monitoring transport are simulated.
"""
from __future__ import annotations

import json
import tkinter as tk
from datetime import datetime
from pathlib import Path
from tkinter import filedialog, messagebox, ttk

from adc_app import ADCApplication
from models import Mode, Severity, new_id

# Palette: high contrast, consistent status indicators and non-color-only labels.
BG = "#0B1220"
SIDEBAR = "#111D31"
PANEL = "#17263E"
PANEL_HI = "#1D3150"
FIELD = "#101B2D"
BORDER = "#2D425E"
TEXT = "#F0F5FF"
MUTED = "#ABC0D8"
ACCENT = "#5CE1C3"
BLUE = "#86B6FF"
YELLOW = "#FFD083"
RED = "#FF8898"
GOOD = "#79E2AD"
FONT = "Segoe UI"


class ADCDesktopApp:
    """Graphical presentation module; all business rules remain in ADCApplication's services."""

    def __init__(self, root: tk.Tk, app: ADCApplication | None = None,
                 auto_status: bool = True):
        self.root = root
        self.app = app or ADCApplication()
        self.page = "Overview"
        self.nav_buttons = {}
        self.last_input = datetime.now().astimezone()
        self._expiry_in_progress = False
        self._closing = False
        self._auto_status = auto_status
        self._banner_text = ""
        self._banner_error = False
        self._selected_event_ids = {}
        self._selected_fault_ids = {}
        self._med_ids = {}

        root.title("ADC Control Center | Part A — Deliverable 2")
        root.geometry("1190x780")
        root.minsize(990, 680)
        root.configure(bg=BG)
        self._set_icon()
        self._configure_styles()
        root.bind_all("<KeyPress>", self._mark_activity, add="+")
        root.bind_all("<ButtonPress>", self._mark_activity, add="+")
        root.protocol("WM_DELETE_WINDOW", self._on_close)
        self._draw()
        self.root.after(1000, self._tick)
        if self._auto_status:
            self.root.after(30_000, self._status_timer)

    def _set_icon(self):
        # Works even when an external icon is not supplied.
        try:
            img = tk.PhotoImage(width=32, height=32)
            img.put(ACCENT, to=(6, 2, 26, 30))
            img.put(BG, to=(13, 8, 19, 24))
            img.put(BG, to=(9, 14, 23, 19))
            self.root.iconphoto(True, img)
            self._icon = img
        except tk.TclError:
            pass

    def _configure_styles(self):
        style = ttk.Style(self.root)
        style.theme_use("clam")
        style.configure("ADC.Treeview", background=PANEL, fieldbackground=PANEL,
                        foreground=TEXT, bordercolor=BORDER, rowheight=33,
                        font=(FONT, 10), relief="flat")
        style.configure("ADC.Treeview.Heading", background=PANEL_HI,
                        foreground=TEXT, bordercolor=BORDER,
                        font=(FONT, 10, "bold"), padding=(10, 11))
        style.map("ADC.Treeview", background=[("selected", "#286D73")],
                  foreground=[("selected", "#FFFFFF")])
        style.map("ADC.Treeview.Heading", background=[("active", "#274568")])
        style.configure("ADC.TCombobox", fieldbackground=FIELD,
                        background=PANEL, foreground=TEXT, arrowcolor=TEXT,
                        padding=6)
        style.map("ADC.TCombobox", fieldbackground=[("readonly", FIELD)],
                  foreground=[("readonly", TEXT)])
        style.configure("ADC.TSpinbox", fieldbackground=FIELD, background=FIELD,
                        foreground=TEXT, arrowsize=15, padding=6)

    def _mark_activity(self, _event=None):
        if self.app.current_user is not None:
            self.last_input = datetime.now().astimezone()
            self.app.last_activity = self.last_input

    def _tick(self):
        if self._closing:
            return
        user = self.app.current_user
        if user and not self._expiry_in_progress:
            idle = (datetime.now().astimezone() - self.last_input).total_seconds()
            limit = self.app.inactivity_grace + self.app.inactivity_timeout
            if idle >= limit:
                self._expiry_in_progress = True
                try:
                    self._expire_session()
                finally:
                    self._expiry_in_progress = False
            elif hasattr(self, "session_label") and self.session_label.winfo_exists():
                remaining = max(0, int(limit - idle))
                state = ("COUNTDOWN" if idle >= self.app.inactivity_grace else "ACTIVE")
                self.session_label.configure(text=f"Session: {state} · {remaining}s")
        self.root.after(1000, self._tick)

    def _status_timer(self):
        if self._closing:
            return
        try:
            self.app.monitor.status_cycle(self.app.inventory.list_medications(),
                                          self.app.faults.active_faults())
            if self.app.current_user and self.page == "Monitoring":
                self._draw()
        except Exception as exc:
            self._banner_text = "Automatic status cycle failed: " + str(exc)
            self._banner_error = True
        self.root.after(30_000, self._status_timer)

    def _expire_session(self):
        self._safe_end_pending("session expired before withdrawal confirmation")
        self.app.current_user = None
        self.app.session_expired = True
        self._banner_text = "Session expired due to inactivity. Sign in again."
        self._banner_error = True
        self._draw()

    def _safe_end_pending(self, reason):
        pending = self.app.dispensing.pending_dispense()
        if pending:
            user = self.app.current_user
            if user and pending["username"] == user.username:
                try:
                    self.app.dispensing.cancel_dispense(user, reason)
                except Exception as exc:
                    # The controller's close-failure path also raises Fault Mode.
                    self._banner_text = "Withdrawal cleanup issue: " + str(exc)
                    self._banner_error = True

    def _on_close(self):
        if self.app.dispensing.pending_dispense():
            if not messagebox.askyesno("Unconfirmed withdrawal",
                   "A dispense is in progress. Closing will attempt to cancel it "
                   "and quarantine uncertain inventory. Close the application?",
                   parent=self.root):
                return
            self._safe_end_pending("application closed before confirmation")
        self._closing = True
        self.root.destroy()

    def _clear(self):
        for child in self.root.winfo_children():
            child.destroy()

    def _label(self, parent, text, size=11, weight="normal", fg=TEXT, **kwargs):
        return tk.Label(parent, text=text, bg=kwargs.pop("bg", PANEL), fg=fg,
                        font=(FONT, size, weight), anchor=kwargs.pop("anchor", "w"),
                        **kwargs)

    def _field(self, parent, label, default="", show=None, width=26):
        self._label(parent, label, size=10, fg=MUTED).pack(anchor="w", pady=(13, 4))
        e = tk.Entry(parent, bg=FIELD, fg=TEXT, insertbackground=TEXT,
                     relief="flat", highlightthickness=1, highlightbackground=BORDER,
                     highlightcolor=ACCENT, font=(FONT, 12), width=width,
                     show=show or "")
        if default != "":
            e.insert(0, str(default))
        e.pack(anchor="w", fill="x", ipady=9)
        return e

    def _button(self, parent, text, command, primary=False, danger=False,
                compact=False, state="normal", **kwargs):
        background = RED if danger else ACCENT if primary else PANEL_HI
        foreground = BG if (primary or danger) else TEXT
        btn = tk.Button(parent, text=text, command=command, state=state,
                        bg=background, fg=foreground, activebackground=BLUE,
                        activeforeground=BG, disabledforeground=MUTED,
                        border=0, relief="flat", cursor="hand2",
                        font=(FONT, 10, "bold"), padx=14 if compact else 20,
                        pady=9 if compact else 12, **kwargs)
        return btn

    def _card(self, parent, title=None, sub=None, fill=None, **kwargs):
        box = tk.Frame(parent, bg=PANEL, highlightbackground=BORDER,
                       highlightthickness=1, padx=20, pady=17, **kwargs)
        if title:
            self._label(box, title, size=15, weight="bold").pack(anchor="w")
        if sub:
            self._label(box, sub, size=10, fg=MUTED, wraplength=660).pack(anchor="w", pady=(6, 12))
        if fill:
            box.pack(**fill)
        return box

    def _tree(self, parent, cols, height=9):
        outer = tk.Frame(parent, bg=PANEL)
        tree = ttk.Treeview(outer, columns=[x[0] for x in cols], show="headings",
                            height=height, selectmode="browse", style="ADC.Treeview")
        for key, label, width in cols:
            tree.heading(key, text=label)
            tree.column(key, width=width, minwidth=75, stretch=True)
        scroll = ttk.Scrollbar(outer, orient="vertical", command=tree.yview)
        tree.configure(yscrollcommand=scroll.set)
        tree.pack(side="left", fill="both", expand=True)
        scroll.pack(side="right", fill="y")
        outer.pack(fill="both", expand=True)
        return tree

    def _execute(self, label, fn, refresh=True):
        try:
            result = fn()
        except Exception as exc:
            self._banner_text = f"{label}: {exc}"
            self._banner_error = True
            self._draw()
            return None
        self._banner_text = f"{label} completed."
        self._banner_error = False
        if refresh:
            self._draw()
        return result

    def _selected_med(self, tree):
        selected = tree.selection()
        if not selected:
            raise ValueError("Choose a medication row first.")
        return tree.item(selected[0], "values")[0]

    def _draw(self):
        self._clear()
        self.root.configure(bg=BG)
        if not self.app.current_user:
            self._login_screen()
            return

        body = tk.Frame(self.root, bg=BG)
        body.pack(fill="both", expand=True)
        sidebar = tk.Frame(body, bg=SIDEBAR, width=222)
        sidebar.pack(side="left", fill="y")
        sidebar.pack_propagate(False)
        self._label(sidebar, "✚  ADC CONTROL", size=16, weight="bold", fg=ACCENT,
                    bg=SIDEBAR).pack(anchor="w", padx=19, pady=(28, 5))
        self._label(sidebar, "PART A  ·  D2 PROTOTYPE", size=9, fg=MUTED,
                    bg=SIDEBAR).pack(anchor="w", padx=21, pady=(0, 24))
        pages = [("Overview", "▦"), ("Inventory", "▤"), ("Dispense", "◫"),
                 ("Faults", "⚠"), ("Monitoring", "↗"), ("Audit Log", "≡"),
                 ("Settings", "⚙")]
        self.nav_buttons = {}
        for name, glyph in pages:
            allowed = name not in ("Audit Log", "Settings") or (
                self.app.current_user.level >= (2 if name == "Audit Log" else 3))
            active = (self.page == name)
            btn = tk.Button(sidebar, text=f"{glyph}   {name}", anchor="w",
                            command=lambda value=name: self._navigate(value),
                            bg=(PANEL_HI if active else SIDEBAR),
                            fg=(ACCENT if active else TEXT if allowed else "#61768E"),
                            activebackground=PANEL_HI, activeforeground=ACCENT,
                            disabledforeground="#61768E", relief="flat", bd=0,
                            cursor="hand2", font=(FONT, 11, "bold" if active else "normal"),
                            padx=22, pady=13, state="normal" if allowed else "disabled")
            btn.pack(fill="x", padx=9, pady=2)
            self.nav_buttons[name] = btn
        tk.Frame(sidebar, bg=SIDEBAR).pack(expand=True)
        self._label(sidebar, f"Signed in: {self.app.current_user.username}",
                    fg=TEXT, size=11, weight="bold", bg=SIDEBAR).pack(anchor="w", padx=18)
        self._label(sidebar, f"Authorization Level {self.app.current_user.level}",
                    fg=MUTED, size=10, bg=SIDEBAR).pack(anchor="w", padx=18, pady=(3, 12))
        self._button(sidebar, "Sign out", self._logout, compact=True).pack(fill="x", padx=14, pady=(0, 18))

        center = tk.Frame(body, bg=BG)
        center.pack(side="left", fill="both", expand=True)
        head = tk.Frame(center, bg=BG)
        head.pack(fill="x", padx=28, pady=(20, 12))
        self._label(head, self.page, size=25, weight="bold", bg=BG).pack(side="left")
        mode = self.app.faults.mode.value
        monitor = "CONNECTED" if self.app.monitor.connected else "OFFLINE"
        pill = tk.Frame(head, bg=PANEL, padx=12, pady=9)
        pill.pack(side="right")
        self._label(pill, f"● MODE: {mode}", fg=GOOD if mode == "NORMAL" else YELLOW if mode == "MAINTENANCE" else RED,
                    size=10, weight="bold").pack(side="left", padx=(0, 13))
        self._label(pill, f"● MONITOR: {monitor}", fg=GOOD if self.app.monitor.connected else YELLOW,
                    size=10, weight="bold").pack(side="left")
        if self._banner_text:
            banner = tk.Frame(center, bg="#633444" if self._banner_error else "#174D45", padx=14, pady=10)
            banner.pack(fill="x", padx=28, pady=(0, 9))
            self._label(banner, ("⚠ " if self._banner_error else "✓ ")+self._banner_text,
                        bg=banner["bg"], size=10, wraplength=800).pack(anchor="w")
            self._banner_text = ""

        footer = tk.Frame(center, bg=SIDEBAR, padx=28, pady=10)
        footer.pack(side="bottom", fill="x")
        self.session_label = self._label(footer, "Session active", fg=MUTED,
                                         bg=SIDEBAR, size=9)
        self.session_label.pack(side="left")
        self._label(footer, "SIMULATED HARDWARE  •  DEMO DATA ONLY  •  NO LIVE PART B LINK",
                    fg=MUTED, bg=SIDEBAR, size=9).pack(side="right")

        canvas = tk.Canvas(center, bg=BG, highlightthickness=0)
        scrollbar = ttk.Scrollbar(center, orient="vertical", command=canvas.yview)
        area = tk.Frame(canvas, bg=BG)
        window = canvas.create_window((0,0), window=area, anchor="nw")
        area.bind("<Configure>", lambda e: canvas.configure(scrollregion=canvas.bbox("all")))
        canvas.bind("<Configure>", lambda e: canvas.itemconfigure(window, width=e.width))
        canvas.configure(yscrollcommand=scrollbar.set)
        canvas.pack(side="left", fill="both", expand=True, padx=(28,0))
        scrollbar.pack(side="right", fill="y")
        self.content = tk.Frame(area, bg=BG)
        self.content.pack(fill="both", expand=True, padx=(0,24), pady=(5,30))
        getattr(self, "_page_" + self.page.lower().replace(" ", "_"))()

    def _navigate(self, page):
        self.page = page
        self._draw()

    def _login_screen(self):
        wrapper = tk.Frame(self.root, bg=BG)
        wrapper.pack(fill="both", expand=True)
        self._label(wrapper, "✚  ADC CONTROL CENTER", bg=BG, fg=ACCENT,
                    size=22, weight="bold", anchor="center").pack(pady=(48, 8))
        self._label(wrapper, "AUTOMATED DISPENSING CABINET  |  PART A — DELIVERABLE 2",
                    bg=BG, fg=MUTED, size=11, anchor="center").pack()
        card = self._card(wrapper)
        card.pack(pady=(27, 12), ipadx=24, padx=20)
        self._label(card, "Operator sign in", size=18, weight="bold").pack(anchor="w")
        self._label(card, "Authentication uses the existing Python security module.",
                    fg=MUTED, size=10).pack(anchor="w", pady=(5, 4))
        username = self._field(card, "Username", width=33)
        password = self._field(card, "Password", show="*", width=33)
        recovery = tk.BooleanVar(value=False)
        tk.Checkbutton(card, text="Level 2/3 lockout recovery login", variable=recovery,
                       bg=PANEL, fg=MUTED, activebackground=PANEL, activeforeground=TEXT,
                       selectcolor=FIELD, font=(FONT, 10)).pack(anchor="w", pady=(14,6))
        def submit():
            try:
                user = self.app.auth.login(username.get().strip(), password.get(),
                                           recovery=recovery.get())
                self.app.current_user = user
                self.app.session_expired = False
                self.last_input = datetime.now().astimezone()
                self.app.last_activity = self.last_input
                self.page = "Overview"
                self._banner_text = f"Welcome, {user.username}. Authorization Level {user.level}."
                self._banner_error = False
                self._draw()
            except Exception as exc:
                self._banner_text = "Login failed: " + str(exc)
                self._banner_error = True
                self._draw()
        self._button(card, "SIGN IN", submit, primary=True).pack(fill="x", pady=(16,4))
        username.bind("<Return>", lambda _e: password.focus_set())
        password.bind("<Return>", lambda _e: submit())
        self._label(card, "Quick-fill demonstration accounts", fg=MUTED, size=10).pack(anchor="w", pady=(23, 9))
        row = tk.Frame(card, bg=PANEL)
        row.pack(fill="x")
        for display, uname, pw in [("Nurse · L1", "nurse1", "Nurse123!!!"),
                                   ("Pharmacist · L2", "pharm1", "Pharm123!!!"),
                                   ("Admin · L3", "admin1", "Admin123!!!")]:
            def fill(u=uname, p=pw):
                username.delete(0, "end"); username.insert(0,u)
                password.delete(0, "end"); password.insert(0,p)
            self._button(row, display, fill, compact=True).pack(side="left", padx=(0,7))
        if self._banner_text:
            self._label(wrapper, self._banner_text, bg=BG,
                        fg=RED if self._banner_error else GOOD,
                        size=11, anchor="center", wraplength=760).pack(pady=14)
            self._banner_text = ""
        self._label(wrapper, "PROTOTYPE ONLY · NO REAL MEDICATION OR PATIENT DATA · NO LIVE NETWORK",
                    bg=BG, fg=MUTED, size=10, anchor="center").pack(pady=(20, 0))
        username.focus_set()

    def _logout(self):
        pending = self.app.dispensing.pending_dispense()
        if pending and not messagebox.askyesno("Unconfirmed dispense",
             "Signing out will cancel the open withdrawal and quarantine its inventory. Continue?",
             parent=self.root):
            return
        self._safe_end_pending("operator logged out before confirmation")
        self.app.current_user = None
        self._banner_text = "You have signed out."
        self._banner_error = False
        self._draw()

    def _stat(self, parent, title, value, note, color=ACCENT):
        box = self._card(parent)
        box.pack(side="left", fill="both", expand=True, padx=(0,12))
        self._label(box, title.upper(), size=9, fg=MUTED, weight="bold").pack(anchor="w")
        self._label(box, str(value), size=29, fg=color, weight="bold").pack(anchor="w", pady=(8,3))
        self._label(box, note, size=9, fg=MUTED, wraplength=165, justify="left").pack(anchor="w")

    def _page_overview(self):
        med = self.app.inventory.list_medications()
        faults = self.app.faults.active_faults()
        events = self.app.logger.events()
        self._label(self.content, "Cabinet at a glance", fg=MUTED, bg=BG, size=12).pack(anchor="w", pady=(0,18))
        row = tk.Frame(self.content, bg=BG)
        row.pack(fill="x", pady=(0,18))
        self._stat(row, "Stored medication", sum(m.quantity for m in med), "Units across assigned containers")
        self._stat(row, "Assigned drawers", f"{len(med)} / 5", "Capacity: 20 units per drawer", BLUE)
        self._stat(row, "Active faults", len(faults), "Error/Critical block normal operations",
                   RED if faults else GOOD)
        self._stat(row, "Audit events", f"{len(events)} / 500", "Volatile demonstration log", YELLOW)
        status = self._card(self.content, "System status and safety interlocks",
                            "These statuses come directly from backend services.")
        status.pack(fill="x", pady=(0,18))
        lines = [
            ("Operating mode", self.app.faults.mode.value),
            ("Physical drawer", "OPEN · "+str(self.app.hardware.open_location)
             if self.app.hardware.is_open() else "CLOSED"),
            ("Monitoring", "CONNECTED (simulated)" if self.app.monitor.connected
             else "OFFLINE (simulated)"),
            ("Dispense", "AWAITING CONFIRMATION" if self.app.dispensing.pending_dispense()
             else "NO ACTIVE REQUEST"),
            ("Audit capacity", "AVAILABLE" if self.app.logger.can_record()
             else "FULL · PROTECTED ACTIONS BLOCKED"),
        ]
        for k,v in lines:
            line = tk.Frame(status, bg=PANEL)
            line.pack(fill="x", pady=5)
            self._label(line, k, fg=MUTED, size=10).pack(side="left")
            self._label(line, v, size=10, weight="bold").pack(side="right")
        quick = self._card(self.content, "Demo actions",
                           "Try a normal withdrawal, then inject a simulated fault or communications outage.")
        quick.pack(fill="x")
        buttons = tk.Frame(quick, bg=PANEL)
        buttons.pack(anchor="w")
        for name in ("Inventory", "Dispense", "Faults", "Monitoring"):
            self._button(buttons, "Open " + name, lambda n=name: self._navigate(n),
                         compact=True).pack(side="left", padx=(0,9))

    def _page_inventory(self):
        med_list = self.app.inventory.list_medications()
        box = self._card(self.content, "Medication inventory",
                         "Inventory values are read from DataStore through InventoryManager.")
        box.pack(fill="x", pady=(0,18))
        cols = [("id", "Medication ID", 130),("name", "Medication", 165),
                ("strength", "Strength", 75),("qty", "Quantity", 75),
                ("loc", "Location", 115),("policy", "Policy group", 145),
                ("avail", "Availability", 120)]
        tree = self._tree(box, cols, height=7)
        for med in med_list:
            tree.insert("", "end", values=(med.medication_id, med.name, med.strength,
                        f"{med.quantity} / 20", med.location, med.policy_group,
                        "AVAILABLE" if med.available else "UNAVAILABLE"))
        details = self._label(box, "Select a row to view its details.", size=10, fg=MUTED,
                              wraplength=840)
        details.pack(fill="x", pady=(12,0))
        def select(_e=None):
            try:
                m = self.app.store.get_medication(self._selected_med(tree))
                patient = m.patient_name if self.app.current_user.level>=2 else "Restricted in this interface"
                details.configure(text=f"Patient: {patient}   ·   Added: {m.insertion_date}   ·   "
                    f"Last accessed: {m.last_access_date or 'Never'}   ·   By: {m.last_access_user or '—'}")
            except Exception:
                pass
        tree.bind("<<TreeviewSelect>>", select)
        if self.app.current_user.level < 2:
            note = self._card(self.content, "Level 1 · Read access",
                              "Registration, replenishment, corrections and policies require Level 2 or higher.")
            note.pack(fill="x")
            return
        act = self._card(self.content, "Inventory operations · Level 2+",
                         "Select a medication above. These buttons call the real inventory module.")
        act.pack(fill="x")
        form = tk.Frame(act, bg=PANEL)
        form.pack(fill="x")
        a = tk.Frame(form, bg=PANEL)
        a.pack(side="left", fill="x", expand=True, padx=(0,18))
        qty = self._field(a, "Quantity (add / corrected total)", "1", width=20)
        b = tk.Frame(form, bg=PANEL)
        b.pack(side="left", fill="x", expand=True)
        self._label(b, "Inventory availability", size=10, fg=MUTED).pack(anchor="w", pady=(13,7))
        self._label(b, "Uncertain stock must be corrected before use.", fg=YELLOW,
                    size=10, wraplength=310).pack(anchor="w")
        row = tk.Frame(act, bg=PANEL)
        row.pack(fill="x", pady=(15, 1))
        def do_replenish():
            return self.app.inventory.replenish(self.app.current_user, self._selected_med(tree), int(qty.get()))
        def do_correct():
            return self.app.inventory.correct_quantity(self.app.current_user, self._selected_med(tree), int(qty.get()))
        def do_unavailable():
            return self.app.inventory.mark_unavailable(self.app.current_user, self._selected_med(tree))
        self._button(row, "Replenish", lambda: self._execute("Replenishment", do_replenish), primary=True,
                     compact=True).pack(side="left", padx=(0,9))
        self._button(row, "Correct quantity", lambda: self._execute("Quantity correction", do_correct),
                     compact=True).pack(side="left", padx=(0,9))
        self._button(row, "Mark unavailable", lambda: self._execute("Mark unavailable", do_unavailable),
                     compact=True).pack(side="left", padx=(0,9))
        self._button(row, "Register medication", self._register_dialog, compact=True).pack(side="left", padx=(0,9))
        self._button(row, "Policies…", self._policy_dialog, compact=True).pack(side="left")

    def _dialog(self, title, width=460, height=410):
        d = tk.Toplevel(self.root)
        d.title(title)
        d.configure(bg=PANEL)
        d.geometry(f"{width}x{height}")
        d.transient(self.root)
        d.grab_set()
        return d

    def _register_dialog(self):
        d = self._dialog("Register medication", height=510)
        body = tk.Frame(d, bg=PANEL, padx=25, pady=18)
        body.pack(fill="both", expand=True)
        self._label(body, "Register medication · Level 2+", size=17, weight="bold").pack(anchor="w")
        name = self._field(body, "Medication name")
        strength = self._field(body, "Strength")
        patient = self._field(body, "Fictional patient label", "Patient C")
        qty = self._field(body, "Initial quantity (0–20)", "5")
        location = self._field(body, "Container location", "Container 3")
        def save():
            try:
                med = self.app.inventory.add_medication(self.app.current_user,
                   name.get().strip(), strength.get().strip(), patient.get().strip(),
                   int(qty.get()), location.get().strip())
                d.destroy()
                self._banner_text = f"Medication registered: {med.medication_id}"
                self._banner_error = False
                self._draw()
            except Exception as exc:
                messagebox.showerror("Registration rejected", str(exc), parent=d)
        self._button(body, "Register", save, primary=True).pack(anchor="w", pady=14)

    def _policy_dialog(self):
        d = self._dialog("Configure withdrawal policy", height=430)
        body = tk.Frame(d, bg=PANEL, padx=25, pady=18)
        body.pack(fill="both", expand=True)
        self._label(body, "Withdrawal policies · Level 2+", size=17, weight="bold").pack(anchor="w")
        pid = self._field(body, "Policy identifier", "POLICY-NEW")
        maximum = self._field(body, "Maximum quantity", "5")
        window = self._field(body, "Window in seconds", "86400")
        medid = self._field(body, "Medication ID to assign", "MED-001")
        def save():
            try:
                self.app.inventory.set_policy(self.app.current_user, pid.get().strip(),
                                              int(maximum.get()), int(window.get()))
                self.app.inventory.assign_policy_group(self.app.current_user,
                                    medid.get().strip(), pid.get().strip())
                d.destroy()
                self._banner_text = "Withdrawal policy configured and assigned."
                self._banner_error = False
                self._draw()
            except Exception as exc:
                messagebox.showerror("Policy rejected", str(exc), parent=d)
        self._button(body, "Save policy", save, primary=True).pack(anchor="w", pady=13)

    def _page_dispense(self):
        pending = self.app.dispensing.pending_dispense()
        card = self._card(self.content, "Safe medication dispensing",
                          "Workflow: validate → unlock → close drawer → confirm actual quantity → update stock.")
        card.pack(fill="x")
        if pending:
            self._dispense_pending(card, pending)
        else:
            meds = self.app.inventory.list_medications()
            if not meds:
                self._label(card, "No medication records available.", fg=YELLOW).pack()
                return
            self._label(card, "Select medication", fg=MUTED, size=10).pack(anchor="w", pady=(8,6))
            choices = [f"{m.medication_id}  ·  {m.name}  ·  {m.quantity} available" for m in meds]
            choice = ttk.Combobox(card, values=choices, state="readonly", style="ADC.TCombobox", width=54)
            choice.current(0)
            choice.pack(anchor="w", fill="x", pady=(0,9))
            request_qty = self._field(card, "Requested quantity", "1", width=22)
            request_id = self._field(card, "Unique request ID (generated)", new_id("REQ"), width=48)
            repeat = tk.BooleanVar(value=False)
            tk.Checkbutton(card, text="I explicitly confirm this is an intentional repeat withdrawal",
                           variable=repeat, bg=PANEL, fg=TEXT, selectcolor=FIELD,
                           activebackground=PANEL, activeforeground=TEXT,
                           font=(FONT, 10)).pack(anchor="w", pady=(15,9))
            policy_info = self._label(card, "", fg=MUTED, size=10, wraplength=720)
            policy_info.pack(anchor="w", pady=(4,12))
            def get_med():
                return choice.get().split("  ·",1)[0]
            def show_policy(_event=None):
                try:
                    pol, history, remaining = self.app.dispensing.policy_status(get_med())
                    policy_info.configure(text=f"Policy {pol.policy_id} · Max {pol.max_quantity} / "
                        f"{pol.window_seconds}s · Remaining {remaining} · Prior withdrawals: "
                        + (", ".join(str(q) for _,q in history) if history else "none"))
                except Exception as exc:
                    policy_info.configure(text=str(exc))
            choice.bind("<<ComboboxSelected>>", show_policy)
            show_policy()
            def begin():
                def op():
                    return self.app.dispensing.start_dispense(self.app.current_user,
                          get_med(), int(request_qty.get()), request_id.get().strip(), repeat.get())
                self._execute("Drawer unlock", op)
            self._button(card, "1  Validate and unlock drawer", begin, primary=True).pack(anchor="w", pady=(8,6))
        disclaimer = self._card(self.content, "Safety note",
                    "This interface simulates drawer access. No actual medication is counted or dispensed. "
                    "Unconfirmed access quarantines the affected inventory until a Level 2/3 correction.")
        disclaimer.pack(fill="x", pady=(17,0))

    def _dispense_pending(self, card, pending):
        mine = pending["username"] == self.app.current_user.username
        self._label(card, "ACTIVE REQUEST  ·  " + pending["request_id"], fg=ACCENT,
                    size=13, weight="bold").pack(anchor="w", pady=(9,7))
        med = self.app.store.get_medication(pending["medication_id"])
        self._label(card, f"{pending['medication_id']}  ·  {med.name}   |   Requested: "
                    f"{pending['requested_quantity']}   |   {med.location}",
                    size=12).pack(anchor="w", pady=5)
        state = "DRAWER CLOSED — AWAITING CONFIRMATION" if pending["drawer_closed"] else "DRAWER UNLOCKED / OPEN"
        self._label(card, state, fg=GOOD if pending["drawer_closed"] else YELLOW,
                    weight="bold", size=12).pack(anchor="w", pady=(10,14))
        if not mine:
            self._label(card, "Only the initiating operator can finish this request.", fg=RED).pack()
            return
        if not pending["drawer_closed"]:
            self._label(card, "Simulate removing medication, then close the drawer.",
                        size=11, fg=MUTED).pack(anchor="w", pady=(0,12))
            self._button(card, "2  Close simulated drawer",
                lambda: self._execute("Drawer close", lambda:
                                      self.app.dispensing.close_dispense_drawer(self.app.current_user)),
                primary=True).pack(anchor="w", pady=(0,9))
        else:
            actual = self._field(card, "3  Actual quantity confirmed (0 to requested)",
                                 str(pending["requested_quantity"]), width=24)
            row = tk.Frame(card, bg=PANEL)
            row.pack(anchor="w", pady=(16,4))
            self._button(row, "Confirm actual quantity and finish",
                 lambda: self._execute("Dispense completion", lambda:
                     self.app.dispensing.complete_dispense(self.app.current_user, int(actual.get()))),
                 primary=True, compact=True).pack(side="left", padx=(0,10))
        self._button(card, "Cancel / quantity uncertain",
                     lambda: self._execute("Withdrawal cancelled and inventory quarantined", lambda:
                     self.app.dispensing.cancel_dispense(self.app.current_user)),
                     danger=True, compact=True).pack(anchor="w", pady=(12,4))

    def _page_faults(self):
        card = self._card(self.content, "Active faults and recovery",
                         "Warnings may remain in Normal Mode; Error and Critical faults enter Fault Mode.")
        card.pack(fill="x", pady=(0,16))
        cols=[("id","Fault ID",190),("severity","Severity",95),
              ("type","Fault type",150),("cause","Cause present?",135),
              ("message","Description",280)]
        tree=self._tree(card, cols, height=7)
        for fault in self.app.faults.active_faults():
            tree.insert("", "end", values=(fault.fault_id, fault.severity.value,
                        fault.fault_type, "YES" if fault.condition_present else "NO", fault.message))
        controls = self._card(self.content, "Simulated fault injection",
             "Demo-only controls. These are not physical sensor readings or live clinical diagnostics.")
        controls.pack(fill="x", pady=(0,16))
        kind = tk.StringVar(value="DRAWER_UNLOCK")
        severity = tk.StringVar(value="ERROR")
        bar = tk.Frame(controls,bg=PANEL)
        bar.pack(anchor="w", pady=(0,12))
        self._label(bar,"Type",fg=MUTED,size=10).pack(side="left",padx=(0,9))
        ttk.Combobox(bar, textvariable=kind, values=["DRAWER_UNLOCK","DRAWER_CLOSE","SOFTWARE"],
                     width=23, state="readonly",style="ADC.TCombobox").pack(side="left",padx=(0,16))
        self._label(bar,"Severity",fg=MUTED,size=10).pack(side="left",padx=(0,9))
        ttk.Combobox(bar,textvariable=severity,values=[x.value for x in Severity],
                     width=17,state="readonly",style="ADC.TCombobox").pack(side="left")
        def raise_demo():
            def action():
                k=kind.get()
                if k=="DRAWER_UNLOCK": self.app.hardware.fail_unlock=True
                if k=="DRAWER_CLOSE": self.app.hardware.fail_close=True
                return self.app.faults.raise_fault(Severity(severity.get()), k,
                                "Simulated " + k + " fault.", True)
            self._execute("Simulated fault", action)
        self._button(controls,"Inject simulated fault",raise_demo,danger=True,compact=True).pack(anchor="w")
        recovery=self._card(self.content,"Recover from fault · Level 2/3",
             "Select an active fault above. In this demonstration, resolving the cause "
             "simulates a successful hardware repair. Clearance still enforces the backend role check.")
        recovery.pack(fill="x")
        row=tk.Frame(recovery,bg=PANEL)
        row.pack(anchor="w")
        def selected():
            sel=tree.selection()
            if not sel: raise ValueError("Select an active fault first.")
            return tree.item(sel[0],"values")[0]
        def resolve():
            def op():
                fid=selected()
                self.app.faults.check_clear_permission(fid,self.app.current_user)
                f=next(f for f in self.app.faults.active_faults() if f.fault_id==fid)
                if f.fault_type=="DRAWER_CLOSE":
                    self.app.hardware.fail_close=False
                    # A failed close may have left a drawer physically open.
                    # Simulate successful repair and closure BEFORE declaring
                    # the trigger resolved; do not silently ignore open hardware.
                    if self.app.hardware.is_open() and not self.app.hardware.close_drawer():
                        raise RuntimeError("Drawer remains open; cause cannot be resolved.")
                if f.fault_type=="DRAWER_UNLOCK":
                    self.app.hardware.fail_unlock=False
                self.app.faults.resolve_condition(fid)
            self._execute("Simulated cause resolved",op)
        def clear():
            self._execute("Fault clearance",lambda:
                         self.app.faults.clear_fault(selected(),self.app.current_user))
        self._button(row,"1  Simulate cause resolved",resolve,compact=True).pack(side="left",padx=(0,10))
        self._button(row,"2  Clear selected fault",clear,primary=True,compact=True).pack(side="left")

    def _page_monitoring(self):
        monitor=self.app.monitor
        card=self._card(self.content,"Hospital Monitoring System · simulated adapter",
             "Uses the real MonitorCommunication module; there is NO live Part B HTTP connection.")
        card.pack(fill="x",pady=(0,16))
        self._label(card,f"Link: {'CONNECTED (SIMULATED)' if monitor.connected else 'OFFLINE (SIMULATED)'}",
                    size=14,weight="bold",fg=GOOD if monitor.connected else YELLOW).pack(anchor="w",pady=(4,8))
        row=tk.Frame(card,bg=PANEL)
        row.pack(anchor="w",pady=(0,8))
        self._button(row,"Toggle simulated connection",
                     lambda: self._execute("Communication state",lambda:
                      monitor.set_connection(not monitor.connected)),compact=True,primary=True).pack(side="left",padx=(0,10))
        self._button(row,"Send status cycle",
                     lambda: self._execute("Status cycle",lambda:
                      monitor.status_cycle(self.app.inventory.list_medications(),
                                           self.app.faults.active_faults())),compact=True).pack(side="left",padx=(0,10))
        self._button(row,"Simulate acknowledgements",
                     lambda: self._execute("Acknowledgement flush", monitor.flush_simulated),
                     compact=True).pack(side="left")
        self._label(card,"Auto status cycle: every 30 seconds while the GUI is open. "
                    "Offline messages remain in the in-memory outbox.",fg=MUTED,size=10).pack(anchor="w",pady=(7,0))
        status=monitor.build_status(self.app.inventory.list_medications(),self.app.faults.active_faults())
        stats=self._card(self.content,"Current status JSON")
        stats.pack(fill="x",pady=(0,16))
        data=tk.Text(stats,height=12,bg=FIELD,fg=TEXT,insertbackground=TEXT,font=("Consolas",10),
                     padx=12,pady=10,relief="flat",wrap="none")
        data.insert("1.0",json.dumps(status,indent=2))
        data.configure(state="disabled")
        data.pack(fill="x")
        exports=tk.Frame(stats,bg=PANEL)
        exports.pack(anchor="w",pady=(12,0))
        def export_status():
            path=filedialog.asksaveasfilename(title="Export ADC status JSON",defaultextension=".json",
                   initialfile="adc_status.json",filetypes=[("JSON files","*.json")],parent=self.root)
            if path: self._execute("Status exported",lambda:
                   monitor.export_status_json(self.app.inventory.list_medications(),
                                               self.app.faults.active_faults(),path))
        def export_outbox():
            path=filedialog.asksaveasfilename(title="Export ADC outbox JSON",defaultextension=".json",
                   initialfile="adc_outbox.json",filetypes=[("JSON files","*.json")],parent=self.root)
            if path: self._execute("Outbox exported",lambda:monitor.export_outbox_json(path))
        self._button(exports,"Export status JSON",export_status,compact=True).pack(side="left",padx=(0,10))
        self._button(exports,"Export outbox JSON",export_outbox,compact=True).pack(side="left")
        remote=self._card(self.content,"Remote unlock test · simulated command",
              "Requires simulated link online and local dispense safety checks. "
              "Unlock is never equivalent to a completed withdrawal.")
        remote.pack(fill="x")
        row=tk.Frame(remote,bg=PANEL)
        row.pack(fill="x")
        left=tk.Frame(row,bg=PANEL)
        left.pack(side="left",padx=(0,18))
        mid=self._field(left,"Medication ID","MED-001",width=22)
        right=tk.Frame(row,bg=PANEL)
        right.pack(side="left")
        qty=self._field(right,"Quantity","1",width=15)
        def test_remote():
            cmd={"command_id":new_id("CMD"),"source":"MONITORING_SYSTEM",
                 "command_type":"REMOTE_UNLOCK","medication_id":mid.get().strip(),
                 "quantity":int(qty.get()),"authorization":"DEMO-VALIDATED"}
            try:
                result=monitor.handle_command(cmd,self.app.current_user,self.app.dispensing,
                                              self.app.store,self.app.faults)
                if not result.get("accepted"):
                    raise RuntimeError(result.get("reason","Rejected"))
                self.page="Dispense"
                self._banner_text="Remote unlock accepted; local closure and confirmation still required."
                self._banner_error=False
                self._draw()
            except Exception as exc:
                self._banner_text="Remote unlock rejected: "+str(exc)
                self._banner_error=True
                self._draw()
        self._button(remote,"Test remote unlock",test_remote,compact=True,primary=True).pack(anchor="w",pady=(14,0))

    def _page_audit_log(self):
        self.app.access.require_level(self.app.current_user,2)
        card=self._card(self.content,"Audit trail",
             "The logger is limited to 500 events and never silently overwrites unacknowledged records.")
        card.pack(fill="x",pady=(0,16))
        events=self.app.logger.events()
        if self.app.current_user.level==2:
            allowed={"FAULT_RAISED","FAULT_CLEARED","REPLENISHMENT","INVENTORY_CORRECTION",
                     "DISPENSE_COMPLETED","INVENTORY_UNCERTAIN","DISPENSE_INCOMPLETE"}
            events=[e for e in events if e.event_type in allowed]
        cols=[("id","Event ID",176),("time","Time",164),("kind","Event",195),
              ("user","Operator",90),("outcome","Outcome",100),("ack","Synced",83)]
        tree=self._tree(card,cols,height=12)
        by_id={}
        for e in reversed(events):
            by_id[e.record_id]=e
            tree.insert("","end",values=(e.record_id,e.timestamp,e.event_type,e.user or "System",
                      e.outcome,"YES" if e.acknowledged else "NO"))
        detail=self._card(self.content,"Selected event details")
        detail.pack(fill="x",pady=(0,14))
        info=tk.Text(detail,height=6,bg=FIELD,fg=TEXT,font=("Consolas",10),
                     relief="flat",padx=12,pady=8)
        info.insert("1.0","Select a record above to inspect its details.")
        info.configure(state="disabled")
        info.pack(fill="x")
        def selected(_e=None):
            selection=tree.selection()
            if not selection: return None
            eid=tree.item(selection[0],"values")[0]
            item=by_id.get(eid)
            if item:
                info.configure(state="normal")
                info.delete("1.0","end")
                info.insert("1.0",json.dumps(item.details,indent=2,default=str))
                info.configure(state="disabled")
            return eid
        tree.bind("<<TreeviewSelect>>",selected)
        if self.app.current_user.level>=3:
            bar=tk.Frame(self.content,bg=BG)
            bar.pack(anchor="w")
            def acknowledge():
                def op():
                    eid=selected()
                    if not eid: raise ValueError("Select a record.")
                    if not self.app.logger.acknowledge(eid): raise ValueError("Event not found.")
                self._execute("Acknowledgement",op)
            self._button(bar,"Acknowledge selected",acknowledge,compact=True).pack(side="left",padx=(0,12))
            self._button(bar,"Clear acknowledged records",lambda:
                 self._execute("Clear acknowledged",lambda:
                     self.app.logger.clear_acknowledged(self.app.current_user)),
                 compact=True).pack(side="left")

    def _page_settings(self):
        self.app.access.require_level(self.app.current_user,3)
        mode=self._card(self.content,"Operating mode · Level 3",
             "Maintenance Mode blocks normal inventory and dispensing operations.")
        mode.pack(fill="x",pady=(0,16))
        bar=tk.Frame(mode,bg=PANEL)
        bar.pack(anchor="w")
        self._button(bar,"Enter Maintenance",lambda:
            self._execute("Maintenance entered",lambda:
            self.app.faults.enter_maintenance(self.app.current_user)),compact=True).pack(side="left",padx=(0,12))
        self._button(bar,"Exit Maintenance",lambda:
            self._execute("Maintenance exited",lambda:
            self.app.faults.exit_maintenance(self.app.current_user)),compact=True).pack(side="left")
        login=self._card(self.content,"Authentication and lockout settings",
                         "These settings call Authentication rather than changing UI-only limits.")
        login.pack(fill="x",pady=(0,16))
        lr=tk.Frame(login,bg=PANEL)
        lr.pack(anchor="w")
        a=tk.Frame(lr,bg=PANEL)
        a.pack(side="left",padx=(0,20))
        attempts=self._field(a,"Failed login attempts",str(self.app.auth.max_attempts),width=18)
        b=tk.Frame(lr,bg=PANEL)
        b.pack(side="left")
        lockout=self._field(b,"Lockout duration (seconds)",str(self.app.auth.lockout_seconds),width=18)
        br=tk.Frame(login,bg=PANEL)
        br.pack(anchor="w",pady=(13,0))
        self._button(br,"Save lockout policy",lambda:
          self._execute("Lockout settings",lambda:
             self.app.auth.configure(self.app.current_user,int(attempts.get()),int(lockout.get()))),
             primary=True,compact=True).pack(side="left",padx=(0,12))
        self._button(br,"Clear login lockout",lambda:
          self._execute("Login lockout clearance",lambda:
             self.app.auth.clear_lockout(self.app.current_user)),compact=True).pack(side="left")
        inactivity=self._card(self.content,"Session inactivity timer",
             "Unlike the terminal version, this GUI runs an event-loop timer and shows "
             "the countdown. Idle expiration safely cancels any pending dispense.")
        inactivity.pack(fill="x")
        rr=tk.Frame(inactivity,bg=PANEL)
        rr.pack(anchor="w")
        c=tk.Frame(rr,bg=PANEL)
        c.pack(side="left",padx=(0,20))
        grace=self._field(c,"Grace period (≥15s)",str(self.app.inactivity_grace),width=18)
        d=tk.Frame(rr,bg=PANEL)
        d.pack(side="left")
        timeout=self._field(d,"Countdown duration (1–900s)",str(self.app.inactivity_timeout),width=18)
        def save_inactivity():
            def op():
                g=int(grace.get()); t=int(timeout.get())
                if g<15 or not 1<=t<=900: raise ValueError("Grace ≥15 and countdown 1–900 seconds required.")
                self.app.logger.record("INACTIVITY_CONFIGURED",self.app.current_user.username,
                                       {"grace":g,"timeout":t})
                self.app.inactivity_grace=g
                self.app.inactivity_timeout=t
                self.last_input=datetime.now().astimezone()
            self._execute("Inactivity settings",op)
        self._button(inactivity,"Save inactivity policy",save_inactivity,
                     primary=True,compact=True).pack(anchor="w",pady=(13,2))


def launch_gui():
    root=tk.Tk()
    ADCDesktopApp(root)
    root.mainloop()


if __name__ == "__main__":
    launch_gui()
