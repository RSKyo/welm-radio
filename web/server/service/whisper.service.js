import fs from "node:fs";
import nodePath from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

import { config } from "welm-cdp/common/config";
import { assertExistingFile } from "welm-cdp/common/assert";
import { readFileTextSync, removeFileSync } from "welm-cdp/fs";
import { dialog } from "welm-cdp/dialog";

import { saveMeta } from "./meta-service.js";

// -----------------------------------------------------------------------------
// Constants
// -----------------------------------------------------------------------------

const execFileAsync = promisify(execFile);

const config_key_whisper_model = "radio.whisper_model";

const transcribe_types = {
  srt: {
    flag: "-osrt",
    extension: ".srt",
  },
  txt: {
    flag: "-otxt",
    extension: ".txt",
  },
  vtt: {
    flag: "-ovtt",
    extension: ".vtt",
  },
};

let whisper_model = config.get(config_key_whisper_model);
let isTranscribing = false;

// -----------------------------------------------------------------------------
// Public API
// -----------------------------------------------------------------------------

export function getWhisperModel(options = {}) {
  return {
    modelPath: whisper_model ?? "",
    modelName: whisper_model ? nodePath.basename(whisper_model) : "",
  };
}


export async function selectWhisperModel(options = {}) {
  const filePath = await dialog({
    dialogTitle: "Choose Whisper Model",
    mode: "file",
    includeExts: [".bin"],
  });

  // cancel
  if (!filePath) {
    return null;
  }

  config.set(config_key_whisper_model, filePath);
  whisper_model = filePath;

  return getWhisperModel(options);
}

export async function transcriptions(
  audioPath,
  language,
  options = {},
) {
  if (isTranscribing) {
    throw new Error(
      "Another transcription is in progress. Please wait until it finishes.",
    );
  }

  isTranscribing = true;

  assertExistingFile(audioPath, "audioPath");

  if (!whisper_model || !fs.existsSync(whisper_model)) {
    throw new Error(
      "Whisper model is not set or does not exist. Please select a valid Whisper model.",
    );
  }

  let wavPath, srtPath;
  try {
    wavPath = await convertAudioToWhisperWav(audioPath);
    srtPath = await transcribeWav(wavPath, language, "srt");
    const content = readFileTextSync(srtPath);

    return await saveMeta(audioPath, { content }, options);
  } finally {
    removeFileSync(wavPath);
    removeFileSync(srtPath);
    isTranscribing = false;
  }
}

export function isTranscribing() {
  return { isTranscribing };
}

async function convertAudioToWhisperWav(audioPath) {
  assertExistingFile(audioPath, "audioPath");

  const { dir, name } = nodePath.parse(audioPath);
  const tempDir = nodePath.join(dir, ".temp");
  fs.mkdirSync(tempDir, { recursive: true });

  const wavPath = nodePath.join(tempDir, `${name}.wav`);

  let stdout, stderr;
  try {
    ({ stdout, stderr } = await execFileAsync(
      "ffmpeg",
      [
        "-nostdin",
        "-y",
        "-i",
        audioPath,
        "-vn",
        "-ar",
        "16000",
        "-ac",
        "1",
        "-c:a",
        "pcm_s16le",
        wavPath,
      ],
      {
        maxBuffer: 10 * 1024 * 1024,
      },
    ));
  } catch (error) {
    const details = [stderr, stdout].filter(Boolean).join("\n").trim();

    throw new Error(
      `Failed to convert audio to WAV: ${audioPath}${
        details ? `\n${details}` : ""
      }`,
    );
  }

  if (!fs.existsSync(wavPath)) {
    const details = [stderr, stdout].filter(Boolean).join("\n").trim();

    throw new Error(
      `ffmpeg did not create WAV:  ${wavPath}${details ? `\n${details}` : ""}`,
    );
  }

  return wavPath;
}

async function transcribeWav(wavPath, language = "zh", outputType = "srt") {
  assertExistingFile(wavPath, "wavPath");

  const typeConfig = transcribe_types[outputType];

  const { dir, name } = nodePath.parse(wavPath);
  const outputPrefix = nodePath.join(dir, name);
  const outputPath = `${outputPrefix}${typeConfig.extension}`;

  // 防止 Whisper 本次失败时，误把上次遗留的 SRT 当作新结果读取。
  removeFileSync(outputPath);

  let stdout, stderr;
  try {
    ({ stdout, stderr } = await execFileAsync(
      "whisper-cli",
      [
        "-m",
        whisper_model,
        "-f",
        wavPath,
        "-l",
        language,
        typeConfig.flag,
        "-of",
        outputPrefix,
      ],
      {
        maxBuffer: 10 * 1024 * 1024,
      },
    ));
  } catch (error) {
    const details = [stderr, stdout].filter(Boolean).join("\n").trim();

    throw new Error(
      `Failed to transcribe WAV: ${wavPath}${details ? `\n${details}` : ""}`,
    );
  }

  if (!fs.existsSync(outputPath)) {
    const details = [stderr, stdout].filter(Boolean).join("\n").trim();

    throw new Error(
      `whisper-cli did not create ${outputType.toUpperCase()}: ${outputPath}${
        details ? `\n${details}` : ""
      }`,
    );
  }

  return outputPath;
}
