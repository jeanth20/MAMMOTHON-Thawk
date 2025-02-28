# MAMMOTHON-Thawk  
**Anon Web3 Chat using Cosmos address for sign-up**  

## Setup Instructions  

Follow these steps to set up the project, including a virtual environment and the PocketBase database.  

---

## 1. Create and Activate a Virtual Environment  

This section guides you through setting up a Python virtual environment and installing dependencies from `requirements.txt`.  

### Create Virtual Environment  

#### Windows  
```sh
python -m venv venv
venv\Scripts\activate
```
#### Linux / Mac
```sh
python3 -m venv venv
source venv/bin/activate
```
#### Install Dependencies
```sh
pip install -r requirements.txt
Deactivate the Virtual Environment
```

```sh
deactivate
```


## 2. Set Up PocketBase
Follow these steps to set up PocketBase and initialize the database.

Download PocketBase (If Not Installed)

If you haven't already, download the latest PocketBase binary from the official site:
https://pocketbase.io/docs/

Alternatively, install it using:

```sh
curl -fsSL https://pocketbase.io/install.sh | bash
```

Run and Set Up the Admin User
```sh
./pocketbase serve
```

## 3. Run the Project
Activate your Virtual Environment

Ensure your virtual environment is activated before starting the project.

Start or Stop the Project

Start
```sh
./start.sh
```

Stop
```sh
./stop.sh
```

Your project is now set up and ready to run! 🚀


Project urls:

Frontend
```sh
http://127.0.0.1:8090
```

Database frontend
```sh
http://127.0.0.1:8090/_/
```
API
```sh
http://127.0.0.1:8090/api/
```
websocket
```sh
http://127.0.0.1:8000/ws/
```