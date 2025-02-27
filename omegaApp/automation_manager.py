import asyncio
import time
from datetime import datetime
from omegaApp.logger_manager import LoggerManager
from omegaApp.db import get_db
from typing import Dict, Type, Any

from .automation_base import AutomationBase, AutomationStatus
import uuid


class AutomationManager:
    def __init__(self):
        self.logger = LoggerManager().get_logger()
        self.automation_types: Dict[str, Type[AutomationBase]] = {}
        self.running_automations: Dict[str, asyncio.Task] = {}
        self.check_interval = 60
        self.timeout: int = 300

    async def initialize(self, app_cuntext):
        await self.resume_interrupted_upgrades(app_cuntext)

    def register_automation(self, automation_type: str, automation_class: Type[AutomationBase]) -> None:
        if automation_type in self.automation_types:
            raise ValueError(
                f"Automation with id {automation_type} already exists")
        self.automation_types[automation_type] = automation_class
        self.logger.info(f"Registerd automation type: {automation_type}")

    def prepare_automation(self, automation_type: str, params: Dict[str, Any] = None):
        if automation_type not in self.automation_types:
            self.logger.error(f"Automation with id {automation_type} does not exist")
            raise ValueError(
                f"Automation with id {automation_type} does not exist")

        instance_id = str(uuid.uuid4())

        server_name = params.get('server_name')
        serial_number = params.get('serial_number')
        data = params.get('data')
        intermediate_version = params.get('intermediate_version')

        if not serial_number and not data:
            raise ValueError(
                "serial number and data are required")

        force_direct_upgrade = params.get('force_direct_upgrade', False)
        self.logger.info(f"force_direct_upgrade value received: {force_direct_upgrade}, type: {type(force_direct_upgrade)}")
        automation = {
            'instance_id': instance_id,
            'user_id': 'admin',
            'server_name': server_name,
            'serial_number': serial_number,
            "tamplate": "",
            'data': data,
            'status': 'pending',
            'progress': 0,
            "message": "starting",
            "automation_type": automation_type,
            "isTracked": True,
            'created_at': datetime.now().isoformat(),
            'force_direct_upgrade': force_direct_upgrade,
            'intermediate_version': intermediate_version
        }

        try:
            db = get_db()
            db.execute('''
                    INSERT INTO automations (instance_id, user_id, server_name, serial_number, tamplate, data, status, progress, message, automation_type, isTracked, created_at, force_direct_upgrade, intermediate_version)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                ''', (automation["instance_id"], automation['user_id'], automation["server_name"], automation["serial_number"], automation["tamplate"], automation["data"], automation['status'], automation['progress'], automation["message"], automation["automation_type"], automation['isTracked'], automation['created_at'], automation['force_direct_upgrade'], automation['intermediate_version']))
            db.commit()

        except Exception as e:
            self.logger.error(f"db err: {e}")

        return automation

    async def start_task_automation(self, automation_type: str, instance_id: str):
        automation_class = self.automation_types[automation_type]
        automation = automation_class(instance_id)
        self.logger.info(
            f"Created automation instance: {instance_id} of type {automation_type}")

        async def run_and_cleanup():
            try:
                await automation.run(instance_id)
            except asyncio.CancelledError:
                self.logger.info(f"Automation cancelled: {instance_id}")
                automation.status = AutomationStatus.STOPPED
                automation.end_time = time.time()
                db = get_db()
                db.execute(
                    "UPDATE automations SET status = ?, message = ? WHERE instance_id = ?",
                    ("stopped", "האוטומציה נעצרה על ידי המשתמש", instance_id),
                )
                db.commit()
                raise
            except Exception as e:
                # Log the error but don't re-raise it
                self.logger.error(f"Automation error: {e}")
                
                # Make sure the automation status is updated in the database
                try:
                    db = get_db()
                    db.execute(
                        "UPDATE automations SET status = ?, message = ?, error = ? WHERE instance_id = ?",
                        ("failed", "אירעה שגיאה בביצוע האוטומציה", str(e), instance_id),
                    )
                    db.commit()
                except Exception as db_error:
                    self.logger.error(f"Failed to update automation status in database: {db_error}")
            finally:
                self.logger.info(f"Automation finally: {instance_id}")
                if instance_id in self.running_automations:
                    del self.running_automations[instance_id]
        try:
            task = asyncio.create_task(run_and_cleanup())
            self.running_automations[instance_id] = task
        except Exception as e:
            self.logger.error(f"start_task_automation: {e}")
            raise Exception(f"start_task_automation: {e}")

    def stop_automation(self, instance_id: str):
        """Stop a running automation task."""
        if instance_id in self.running_automations:
            task = self.running_automations[instance_id]
            task.cancel()
            self.logger.info(f"Cancelled automation task: {instance_id}")
        else:
            self.logger.warning(f"No running automation found with id: {instance_id}")

    async def resume_interrupted_upgrades(self, app_cuntext):
        try:
            app_cuntext.push()

            db = get_db()
            cursor = db.execute(
                "SELECT instance_id, automation_type, data FROM automations WHERE status IN ('running', 'pending')")
            db.commit()
            for row in cursor.fetchall():
                instance_id = row['instance_id']
                automation_type = row['automation_type']
                if instance_id not in self.running_automations:
                    self.logger.info(f"{instance_id} => need start_task_automation()")
                    await self.start_task_automation(automation_type, instance_id)
        except Exception as e:
            self.logger.error(f"db + start_automations: {e}")
