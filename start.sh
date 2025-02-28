#!/bin/bash

# Start PocketBase
echo "Starting PocketBase..."
nohup ./pocketbase serve --http=127.0.0.1:8090 &

# Start FastAPI on port 8091
echo "Starting FastAPI..."
#nohup uvicorn main:app --host 127.0.0.1 --port 8091 &
nohup uvicorn main:app --host 127.0.0.1 --port 8091 > fastapi.log 2>&1 &

echo "PocketBase and FastAPI are now running."

# Make the script executable
# chmod +x start.sh

# Run the script
# ./start.sh
