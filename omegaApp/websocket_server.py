import asyncio
from omegaApp.logger_manager import LoggerManager
import time
import websockets
import json
from typing import Set, Dict, Any


class WebSocketServer:
    def __init__(self):
        self.logger = LoggerManager().get_logger()

        self.clients: Dict[str, Set[websockets.WebSocketServerProtocol]] = {}
        self.active_instances: Set[str] = set()
        self.lock = asyncio.Lock()
        self.shutdown_event = asyncio.Event()

    async def register(
        self, websocket: websockets.WebSocketServerProtocol, instance_id: str
    ) -> None:
        async with self.lock:
            if instance_id not in self.clients:
                self.clients[instance_id] = set()
            self.clients[instance_id].add(websocket)
            self.active_instances.add(instance_id)
            self.logger.info(f"Is registered: {self.clients}")

    async def unregister(
        self, websocket: websockets.WebSocketServerProtocol, instance_id: str
    ) -> None:
        async with self.lock:
            if instance_id in self.clients:
                self.clients[instance_id].discard(websocket)
                if not self.clients[instance_id]:
                    del self.clients[instance_id]
            self.logger.info(f"Is unRegistered: {self.clients}")

    async def send_to_clients(self, instance_id: str, message: Dict[str, Any]) -> None:
        async with self.lock:
            if instance_id in self.clients:
                websockets_to_remove = set()
                for websocket in self.clients[instance_id]:
                    try:
                        await websocket.send(json.dumps(message))
                        self.automation_manager.last_progress[instance_id] = time.time()
                    except websockets.exceptions.ConnectionClosed as e:
                        self.logger.error(
                            f"websockets.exceptions.ConnectionClosed (send_to_clients): {e}"
                        )
                        websockets_to_remove.add(websocket)
                    except Exception as e:
                        self.logger.error(f"Error sending message to client: {str(e)}")
                        websockets_to_remove.add(websocket)

                for websocket in websockets_to_remove:
                    await self.unregister(websocket, instance_id)
            else:
                self.logger.error(
                    f"The {instance_id} not in self.clients (not running)"
                )

    async def handle_message(
        self, websocket: websockets.WebSocketServerProtocol, message: str
    ) -> None:
        data = json.loads(message)
        command = data.get("command")
        automation_type = data.get("automation_type")
        instance_id = data.get("instance_id")

        if command == "start":
            await self.automation_manager.start_task_automation(
                automation_type, instance_id
            )
            await self.send_to_clients(
                instance_id,
                {
                    "type": "automation_started",
                    "automation_type": automation_type,
                    "instance_id": instance_id,
                },
            )
        elif command == "status":
            status = self.automation_manager.get_automation_status(instance_id)
            await websocket.send(
                json.dumps(
                    {
                        "type": "status_update",
                        "instance_id": instance_id,
                        "data": status,
                    }
                )
            )
        elif command == "stop":
            await self.automation_manager.stop_automation(instance_id)
            await self.send_to_clients(
                instance_id, {"type": "automation_stopped", "instance_id": instance_id}
            )
        elif command == "list":
            running_automaions = (
                await self.automation_manager.list_running_automations()
            )
            await websocket.send(
                json.dumps({"type": "running_automations", "data": running_automaions})
            )

    async def ws_handler(
        self, websocket: websockets.WebSocketServerProtocol, path: str
    ) -> None:
        instance_id = path.split("/")[-1]
        await self.register(websocket, instance_id)
        try:
            async for message in websocket:
                await self.handle_message(websocket, message)
        except websockets.exceptions.ConnectionClosed as e:
            self.logger.error(
                f"websockets.exceptions.ConnectionClosed (ws_handler): {e}"
            )
        except Exception as e:
            self.logger.error(f"An error (ws_handler): {e}")
        finally:
            await self.unregister(websocket, instance_id)

    async def start_websocket_server(self, host: str, port: int):
        async with websockets.serve(self.ws_handler, host, port, ping_interval=None):
            await asyncio.Future()

    def start_server(self, host: str, port: int) -> None:
        self.logger.info(f"Start websocket: {host}:{port}")
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        loop.run_until_complete(self.start_websocket_server(host, port))
