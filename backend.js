const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const unzipper = require("unzipper");
const dotenv = require("dotenv");
const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

// Load environment variables
dotenv.config();

// Environment variables with defaults
const zenodoRecordId = process.env.ZENODO_RECORD_ID || "7670784";
const INTERVAL = parseInt(process.env.INTERVAL, 10) || 86400000; // Default to 24 hours
const firebaseCredentialPath = process.env.FIREBASE_CREDENTIAL_PATH || "/auth.json";

// Initialize Firebase Admin
const serviceAccount = require(firebaseCredentialPath);
initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const downloadUrl = `https://zenodo.org/api/records/${zenodoRecordId}`;
const tmpDir = path.join(os.tmpdir(), zenodoRecordId);
const extractDir = path.join(tmpDir, "extracted");

// Download the Zenodo files
async function downloadZenodoFiles() {
  try {
    // Create temporary directory if not exist
    fs.mkdirSync(tmpDir, { recursive: true });

    // Get files from Zenodo
    const response = await axios.get(downloadUrl);
    const zipFile = response.data.files?.find((file) => file.key.endsWith(".zip"));
    if (!zipFile) {
      console.log("No zip file found in this record.");
      return null;
    }

    // Download to tmp dir
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

// Extract the files from the /data directory
async function extractZenodoFiles(zipPath) {
  try {
    // Create extraction directory if not exist
    fs.mkdirSync(extractDir, { recursive: true });

    console.log("Extracting files...");
    await new Promise((resolve, reject) => {
      fs.createReadStream(zipPath)
        .pipe(unzipper.Parse())
        .on("entry", (entry) => {
          if (entry.path.includes("/data/") && entry.type === "File") {
            // Copy to extraction dir
            const extractPath = path.join(extractDir, path.basename(entry.path));
            entry.pipe(fs.createWriteStream(extractPath));
            console.log(`Extracted ${entry.path}`);
          } else {
            // Skip
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

// Upload the extracted files to Firestore
async function uploadZenodoFiles() {
  try {
    // Read all files in the extraction directory
    const files = fs.readdirSync(extractDir);

    // Process each file
    for (const file of files) {
      // Only process .js files
      if (path.extname(file) === ".js") {
        const filePath = path.join(extractDir, file);

        // Read and parse the file contents as JSON
        const fileContents = fs.readFileSync(filePath, "utf-8");
        const jsonData = JSON.parse(fileContents);

        // Use the filename (without extension) as the document key
        const documentKey = path.basename(file, ".js");

        // Upload data to Firestore
        await db.collection("data").doc(documentKey).set(jsonData);
        console.log(`Uploaded ${documentKey} to Firestore`);
      }
    }
  } catch (error) {
    console.error("Error uploading data:", error.message);
  }
}

async function main() {
  const zipPath = await downloadZenodoFiles();
  if (zipPath) {
    await extractZenodoFiles(zipPath);
    await uploadZenodoFiles();
  }
};

console.log("Running Zenodo sync task...")
main() 

console.log(`Starting Zenodo sync on an interval of ${INTERVAL / 1000} seconds.`);
setInterval(main, INTERVAL);