import express from "express";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { audiomanagerRouter } from "./apiaudiomanager.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const port = 3000;

const app = express();

app.use(express.static(path.join(__dirname, "ui")));

app.use("/api/audio", audiomanagerRouter);

app.listen(port, () => {
  console.log(`audio manager server running: http://localhost:${port}`);
});