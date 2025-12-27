import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";

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

/* ================================
   CREATE VIDEO (audio + image)
================================ */
app.post("/make-video", cpUpload, async (req, res) => {
  try {
    if (!req.files?.audio || !req.files?.image) {
      return res.status(400).json({ error: "Audio or Image missing" });
    }

    const audioPath = req.files.audio[0].path;
    const imagePath = req.files.image[0].path;
    const outputPath = `/tmp/output-${Date.now()}.mp4`;

    const cmd = `
      ffmpeg -y \
      -loop 1 -framerate 1 -i "${imagePath}" \
      -i "${audioPath}" \
      -c:v libx264 -preset veryfast \
      -c:a aac -b:a 128k \
      -pix_fmt yuv420p \
      -shortest \
      "${outputPath}"
    `;

    exec(cmd, (err) => {
      if (err) {
        console.error(err);
        return res.status(500).json({ error: "FFmpeg failed" });
      }

      res.setHeader("Content-Type", "video/mp4");
res.setHeader(
  "Content-Disposition",
  `attachment; filename="output-${Date.now()}.mp4"`
);

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

/* ================================
   MERGE MULTIPLE VIDEOS
================================ */
app.post("/merge-videos", upload.array("videos"), async (req, res) => {
  try {
    if (!req.files || req.files.length < 2) {
      return res.status(400).json({ error: "Minimum 2 videos required" });
    }

    const concatFile = "/tmp/videos.txt";
    const outputFile = `/tmp/merged-${Date.now()}.mp4`;

    const fileList = req.files
      .map(file => `file '${file.path}'`)
      .join("\n");

    fs.writeFileSync(concatFile, fileList);

    const cmd = `
      ffmpeg -y -f concat -safe 0 -i ${concatFile} -c copy ${outputFile}
    `;

    exec(cmd, (err) => {
      if (err) {
        console.error("FFmpeg merge error:", err);
        return res.status(500).json({ error: "Video merge failed" });
      }

      res.setHeader("Content-Type", "video/mp4");
      res.sendFile(outputFile, () => {
        req.files.forEach(f => fs.unlinkSync(f.path));
        fs.unlinkSync(concatFile);
        fs.unlinkSync(outputFile);
      });
    });

  } catch (error) {
    console.error(error);
    res.status(500).json({ error: "Server error" });
  }
});

/* ================================
   HEALTH CHECK
================================ */
app.get("/health", (_, res) => {
  res.json({ status: "ok" });
});

app.listen(3000, () => console.log("Server running on port 3000"));
