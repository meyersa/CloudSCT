const express = require("express");
const path = require("path");
const NodeCache = require("node-cache");
const app = express();
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const dotenv = require("dotenv");

// Load environment variables
dotenv.config();

const firebaseCredentialPath = process.env.FIREBASE_CREDENTIAL_PATH || "/auth.json";

// Initialize Firebase Admin
const serviceAccount = require(firebaseCredentialPath);
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

// Initialize node-cache with a TTL of 10 minutes
const cache = new NodeCache({ stdTTL: 600 });

// Logging utility function
const log = (type, message, data = null) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${type}] ${message}`, data ? `- Data: ${JSON.stringify(data)}` : "");
};

app.use(express.static(path.join(__dirname, "src")));

// Endpoint to get all data files
app.get("/get-data-files", async (req, res) => {
  log("INFO", "Request received for /get-data-files");

  // Check cache first
  const cachedFiles = cache.get("allDataFiles");
  if (cachedFiles) {
    log("CACHE", "Cache hit for all data files");
    return res.json(cachedFiles);
  }
  log("CACHE", "Cache miss for all data files");

  try {
    const snapshot = await db.collection("data").get();
    if (snapshot.empty) {
      log("WARNING", "No data found in Firestore for all data files");
      return res.status(404).json({ message: "No data found in Firestore" });
    }

    const files = snapshot.docs.map((doc) => doc.id);
    cache.set("allDataFiles", files); // Cache the response
    log("CACHE", "Data files cached");
    res.json(files);
  } catch (error) {
    log("ERROR", "Error fetching documents from Firestore", { error: error.message });
    res.status(500).send("Error fetching data from Firestore");
  }
});

// Endpoint to get a single data file by filename
app.get("/get-data-file", async (req, res) => {
  const { filename } = req.query;
  log("INFO", "Request received for /get-data-file", { filename });

  if (!filename) {
    log("ERROR", "Filename parameter is missing in request");
    return res.status(400).send("Filename parameter is required");
  }

  // Check cache for the specific file
  const cachedFile = cache.get(filename);
  if (cachedFile) {
    log("CACHE", `Cache hit for file: ${filename}`);
    return res.json(cachedFile);
  }
  log("CACHE", `Cache miss for file: ${filename}`);

  try {
    const docRef = db.collection("data").doc(filename);
    const doc = await docRef.get();

    if (!doc.exists) {
      log("WARNING", `File not found in Firestore: ${filename}`);
      return res.status(404).send("File not found in Firestore");
    }

    const data = doc.data();
    cache.set(filename, data); // Cache the response
    log("CACHE", `Data file cached for filename: ${filename}`);
    res.json(data);
  } catch (error) {
    log("ERROR", "Error fetching document from Firestore", { filename, error: error.message });
    res.status(500).send("Error fetching data from Firestore");
  }
});

app.listen(3000, () => {
  log("INFO", "Server running on port 3000");
});
