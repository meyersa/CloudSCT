const axios = require("axios");
const fs = require("fs");
const path = require("path");
const unzipper = require("unzipper");

const zenodoRecordId = "7670784";
const downloadUrl = `https://zenodo.org/api/records/${zenodoRecordId}`;
const downloadDir = "/data";

async function downloadZenodoFiles() {
  try {
    // Get file URLs
    const response = await axios.get(downloadUrl);
    const files = response.data.files;

    // Ensure there are files
    if (!files || files.length === 0) {
      console.log("No files available for download in this record.");
      return;
    }

    // Iterate over each file in the record and download it
    for (const file of files) {
      const fileUrl = file?.links?.self;
      const fileName = path.basename(fileUrl);

      if (!fileUrl) {
        console.log(`File URL missing for one of the files, skipping.`);
        continue;
      }

      // Download
      console.log(`Downloading ${fileName}...`);

      const fileResponse = await axios({
        url: fileUrl,
        method: "GET",
        responseType: "stream",
      });

      // Set path as data directory
      const filePath = path.join(__dirname, downloadDir, fileName);
      const writer = fs.createWriteStream(filePath);

      // Download to path
      fileResponse.data.pipe(writer);

      // Wait for the file to finish downloading
      await new Promise((resolve, reject) => {
        writer.on("finish", resolve);
        writer.on("error", reject);
      });

      console.log(`Downloaded ${fileName} to ${filePath}`);

      // Unzip
      if (fileName.endsWith(".zip")) {
        console.log(`Unzipping ${fileName}...`);
        fs.createReadStream(filePath)
          .pipe(unzipper.Extract({ path: __dirname }))
          .on("close", () => console.log(`Unzipped ${fileName} to ${__dirname}`))
          .on("error", (err) => console.error(`Error unzipping ${fileName}:`, err));
      }
    }
  } catch (error) {
    console.error("Error downloading files:", error.message);
  }
}

downloadZenodoFiles();
