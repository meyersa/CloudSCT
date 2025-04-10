const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const unzipper = require("unzipper");
const dotenv = require("dotenv");
const { MongoClient } = require("mongodb");

dotenv.config();

// Load ENVs
const zenodoRecordId = process.env.ZENODO_RECORD_ID || "7670784";
const INTERVAL = parseInt(process.env.INTERVAL, 10) || 86400000;
const mongoUri = process.env.MONGO_URL;
const mongoDbName = process.env.MONGO_DB;
const mongoCollection = process.env.MONGO_COLLECTION || "data";

// Statics
const downloadUrl = `https://zenodo.org/api/records/${zenodoRecordId}`;
const tmpDir = path.join(os.tmpdir(), zenodoRecordId);
const extractDir = path.join(tmpDir, "extracted");

let db;

// Mongo connection
async function connectMongo() {
  const client = new MongoClient(mongoUri);
  await client.connect();
  db = client.db(mongoDbName);
}

// Download
async function downloadZenodoFiles() {  
  try {
    fs.mkdirSync(tmpDir, { recursive: true });

    const response = await axios.get(downloadUrl);
    const zipFile = response.data.files?.find((file) => file.key.endsWith(".zip"));
    if (!zipFile) {
      console.log("No zip file found in this record.");
      return null;
    }

    const zipPath = path.join(tmpDir, path.basename(zipFile.links.self));
    console.log(`Downloading ${zipPath}...`);

    const fileResponse = await axios({
      url: zipFile.links.self,
      method: "GET",
      responseType: "stream",
    });

    await new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(zipPath);
      fileResponse.data.pipe(writer).on("finish", resolve).on("error", reject);
    });

    console.log(`Downloaded ${zipPath}`);
    return zipPath;
  } catch (error) {
    console.error("Error downloading Zenodo files:", error.message);
    return null;
  }
}

// Extract
async function extractZenodoFiles(zipPath) {
  try {
    fs.mkdirSync(extractDir, { recursive: true });

    console.log("Extracting files...");
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on("entry", (entry) => {
          if (entry.path.includes("/data/") && entry.type === "File") {
            const extractPath = path.join(extractDir, path.basename(entry.path));
            entry.pipe(fs.createWriteStream(extractPath));
            console.log(`Extracted ${entry.path}`);
          } else {
            entry.autodrain();
          }
        })
        .on("close", resolve)
        .on("error", reject);
    });
    console.log("Finished extracting /data");
  } catch (error) {
    console.error("Error extracting Zenodo files:", error.message);
  }
}

// Upload
async function uploadZenodoFiles() {
  console.log("Uploading...")

  try {
    const files = fs.readdirSync(extractDir);

    for (const file of files) {
      if (path.extname(file) === ".js") {
        const filePath = path.join(extractDir, file);
        const fileContents = fs.readFileSync(filePath, "utf-8");
        const jsonData = JSON.parse(fileContents);
        const documentKey = path.basename(file, ".js");

        await db.collection(mongoCollection).updateOne(
          { _id: documentKey },
          { $set: jsonData },
          { upsert: true }
        );

        console.log(`Uploaded ${documentKey} to MongoDB`);
      }
    }
  } catch (error) {
    console.error("Error uploading data:", error.message);
  }

  console.log("Finished uploading")
}

async function sync() {
  console.log("Starting Sync...")

  if (!db) await connectMongo();
  const zipPath = await downloadZenodoFiles();
  if (zipPath) {
    await extractZenodoFiles(zipPath);
    await uploadZenodoFiles();
  }

  console.log(`Finished Sync. Sleeping for ${INTERVAL / 1000} seconds.`)
}

console.log("Running Zenodo sync task...");
sync();

console.log(`Starting Zenodo sync on an interval of ${INTERVAL / 1000} seconds.`);
setInterval(sync, INTERVAL);