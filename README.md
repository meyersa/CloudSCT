# Cloud Implementation of [Smart City Tracker](https://caimeng2.github.io/SmartCityTracker/)

This project serves as an ITC630 project to disaggregate the original [Smart City Tracker](https://github.com/caimeng2/SmartCityTracker) into microservices that are cloud-ready. The **Smart City Tracker** previously existed as a web service that aggregated data from JSON files into a usable display. This project has been restructured into a more scalable system, with data pulled dynamically from Firestore instead of loading statically.

## Key Features:
- **Frontend**: Displays information about smart city implementations in the United States. It runs static content and fetches dynamic data from Firestore.
- **Backend**: Syncs data from Zenodo (where the dataset is hosted) to Firestore, ensuring the system stays updated autonomously with only Zenodo needing to be updated for new data.
- **Cloud Ready**: This project can be deployed both locally and in Docker containers.

---

## Getting Started

### Prerequisites

1. **Google Cloud Project**:
   - Create a Google Cloud project and enable Firestore.
   - Create a Google Cloud service account with **Database User** role and download the service account key as `auth.json`.
   - Place the `auth.json` file in the root directory of the project.

2. **Node.js**: Ensure Node.js is installed. You can check your Node version with:

   ```
   node -v
   ```

3. **Docker**: If running in Docker, ensure Docker is installed on your machine.

---

## Running Locally

### Frontend

1. Install dependencies:

   ```
   npm ci
   ```

2. Start the frontend:

   ```
   node frontend.js
   ```

   The frontend will display smart city data fetched from Firestore.

### Backend

1. Start the backend:

   ```
   node backend.js
   ```

   The backend will sync data from Zenodo to Firestore periodically.

---

## Running with Docker

### Frontend

To run the frontend in a Docker container:

1. Pull the Docker image:

   ```
   docker pull ghcr.io/meyersa/cloudsct-frontend
   ```

2. Run the frontend container, mapping port 3000 for the UI and providing the `auth.json` file:

   ```
   docker run -p 3000:3000 -v ./auth.json:/auth.json ghcr.io/meyersa/cloudsct-frontend
   ```

### Backend

To run the backend in a Docker container:

1. Pull the Docker image:

   ```
   docker pull ghcr.io/meyersa/cloudsct-backend
   ```

2. Run the backend container, providing the `auth.json` file:

   ```
   docker run -v ./auth.json:/auth.json ghcr.io/meyersa/cloudsct-backend
   ```

---

## Configuration (ENVs)

You can configure the application using environment variables. The following variables are optional but available for customization:

### Frontend

- **firebaseCredentialPath**: Path to the Firebase credential auth file. Default is `/auth.json`.

### Backend

- **firebaseCredentialPath**: Path to the Firebase credential auth file. Default is `/auth.json`.
- **INTERVAL**: Time (in milliseconds) to sync Zenodo to Firebase. Default is `86400000` (24 hours).
- **zenodoRecordId**: Record ID to sync with Firebase. Default is `7670784` (SmartCityTracker).

---

## Disaggregation Overview

This project represents a **disaggregation** of the original **Smart City Tracker**. Instead of loading all the data statically, the frontend now dynamically pulls data from **Firestore**. The **frontend** only serves static content and APIs, while the **backend** is responsible for syncing data from **Zenodo** to **Firestore**. This design allows the system to run autonomously with Zenodo updates driving new data syncs, resulting in better performance and scalability.

---

## Original

Cai, Meng. (2023). Smart City Tracker: A living archive of smart city prevalence (v1.0) [Data set]. Zenodo. https://doi.org/10.5281/zenodo.7670784

---

For more information, please refer to the original [Smart City Tracker GitHub repository](https://github.com/caimeng2/SmartCityTracker).
