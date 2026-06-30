import express from "express";
import path from "path";
import { fileURLToPath } from "url";

import { getAudioList } from "./core/audio.js"; 

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

app.use(express.static(path.join(__dirname, "ui")));

app.listen(3000, () => {
  console.log("radio server running: http://localhost:3000");
});

app.get("/api/audio-list", getAudioList);
