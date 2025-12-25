import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";
import path from "path";

const app = express();
const upload = multer({ dest: "/tmp" });

/**
 * IMPORTANT:
 * Field names MUST match n8n:
 * audio
 * image
 */
const cpUpload = upload.fields([
  { name: "audio", maxCount: 1 },
  { name: "image", maxCount: 1 }
]);

app.post("/make-video", cpUpload, async (req, res) => {
  try {
    // 🔴 SAFETY CHECKS (VERY IMPORTANT)
    if (!req.files?.audio || !req.files?.image) {
      return res.status(400).json({
        error: "Audio or Image missing"
      });
    }

    const audioFile = req.files.audio[0];
    const imageFile = req.files.image[0];

    const audioPath = audioFile.path;
    const imagePath = imageFile.path;

    const outputPath = `/tmp/output-${Date.now()}.mp4`;

    // 🎬 FFMPEG COMMAND
    const cmd = `
      ffmpeg -y \
      -loop 1 -i ${imagePath} \
      -i ${audioPath} \
      -c:v libx264 -tune stillimage \
      -c:a aac -b:a 192k \
      -shortest ${outputPath}
    `;

    exec(cmd, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "FFmpeg failed" });
      }

      res.setHeader("Content-Type", "video/mp4");
      res.sendFile(outputPath, () => {
        fs.unlinkSync(audioPath);
        fs.unlinkSync(imagePath);
        fs.unlinkSync(outputPath);
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
