import express from "express";

import { listAudio } from "./service/audio.js";

// /audio-library/api
export const router = express.Router();

router.get("/list", (req, res) => {
  res.json(listAudio());
});