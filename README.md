# Cloud Implementation of [Smart City Tracker](https://caimeng2.github.io/SmartCityTracker/)

This project serves as an ITC630 project to disaggregate an existing project into microservices that are cloud ready. Smart City Tracker currently exists as a web service that aggregates data from JSON files into a usable display 

# From Source 
Download a Google Cloud service account key file and name it "auth.json". This account should have project access as a Database User. 

Install packages utilizing:

> npm install

# ENVs 

## Frontend
firebaseCredentialPath: Path to the firebase credential auth file. Default is /auth.json

## Backend
firebaseCredentialPath: Path to the firebase credential auth file. Default is /auth.json
INTERVAL: Time to sync Zenodo to firebase in milliseconds. Default is 86400000 (24 hours)
zenodoRecordId: Record to sync with firebase: Default is 7670784 (SmartCityTracker)

# Implementation 
The bulk of this project is breaking the existing service into a frontend and backend. 

## Frontend
Converting to a Dockerfile that reads data from a remote database 

## Backend
Upload data to a cloud database

# Original
Cai, Meng. (2023). Smart City Tracker: A living archive of smart city prevalence (v1.0) [Data set]. Zenodo. https://doi.org/10.5281/zenodo.7670784