class HardwareInterface:
    """Hardware abstraction. The demo implementation simulates a lock and drawer sensor."""
    def __init__(self):
        self.fail_unlock = False
        self.fail_close = False
        self.open_location = None

    def unlock(self, location):
        if self.fail_unlock: return False
        self.open_location = location
        return True

    def close_drawer(self):
        if self.fail_close: return False
        self.open_location = None
        return True

    def is_open(self): return self.open_location is not None
