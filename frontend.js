const express = require("express");
const path = require("path");
const NodeCache = require("node-cache");
const { MongoClient } = require("mongodb");
const dotenv = require("dotenv");

dotenv.config();

const app = express();
const cache = new NodeCache({ stdTTL: 600 });

const mongoUri = process.env.MONGO_URL;
const mongoDbName = process.env.MONGO_DB;
const mongoCollection = process.env.MONGO_COLLECTION || "data";

let db;

async function connectMongo() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(mongoDbName);
  console.log("Connected to MongoDB");
}

app.use(express.static(path.join(__dirname, "src")));

app.get("/get-data-files", async (req, res) => {
  console.log("Request received for /get-data-files");

  const cachedFiles = cache.get("allDataFiles");
  if (cachedFiles) {
    console.log("Cache hit for all data files");
    return res.json(cachedFiles);
  }
  console.log("Cache miss for all data files");

  try {
    const files = await db.collection(mongoCollection).find({}, { projection: { _id: 1 } }).toArray();
    const fileNames = files.map((doc) => doc._id);
    cache.set("allDataFiles", fileNames);
    console.log("Data files cached");
    res.json(fileNames);
  } catch (error) {
    console.error("Error fetching documents from MongoDB:", error.message);
    res.status(500).send("Error fetching data from MongoDB");
  }
});

app.get("/get-data-file", async (req, res) => {
  const { filename } = req.query;
  console.log("Request received for /get-data-file", filename);

  if (!filename) {
    console.error("Filename parameter is missing in request");
    return res.status(400).send("Filename parameter is required");
  }

  const cachedFile = cache.get(filename);
  if (cachedFile) {
    console.log(`Cache hit for file: ${filename}`);
    return res.json(cachedFile);
  }
  console.log(`Cache miss for file: ${filename}`);

  try {
    const doc = await db.collection(mongoCollection).findOne({ _id: filename });
    if (!doc) {
      console.warn(`File not found in MongoDB: ${filename}`);
      return res.status(404).send("File not found in MongoDB");
    }

    delete doc._id;
    cache.set(filename, doc);
    console.log(`Data file cached for filename: ${filename}`);
    res.json(doc);
  } catch (error) {
    console.error("Error fetching document from MongoDB:", error.message);
    res.status(500).send("Error fetching data from MongoDB");
  }
});

connectMongo().then(() => {
  app.listen(3000, () => {
    console.log("Server running on port 3000");
  });
});