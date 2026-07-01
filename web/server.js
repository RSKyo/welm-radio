/**
 * Executable web server entry.
 *
 * Do not import this file.
 * Do not export from this file.
 *
 */

import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { router as audioLibraryRouter } from "./audio-library/router.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const serverPort = 3000;

const app = express();

app.use(express.json());

app.get("/__ready", (req, res) => {
  res.json({ ok: true });
});

// audio-library
app.use(
  "/audio-library",
  express.static(path.join(__dirname, "audio-library/ui")),
);

app.use("/audio-library/api", audioLibraryRouter);

app.listen(serverPort, () => {
  console.log(`welm-radio web server running: http://localhost:${serverPort}`);
});
