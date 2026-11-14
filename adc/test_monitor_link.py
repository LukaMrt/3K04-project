"""Tests of monitor_link.py against a fake Monitoring System that follows the interface contract."""
import json
import re
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib import request as urlrequest

from adc_app import ADCApplication
from models import Mode, Severity
from monitor_link import MonitorLink

UUID_V4 = re.compile(r"^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$")
TIMESTAMP = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$")


class FakeMonitoring:
    """Records every request; answers 200 with "received" for every transaction unless told otherwise."""

    def __init__(self):
        self.requests = []
        self.next_status = []  # statuses to answer first, one per request
        fake = self

        class Handler(BaseHTTPRequestHandler):
            def do_POST(self):
                body = json.loads(self.rfile.read(int(self.headers["Content-Length"])))
                fake.requests.append((self.path, body))
                status = fake.next_status.pop(0) if fake.next_status else 200
                if status != 200:
                    answer = {"error": {"code": "ADC_NOT_REGISTERED" if status == 404 else "INTERNAL_ERROR",
                                        "message": "test"}}
                elif self.path == "/api/v1/heartbeats":
                    answer = {"receivedAt": "2026-11-13T00:00:00.000Z",
                              "acknowledgements": [{"transactionId": t["transactionId"], "status": "received"}
                                                   for t in body["transactions"]]}
                else:
                    answer = {"adcId": body["adcId"], "registeredAt": "2026-11-13T00:00:00.000Z",
                              "firstRegistration": True, "heartbeatPeriodSeconds": 30}
                data = json.dumps(answer).encode()
                self.send_response(status)
                self.send_header("Content-Length", str(len(data)))
                self.end_headers()
                self.wfile.write(data)

            def log_message(self, *args):
                pass

        self.server = ThreadingHTTPServer(("127.0.0.1", 0), Handler)
        self.url = "http://127.0.0.1:{}".format(self.server.server_address[1])
        threading.Thread(target=self.server.serve_forever, daemon=True).start()

    def heartbeats(self):
        return [body for path, body in self.requests if path == "/api/v1/heartbeats"]

    def close(self):
        self.server.shutdown()
        self.server.server_close()


class MonitorLinkTest(unittest.TestCase):
    def setUp(self):
        self.monitoring = FakeMonitoring()
        self.tmp = tempfile.TemporaryDirectory()
        self.identity = str(Path(self.tmp.name) / "identity.json")
        self.app = ADCApplication()
        self.link = self.new_link()
        self.nurse = self.app.store.get_user("nurse1")

    def tearDown(self):
        self.monitoring.close()
        self.tmp.cleanup()

    def new_link(self):
        return MonitorLink(self.app, self.monitoring.url, "http://127.0.0.1:8799", "ADC Test", 2,
                           "Test room", listen=("127.0.0.1", 0), identity_path=self.identity)

    def transactions_of_last_heartbeat(self):
        return self.monitoring.heartbeats()[-1]["transactions"]

    # ---------------------------------------------------------------- ADC -> Monitoring

    def test_registers_then_sends_heartbeat_in_contract_format(self):
        self.link.cycle()
        (path1, registration), (path2, heartbeat) = self.monitoring.requests
        self.assertEqual((path1, path2), ("/api/v1/adcs/register", "/api/v1/heartbeats"))
        self.assertRegex(registration["adcId"], UUID_V4)
        self.assertEqual(registration["location"], {"floor": 2, "description": "Test room"})
        self.assertEqual(heartbeat["adcId"], registration["adcId"])
        self.assertRegex(heartbeat["sentAt"], TIMESTAMP)
        self.assertEqual(heartbeat["state"], "online")
        self.assertEqual(len(heartbeat["inventory"]), len(self.app.store.list_medications()))
        for line in heartbeat["inventory"]:
            self.assertRegex(line["medicationId"], UUID_V4)
        self.assertIn({"medicationId": heartbeat["inventory"][0]["medicationId"],
                       "medicationName": "Demo medication 10 mg", "quantityInBoxes": 10}, heartbeat["inventory"])
        self.assertEqual(heartbeat["transactions"], [])

    def test_adc_id_and_medication_ids_are_kept_across_restarts(self):
        self.link.cycle()
        first = self.monitoring.heartbeats()[-1]
        self.link = self.new_link()
        self.link.cycle()
        second = self.monitoring.heartbeats()[-1]
        self.assertEqual(first["adcId"], second["adcId"])
        self.assertEqual(first["inventory"], second["inventory"])

    def test_completed_dispense_is_sent_once_with_all_fields(self):
        self.app.dispensing.dispense(self.nurse, "MED-001", 2, "REQ-1", confirmed_quantity=2)
        self.link.cycle()
        [transaction] = self.transactions_of_last_heartbeat()
        self.assertEqual(transaction["type"], "dispensing")
        self.assertEqual(transaction["quantityInBoxes"], 2)
        self.assertEqual(transaction["staffMemberName"], "nurse1")
        for field in ("transactionId", "medicationId", "patientId", "staffMemberId"):
            self.assertRegex(transaction[field], UUID_V4)
        self.assertRegex(transaction["timestamp"], TIMESTAMP)
        self.assertNotIn("Patient A", json.dumps(transaction))  # D3-D-01
        self.link.cycle()
        self.assertEqual(self.transactions_of_last_heartbeat(), [])  # acknowledged: not sent again

    def test_dispense_not_yet_confirmed_is_not_sent(self):
        self.app.dispensing.start_dispense(self.nurse, "MED-001", 1, "REQ-1")
        self.link.cycle()
        self.assertEqual(self.transactions_of_last_heartbeat(), [])
        self.app.dispensing.close_dispense_drawer(self.nurse)
        self.app.dispensing.complete_dispense(self.nurse, 1)
        self.link.cycle()
        [transaction] = self.transactions_of_last_heartbeat()
        self.assertEqual(transaction["type"], "dispensing")

    def test_withdrawal_of_zero_is_not_a_dispensing_transaction(self):
        self.app.dispensing.dispense(self.nurse, "MED-001", 1, "REQ-1", confirmed_quantity=0)
        self.link.cycle()
        self.assertEqual(self.transactions_of_last_heartbeat(), [])

    def test_unacknowledged_transaction_is_sent_again_identical(self):
        self.app.dispensing.dispense(self.nurse, "MED-001", 1, "REQ-1", confirmed_quantity=1)
        self.monitoring.next_status = [200, 500]  # registration OK, heartbeat fails
        self.link.cycle()
        self.assertIsNotNone(self.link.last_error)
        self.link.cycle()
        first, second = self.monitoring.heartbeats()
        self.assertEqual(first["transactions"], second["transactions"])
        self.assertIsNone(self.link.last_error)

    def test_registers_again_on_404_then_sends_heartbeat(self):
        self.link.cycle()
        self.monitoring.next_status = [404]
        self.link.cycle()
        paths = [path for path, _ in self.monitoring.requests]
        self.assertEqual(paths[2:], ["/api/v1/heartbeats", "/api/v1/adcs/register", "/api/v1/heartbeats"])

    def test_fault_becomes_alarm_and_state_fault(self):
        self.app.faults.raise_fault(Severity.ERROR, "DRAWER_CLOSE", "Drawer failed to close.", True)
        self.link.cycle()
        heartbeat = self.monitoring.heartbeats()[-1]
        self.assertEqual(heartbeat["state"], "fault")
        [alarm] = heartbeat["transactions"]
        self.assertEqual((alarm["type"], alarm["alarmType"], alarm["severity"]),
                         ("alarm", "dispensing_failure", "error"))  # D3-D-04

    def test_low_inventory_warning_is_not_sent(self):
        self.app.faults.raise_fault(Severity.WARNING, "LOW_INVENTORY", "Low.", False)  # D3-D-03
        self.link.cycle()
        self.assertEqual(self.transactions_of_last_heartbeat(), [])

    # ---------------------------------------------------------------- Monitoring -> ADC

    def command(self, enabled, command_id="5d6e7f80-91a2-4b3c-8d4e-5f6a7b8c9d0e", **extra):
        body = {"commandId": command_id, "adcId": self.link.identity.adc_id,
                "command": "set_maintenance_mode", "parameters": {"enabled": enabled},
                "issuedAt": "2026-11-13T00:00:00.000Z"}
        body.update(extra)
        return self.link.handle_request("/api/v1/commands", body)

    def test_maintenance_command_is_applied_and_acknowledged(self):
        status, answer = self.command(True)
        self.assertEqual(status, 200)
        self.assertEqual(answer, {"commandId": "5d6e7f80-91a2-4b3c-8d4e-5f6a7b8c9d0e",
                                  "adcId": self.link.identity.adc_id, "status": "applied"})
        self.assertEqual(self.app.faults.mode, Mode.MAINTENANCE)
        self.assertEqual(self.app.logger.events()[-1].user, "monitoring-system")

    def test_command_received_twice_is_not_applied_twice(self):
        self.command(True)
        self.command(False, command_id="6e7f8091-a2b3-4c4d-9e5f-6a7b8c9d0e1f")
        status, _ = self.command(True)  # the first commandId again
        self.assertEqual(status, 200)
        self.assertEqual(self.app.faults.mode, Mode.NORMAL)

    def test_command_refused_in_fault_and_for_another_adc(self):
        self.app.faults.raise_fault(Severity.ERROR, "DRAWER_CLOSE", "Drawer failed to close.", True)
        self.assertEqual(self.command(True)[0], 409)
        status, answer = self.command(True, adcId="c4a1e8f2-7b3d-4e9a-a5c6-2d8f0b1e3a47")
        self.assertEqual((status, answer["error"]["code"]), (409, "ADC_ID_MISMATCH"))

    def test_unknown_command_is_refused(self):
        status, answer = self.command(True, command="remote_unlock")  # D3-D-02
        self.assertEqual((status, answer["error"]["code"]), (400, "UNKNOWN_COMMAND"))

    def test_configuration_is_applied_whole_or_not_at_all(self):
        def configure(settings, configuration_id):
            return self.link.handle_request("/api/v1/configuration", {
                "configurationId": configuration_id, "adcId": self.link.identity.adc_id,
                "settings": settings, "issuedAt": "2026-11-13T00:00:00.000Z"})
        status, answer = configure({"screenLockTimeoutSeconds": 900, "timeServer": "ntp.test"},
                                   "0e1f2a3b-4c5d-4e6f-9a7b-8c9d0e1f2a3b")
        self.assertEqual((status, answer["error"]["code"]), (400, "INVALID_SETTING_VALUE"))
        self.assertFalse(hasattr(self.app, "time_server"))
        self.assertEqual(configure({"colour": "red"}, "1f2a3b4c-5d6e-4f7a-8b9c-0d1e2f3a4b5c")[0], 400)
        status, _ = configure({"screenLockTimeoutSeconds": 120, "timeServer": "ntp.test"},
                              "2a3b4c5d-6e7f-4a8b-9c0d-1e2f3a4b5c6d")
        self.assertEqual(status, 200)
        self.assertEqual((self.app.inactivity_grace, self.app.time_server), (120, "ntp.test"))

    def test_command_server_answers_over_http(self):
        self.link.start()
        try:
            port = self.link._server.server_address[1]
            body = {"commandId": "5d6e7f80-91a2-4b3c-8d4e-5f6a7b8c9d0e", "adcId": self.link.identity.adc_id,
                    "command": "set_maintenance_mode", "parameters": {"enabled": True},
                    "issuedAt": "2026-11-13T00:00:00.000Z"}
            req = urlrequest.Request("http://127.0.0.1:{}/api/v1/commands".format(port),
                                     data=json.dumps(body).encode(), method="POST",
                                     headers={"Content-Type": "application/json"})
            with urlrequest.urlopen(req, timeout=5) as response:
                self.assertEqual(json.loads(response.read())["status"], "applied")
            self.assertEqual(self.app.faults.mode, Mode.MAINTENANCE)
        finally:
            self.link.stop()


if __name__ == "__main__":
    unittest.main()
