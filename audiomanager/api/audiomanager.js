import express from "express";

import { getAudioList } from "../core/audiomanager.js";

export const audiomanagerRouter = express.Router();

audiomanagerRouter.get("/list", (req, res) => {
  res.json(getAudioList());
});