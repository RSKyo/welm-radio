import express from "express";

import { withOptions } from "welm-cdp/web";
import { getAudioDir, listAudio, selectAudioDir } from "../service/audio-service.js";
import { listAudioType, listAudioLanguage, listAudioPosition } from "../service/meta-service.js";

export const router = express.Router();

// GET /audio/api/audio-dir
router.get(
  "/audio-dir",
  withOptions(async (req, res, options) => {
    res.json(getAudioDir(options));
  }),
);

// GET /audio/api/select-audio-dir
router.get(
  "/select-audio-dir",
  withOptions(async (req, res, options) => {
    const dir = await selectAudioDir(options);

    res.json({
      dir,
      canceled: !dir,
    });
  }),
);

// POST /audio/api/list-audio
router.post(
  "/list-audio",
  withOptions(async (req, res, options) => {
    const filter = req.body ?? {};

    res.json(listAudio(filter, options));
  }),
);

// GET /audio/api/list-audio-type
router.get(
  "/list-audio-type",
  withOptions(async (req, res, options) => {
    res.json(listAudioType());
  }),
);

// GET /audio/api/list-audio-language
router.get(
  "/list-audio-language",
  withOptions(async (req, res, options) => {
    res.json(listAudioLanguage());
  }),
);

// GET /audio/api/list-audio-position
router.get(
  "/list-audio-position",
  withOptions(async (req, res, options) => {
    res.json(listAudioPosition());
  }),
);