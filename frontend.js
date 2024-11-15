const express = require("express");
const path = require("path");
const app = express();
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const NodeCache = require("node-cache");

const serviceAccount = require("./auth.json");
const cache = new NodeCache({ stdTTL: 3600 });

initializeApp({
  credential: cert(serviceAccount),
});
const db = getFirestore();

app.use(express.static(path.join(__dirname, "src")));

app.get("/get-data-files", async (req, res) => {
  console.log("Returning data files");

  // Check cache first
  const cachedFiles = cache.get("allDataFiles");
  if (cachedFiles) {
    return res.json(cachedFiles);
  }

  try {
    const snapshot = await db.collection("data").get();
    if (snapshot.empty) {
      return res.status(404).json({ message: "No data found in Firestore" });
    }

    const files = snapshot.docs.map((doc) => doc.id);

    // Store in cache
    cache.set("allDataFiles", files);

    res.json(files);
  } catch (error) {
    console.error("Error fetching documents:", error);
    res.status(500).send("Error fetching data from Firestore");
  }
});

app.get("/get-data-file", async (req, res) => {
  console.log("Returning data file");

  const { filename } = req.query;

  // Check cache for the specific file
  const cachedFile = cache.get(filename);
  if (cachedFile) {
    return res.json(cachedFile);
  }

  try {
    const docRef = db.collection("data").doc(filename);
    const doc = await docRef.get();

    if (!doc.exists) {
      return res.status(404).send("File not found in Firestore");
    }

    res.json(doc.data());

    // Store in cache
    cache.set(filename, data);
  } catch (error) {
    console.error("Error fetching document:", error);
    res.status(500).send("Error fetching data from Firestore");
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
