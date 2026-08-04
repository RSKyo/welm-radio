import express from "express";

import { withOptions } from "welm-cdp/web";
import {
  selectAudioDir,
  selectWhisperModel,
  getWhisperModel,
  listAudioType,
  listAudioLanguage,
  listAudioPosition,
  listAudioDayPart,
  listAudioCategory,
  listAlternateGroup,
  listAudio,
  removeAudio,
  addAudio,
  renameAudio,
  loadAudio,
  transcribeAudioAndSaveMeta,
  isTranscriptionInProgress,
} from "../service/audio-service.js";
import { saveMeta } from "../service/meta-service.js";

export const router = express.Router();

// GET /audio/api/select-audio-dir
router.get(
  "/select-audio-dir",
  withOptions(async (req, res, options) => {
    const path = await selectAudioDir(options);

    res.json({
      path,
      canceled: !path,
    });
  }),
);

// GET /audio/api/select-whisper-model
router.get(
  "/select-whisper-model",
  withOptions(async (req, res, options) => {
    const path = await selectWhisperModel(options);
    const whisperModel = getWhisperModel(options);

    res.json({
      path,
      canceled: !path,
    });
  }),
);

// GET /audio/api/get-whisper-model
router.get(
  "/get-whisper-model",
  withOptions(async (req, res, options) => {
    const whisperModel = getWhisperModel(options);

    res.json({
      whisperModel,
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

// GET /audio/api/list-audio-day-part
router.get(
  "/list-audio-day-part",
  withOptions(async (req, res, options) => {
    res.json(listAudioDayPart());
  }),
);

// GET /audio/api/list-audio-category
router.get(
  "/list-audio-category",
  withOptions(async (req, res, options) => {
    res.json(listAudioCategory(options));
  }),
);

// GET /audio/api/list-audio-alternate-group
router.get(
  "/list-audio-alternate-group",
  withOptions(async (req, res, options) => {
    res.json(listAlternateGroup(options));
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

// GET /audio/api/add-audio
router.get(
  "/add-audio",
  withOptions(async (req, res, options) => {
    const files = await addAudio(options);

    res.json({
      files,
      canceled: !files,
    });
  }),
);

// POST /audio/api/rename-audio
router.post(
  "/rename-audio",
  withOptions(async (req, res, options) => {
    const { audioPath, name } = req.body ?? {};

    const result = await renameAudio(audioPath, name, options);

    res.json(result);
  }),
);

// GET /audio/api/load-audio
router.get(
  "/load-audio",
  withOptions(async (req, res, options) => {
    const { filePath } = req.query ?? {};

    const { contentType, buffer } = await loadAudio(filePath, options);

    res.type(contentType);
    res.send(buffer);
  }),
);

// POST /audio/api/transcribe-audio-and-save-meta
router.post(
  "/transcribe-audio-and-save-meta",
  withOptions(async (req, res, options) => {
    const { audioPath,language } = req.body ?? {};

    const savedMeta = await transcribeAudioAndSaveMeta(audioPath, language, options);

    res.json(savedMeta);
  }),
);

// GET /audio/api/is-transcription-in-progress
router.get(
  "/is-transcription-in-progress",
  withOptions(async (req, res, options) => {
    const inProgress = isTranscriptionInProgress();

    res.json({
      inProgress,
    });
  }),
);

// POST /audio/api/save-meta
router.post(
  "/save-meta",
  withOptions(async (req, res, options) => {
    const { audioPath, meta } = req.body ?? {};

    const savedMeta = await saveMeta(audioPath, meta, options);

    res.json(savedMeta);
  }),
);
