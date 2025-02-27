from omegaApp.logger_manager import LoggerManager
from omegaApp.modules.update_firmware_server import UCSFirmwareUpgrader
from .automation_base import AutomationBase, AutomationStatus
from omegaApp.db import get_db
import asyncio
from flask import current_app
import time


class ServerUpgrade(AutomationBase):
    def __init__(self, instance_id: str):
        super().__init__(instance_id)
        self.logger = LoggerManager().get_logger()

    async def run_upgrade(self, instance_id):
        try:
            # Get a fresh database connection each time
            db = get_db()
            automations = db.execute(
                "SELECT * FROM automations WHERE instance_id = ?", (instance_id,)
            ).fetchall()
            db.commit()

            for server_upgrade in automations:
                if server_upgrade["status"] not in ("running", "pending"):
                    pass

                else:
                    username = current_app.config["USER_NAME_CENTRAL"]
                    ucsc_ip = current_app.config["IP_CENTRAL"]
                    password = current_app.config["PASSWORD_CENTRAL"]

                    try:
                        upgrader = UCSFirmwareUpgrader(ucsc_ip, username, password)
                        async for status in upgrader.upgrade_firmware(server_upgrade):

                            server_progress = status.get("progress", 0)
                            server_status = "running"
                            server_message = status.get("message", "Upgrade is in progress")

                            # Get a fresh database connection for each update
                            db = get_db()
                            # Update progress in database
                            db.execute(
                                "UPDATE automations SET progress = ?, status = ?, message = ? WHERE instance_id = ?",
                                (
                                    server_progress,
                                    server_status,
                                    server_message,
                                    instance_id,
                                ),
                            )
                            db.commit()

                            # await asyncio.sleep(0.1)

                        # Get a fresh database connection for final update
                        db = get_db()
                        server_status = "completed"

                        db.execute(
                            "UPDATE automations SET status = ? WHERE instance_id = ?",
                            (server_status, instance_id),
                        )
                        db.commit()
                    except Exception as e:
                        # Handle connection errors gracefully
                        self.logger.error(f"Error during firmware upgrade: {str(e)}")
                        
                        # Get a fresh database connection for error update
                        db = get_db()
                        db.execute(
                            "UPDATE automations SET status = ?, message = ?, error = ? WHERE instance_id = ?",
                            ("failed", f"שגיאה בתהליך השדרוג: {str(e)}", str(e), instance_id),
                        )
                        db.commit()
                        
                        # Don't re-raise the exception, just log it and continue
                        return False

        except Exception as e:
            # Update status and error in database
            self.logger.error(f"Failed to run_upgrade - {e}")

            # Get a fresh database connection for error update
            db = get_db()
            db.execute(
                "UPDATE automations SET status = ?, message = ?, error = ? WHERE instance_id = ?",
                ("failed", f"שגיאה בתהליך השדרוג", str(e), instance_id),
            )
            db.commit()
            
            # Return False to indicate failure instead of raising an exception
            return False
            
        # Return True to indicate success
        return True


    async def run(self, instance_id):
        try:
            self.status = AutomationStatus.RUNNING
            
            # Update database to show running status
            db = get_db()
            db.execute(
                "UPDATE automations SET status = ?, message = ? WHERE instance_id = ?",
                ("running", "תהליך השדרוג החל", instance_id),
            )
            db.commit()
            
            # Run the upgrade process
            success = await self.run_upgrade(instance_id)
            
            if success:
                self.complete()
                self.logger.info(f"Automation completed successfully: {instance_id}")
            else:
                self.fail("Failed to complete automation")
                self.logger.info(f"Automation failed but handled gracefully: {instance_id}")

        except asyncio.CancelledError:
            self.status = AutomationStatus.STOPPED
            self.end_time = time.time()
            raise
        except Exception as e:
            self.logger.error(f"Unexpected error in server_upgrade.run(): {e}")
            self.fail(str(e))
            
            # Update database to show failed status
            db = get_db()
            db.execute(
                "UPDATE automations SET status = ?, message = ?, error = ? WHERE instance_id = ?",
                ("failed", "אירעה שגיאה בלתי צפויה", str(e), instance_id),
            )
            db.commit()

    async def send_update(self, instance_id, message):
        try:
            await self.websocket_server.send_to_clients(
                instance_id,
                {"type": "update", "instance_id": instance_id, "message": message},
            )
            self.logger.debug(f"Update sent successfully: {message}")
        except Exception as e:
            self.logger.error(f"Failde to send update: {e}")
