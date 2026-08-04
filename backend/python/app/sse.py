"""
sse.py — Server-Sent Events (SSE) Stream Manager
"""
import asyncio
import json
from typing import Set, Dict, Any

_clients: Set[asyncio.Queue] = set()

async def register_sse_client() -> asyncio.Queue:
    queue = asyncio.Queue()
    _clients.add(queue)
    return queue

def unregister_sse_client(queue: asyncio.Queue):
    _clients.discard(queue)

async def broadcast_sse_event(event_type: str, data: Dict[str, Any]):
    """
    Broadcasts real-time events to all connected SSE browser clients.
    """
    if not _clients:
        return
        
    payload = f"event: {event_type}\ndata: {json.dumps(data)}\n\n"
    for q in list(_clients):
        try:
            await q.put(payload)
        except Exception:
            _clients.discard(q)
