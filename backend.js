const axios = require("axios");
const fs = require("fs");
const path = require("path");
const os = require("os");
const unzipper = require("unzipper");

const { initializeApp, cert } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");

const serviceAccount = require("./auth.json");

initializeApp({
  credential: cert(serviceAccount),
});

const db = getFirestore();

const zenodoRecordId = "7670784";
const downloadUrl = `https://zenodo.org/api/records/${zenodoRecordId}`;

const targetDir = path.join(__dirname, "data");
const tmpDir = path.join(os.tmpdir(), zenodoRecordId);

async function downloadZenodoFiles() {
  try {
    // Create temporary and target directories if not exist
    fs.mkdirSync(tmpDir, { recursive: true });
    fs.mkdirSync(targetDir, { recursive: true });

    // Get files from Zenodo
    const response = await axios.get(downloadUrl);
    const zipFile = response.data.files?.find((file) => file.key.endsWith(".zip"));
    if (!zipFile) return console.log("No zip file found in this record.");

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

    // Extract only files in '/data' directory
    fs.createReadStream(zipPath)
      .pipe(unzipper.Parse())
      .on("entry", (entry) => {
        if (entry.path.includes("/data/") && entry.type === "File") {
          // Copy to target dir
          entry.pipe(fs.createWriteStream(path.join(targetDir, path.basename(entry.path))));
          console.log(`Extracted ${entry.path}`);
        } else {
          // Skip
          entry.autodrain();
        }
      })
      .on("close", () => console.log("Finished extracting /data"))
      .on("error", console.error);
  } catch (error) {
    console.error("Error:", error.message);
  }
}

// Function to upload each file to Firestore
async function uploadZenodoFiles() {
  try {
    // Read all files in the directory
    const files = fs.readdirSync(targetDir);

    // Process each file
    for (const file of files) {

      // Only process .js files
      if (path.extname(file) === ".js") {
        const filePath = path.join(targetDir, file);

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
    console.error("Error uploading data:", error);
  }
}

downloadZenodoFiles();
uploadZenodoFiles();