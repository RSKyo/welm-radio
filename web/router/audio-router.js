import express from "express";

import { withOptions } from "welm-cdp/web";
import {
  selectAudioDir,
  listAudio,
  removeAudio,
  listCategory,
  saveAudioMeta,
} from "../service/audio-service.js";
import {
  listAudioType,
  listAudioLanguage,
  listAudioPosition,
} from "../service/meta-service.js";

export const router = express.Router();

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

// POST /audio/api/remove-audio
router.post(
  "/remove-audio",
  withOptions(async (req, res, options) => {
    const { files } = req.body ?? {};

    await removeAudio(files, options);

    res.json({
      success: true,
    });
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

// GET /audio/api/list-audio-category
router.get(
  "/list-audio-category",
  withOptions(async (req, res, options) => {
    res.json(listCategory(options));
  }),
);

// POST /audio/api/save-audio-meta
router.post(
  "/save-audio-meta",
  withOptions(async (req, res, options) => {
    const { audioMeta } = req.body ?? {};

    const savedAudioMeta = await saveAudioMeta(audioMeta, options);

    res.json(savedAudioMeta);
  }),
);
