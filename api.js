// Temporary API to serve /data file

const express = require("express");
const fs = require("fs");
const path = require("path");
const app = express();

app.use(express.static(path.join(__dirname, 'src')));

app.get("/get-data-files", (req, res) => {
  const dataDir = path.join(__dirname, "data");
  fs.readdir(dataDir, (err, files) => {
    if (err) {
      return res.status(500).send("Unable to scan directory");
    }
    
    // Filter for JSON files and return the list
    const jsonFiles = files.filter((file) => file.endsWith(".js"));
    res.json(jsonFiles);
  });
});

app.get("/get-data-file", (req, res) => {
  const { filename } = req.query;

  const dataDir = path.join(__dirname, "data");
  const filePath = path.join(dataDir, filename);

  console.log(filePath)

  // Verify that the file exists and is within the data directory
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).send("File not found");
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
