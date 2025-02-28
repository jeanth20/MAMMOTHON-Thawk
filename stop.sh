#!/bin/bash

echo "Stopping PocketBase and FastAPI..."

# Find and kill PocketBase process
PB_PID=$(pgrep -f "pocketbase serve")
if [ -n "$PB_PID" ]; then
    echo "Stopping PocketBase (PID: $PB_PID)..."
    kill -9 $PB_PID
else
    echo "PocketBase is not running."
fi

# Find and kill FastAPI (Uvicorn) process
FASTAPI_PID=$(pgrep -f "uvicorn main:app")
if [ -n "$FASTAPI_PID" ]; then
    echo "Stopping FastAPI (PID: $FASTAPI_PID)..."
    kill -9 $FASTAPI_PID
else
    echo "FastAPI is not running."
fi

echo "Stopped PocketBase and FastAPI."

