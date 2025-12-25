import express from "express";
import multer from "multer";
import { exec } from "child_process";
import fs from "fs";

const app = express();
const upload = multer({ dest: "uploads/" });

app.post("/make-video", upload.fields([
  { name: "image", maxCount: 1 },
  { name: "audio", maxCount: 1 }
]), (req, res) => {

  const image = req.files.image[0].path;
  const audio = req.files.audio[0].path;
  const output = "output.mp4";

  const cmd = `ffmpeg -y -loop 1 -i ${image} -i ${audio} -c:v libx264 -c:a aac -pix_fmt yuv420p -shortest ${output}`;

  exec(cmd, (err) => {
    if (err) return res.status(500).send("FFmpeg failed");

    res.download(output, () => {
      fs.unlinkSync(image);
      fs.unlinkSync(audio);
      fs.unlinkSync(output);
    });
  });
});

app.listen(3000, () => console.log("FFmpeg API running"));