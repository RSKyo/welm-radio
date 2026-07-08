import express from "express";

import { getRoot, setRoot, listAudio, selectRoot } from "./library.js";

export const router = express.Router();

// GET /audio-library/api/root
router.get(
  "/root",
  withErrorHandler(async (req, res) => {
    const root = getRoot();

    res.json({
      root,
    });
  }),
);

// POST /audio-library/api/select-root
router.post(
  "/select-root",
  withErrorHandler(async (req, res) => {
    const root = await selectRoot();

    res.json({
      root,
      canceled: !root,
    });
  }),
);

// GET /audio-library/api/list-audio
router.get(
  "/list-audio",
  withErrorHandler(async (req, res) => {
    const list = listAudio();

    res.json({
      list,
    });
  }),
);

function withErrorHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}
