import express from "express";

import { webHandler } from "../handler.js";
import { getRoot, setRoot, listAudio, selectRoot } from "./library.js";

export const router = express.Router();

// GET /audio-library/api/root
router.get(
  "/root",
  webHandler(async (req, res, options) => {
    const root = getRoot(options);

    res.json({
      root,
    });
  }),
);

// POST /audio-library/api/select-root
router.post(
  "/select-root",
  webHandler(async (req, res, options) => {
    const root = await selectRoot(options);

    res.json({
      root,
      canceled: !root,
    });
  }),
);

// GET /audio-library/api/list-audio
router.get(
  "/list-audio",
  webHandler(async (req, res, options) => {
    const list = listAudio(options);

    res.json({
      list,
    });
  }),
);
