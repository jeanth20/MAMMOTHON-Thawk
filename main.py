from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict, List
import pocketbase
import logging
import time

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
                    handlers=[
                        logging.FileHandler("app.log"),
                        logging.StreamHandler()
                    ])
logger = logging.getLogger(__name__)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

PB_URL = "https://thawk.xyz/pocketbase"
pb = pocketbase.Client(PB_URL)

RATE_LIMIT = 10  # Number of messages
TIME_WINDOW = 60  # Time window in seconds

class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, List[WebSocket]] = {}
        self.message_timestamps: Dict[str, List[float]] = {}

    async def connect(self, room_id: str, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if room_id not in self.active_connections:
            self.active_connections[room_id] = []
        self.active_connections[room_id].append(websocket)
        logger.info(f"WebSocket connected: {room_id}")
        await self.send_personal_message(f"You are connected to chat room", websocket)
        await self.broadcast(room_id, f"User joined the chat")

    def disconnect(self, room_id: str, websocket: WebSocket):
        self.active_connections[room_id].remove(websocket)
        if not self.active_connections[room_id]:
            del self.active_connections[room_id]
        logger.info(f"WebSocket disconnected: {room_id}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)
        logger.info(f"Sent personal message: {message}")

    async def broadcast(self, room_id: str, message: str):
        if room_id in self.active_connections:
            for connection in self.active_connections[room_id]:
                await connection.send_text(message)
        logger.info(f"Broadcast message to room {room_id}: {message}")

    def get_active_users(self, room_id: str) -> int:
        """Returns the number of active users in a chat room"""
        return len(self.active_connections.get(room_id, []))

    def is_rate_limited(self, user_id: str) -> bool:
        now = time.time()
        if user_id not in self.message_timestamps:
            self.message_timestamps[user_id] = []
        self.message_timestamps[user_id] = [timestamp for timestamp in self.message_timestamps[user_id] if now - timestamp < TIME_WINDOW]
        if len(self.message_timestamps[user_id]) >= RATE_LIMIT:
            return True
        self.message_timestamps[user_id].append(now)
        return False

manager = ConnectionManager()

@app.websocket("/ws/{user_id}/{room_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, room_id: str):
    await manager.connect(room_id, websocket, user_id)
    try:
        while True:
            data = await websocket.receive_text()
            if manager.is_rate_limited(user_id):
                await manager.send_personal_message("Rate limit exceeded. Please wait before sending more messages.", websocket)
            else:
                await manager.broadcast(room_id, data)
    except WebSocketDisconnect:
        manager.disconnect(room_id, websocket)
        await manager.broadcast(room_id, f"User left the chat")
    except Exception as e:
        logger.error(f"Error in WebSocket connection: {e}")
        await manager.send_personal_message(f"Error: {e}", websocket)
        await websocket.close()

@app.get("/ws/active_users/{room_id}")
async def get_active_users(room_id: str):
    count = manager.get_active_users(room_id)
    return {"room_id": room_id, "active_users": count}
 