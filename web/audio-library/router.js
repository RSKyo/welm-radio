import express from "express";

import { getAudioList } from "./service/audio.js";

export const router = express.Router();

router.get("/list", (req, res) => {
  res.json(getAudioList());
});