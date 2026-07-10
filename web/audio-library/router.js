import express from "express";

import { webHandler } from "../handler.js";
import { getRoot, setRoot, listAudio, selectRoot } from "./library.js";
import { listMetaType } from "./meta.js";

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

// POST /audio-library/api/list-audio
router.post(
  "/list-audio",
  webHandler(async (req, res, options) => {
    const filter = req.body || {};

    const list = listAudio(filter, options);

    res.json({
      list,
    });
  }),
);

// GET /audio-library/api/list-meta-type
router.get(
  "/list-meta-type",
  webHandler(async (req, res, options) => {
    const list = listMetaType();

    res.json({
      list,
    });
  }),
);