const fs = require("fs");
const crypto = require("crypto");
const axios = require("axios");
const express = require("express");
const multer = require("multer");
const dotenv = require("dotenv");

dotenv.config(); // Load environment variables from .env file

const app = express();
const upload = multer({ dest: "uploads/" });

// iDrive E2 credentials and endpoint
const accessKeyId = process.env.ACCESS_KEY_ID;
const secretKey = process.env.SECRET_KEY;
const endpoint = process.env.ENDPOINT;
const bucket = process.env.BUCKET_NAME;

app.post("/upload", upload.single("video"), async (req, res) => {
  const filePath = req.file.path;
  const fileName = req.file.originalname;
  const fileType = req.file.mimetype;

  // Date and time for the request
  const timestamp = new Date().toUTCString();

  // Create the signature
  const canonicalString = `PUT\n\n${fileType}\n${timestamp}\n/${bucket}/${fileName}`;
  const signature = crypto
    .createHmac("sha1", secretKey)
    .update(canonicalString)
    .digest("base64");

  // Prepare headers
  const headers = {
    "Content-Type": fileType,
    Date: timestamp,
    Authorization: `AWS ${accessKeyId}:${signature}`,
  };

  try {
    // Read file contents
    const fileContents = fs.readFileSync(filePath);

    // Upload the file using axios
    const response = await axios.put(
      `${endpoint}/${bucket}/${fileName}`,
      fileContents,
      { headers }
    );

    if (response.status === 200) {
      res.send(`Upload successful: ${fileName}`);
      console.log(`Upload successful: ${fileName}`);
    } else {
      res
        .status(response.status)
        .send(`Upload failed with status code ${response.status}`);
      console.error(`Upload failed with status code ${response.status}`);
    }
  } catch (error) {
    console.error("Error during file upload:", error);
    res.status(500).send("Upload failed");
  } finally {
    try {
      // Cleanup the uploaded file
      fs.unlinkSync(filePath);
    } catch (err) {
      console.error("Error cleaning up file:", err);
    }
  }
});

app.listen(3000, () => {
  console.log("Server running on port 3000");
});
