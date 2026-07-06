import express from "express";

import { getRoot, setRoot, listAudio } from "./library.js";

export const router = express.Router();

// GET /audio-library/api/root
router.get("/root", (req, res) => {
  res.json({
    root: getRoot() ?? null,
  });
});

// POST /audio-library/api/root
router.post("/root", (req, res) => {
  const { dir } = req.body;

  if (!dir) {
    res.status(400).json({
      error: "Missing 'dir' parameter",
    });
    return;
  }

  dir = setRoot(dir);

  res.json({
    root: dir,
  });
});

// GET /audio-library/api/list
router.get("/list", (req, res) => {
  res.json({
    list: listAudio(),
  });
});
