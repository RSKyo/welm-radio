import express from "express";

import { withOptions } from "welm-cdp/web";
import { getRoot, setRoot, listAudio, selectRoot } from "../service/audio-service.js";
import { listMetaType } from "../service/meta-service.js";

export const router = express.Router();

// GET /audio-library/api/root
router.get(
  "/root",
  withOptions(async (req, res, options) => {
    res.json(getRoot(options));
  }),
);

// POST /audio-library/api/select-root
router.post(
  "/select-root",
  withOptions(async (req, res, options) => {
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
  withOptions(async (req, res, options) => {
    const filter = req.body ?? {};

    res.json(listAudio(filter, options));
  }),
);

// GET /audio-library/api/list-meta-type
router.get(
  "/list-meta-type",
  withOptions(async (req, res, options) => {
    res.json(listMetaType());
  }),
);