import nodePath from "node:path";
import fs from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
const execFileAsync = promisify(execFile);

import { readFileJsonSync, writeFileJsonSync } from "welm-cdp/fs";
import { assertExistingFile, assertPositive } from "welm-cdp/infra/assert";

const waveform_sample_rate = 1000;
const waveform_interval = 0.05;

function createDefaultWaveform(options = {}) {
  return {
    audioPath: options.audioPath ?? "", // 音频文件的绝对路径
    waveformPath: options.waveformPath ?? "", // 波形数据文件的绝对路径
    interval: waveform_interval, // 波形数据的时间间隔
    waveform: [],
    createdAt: "",
    updatedAt: "",
  };
}

export function getWaveformPath(audioPath) {
  const { dir, name } = nodePath.parse(audioPath);
  return nodePath.join(dir, `${name}.waveform.json`);
}

export function loadWaveform(audioPath) {
  const waveformPath = getWaveformPath(audioPath);

  if (!waveformPath || !fs.existsSync(waveformPath)) {
    return createDefaultWaveform({ audioPath, waveformPath });
  }

  try {
    return {
      ...createDefaultWaveform({ audioPath, waveformPath }),
      ...readFileJsonSync(waveformPath),
    };
  } catch {
    return createDefaultWaveform({ audioPath, waveformPath });
  }
}

export function saveWaveform(audioPath, waveform = {}) {
  const waveformPath = getWaveformPath(audioPath);

  const oldWaveform = loadWaveform(audioPath);
  const now = new Date().toISOString();

  const newWaveform = {
    ...oldWaveform,
    ...waveform,
    createdAt: oldWaveform.createdAt === "" ? now : oldWaveform.createdAt,
    updatedAt: now,
  };

  writeFileJsonSync(waveformPath, newWaveform, { overwrite: true, spaces: 2 });

  return newWaveform;
}

export async function getAudioWaveform(
  audioPath,
  { interval = waveform_interval } = {},
) {
  assertExistingFile(audioPath, "audioPath");
  assertPositive(interval, "interval");

  const { stdout } = await execFileAsync(
    "ffmpeg",
    [
      "-v",
      "error",
      "-i",
      audioPath,

      // Convert to mono.
      "-ac",
      "1",

      // Downsample to a fixed sample rate for waveform generation.
      "-ar",
      String(waveform_sample_rate),

      // Output raw Float32 PCM.
      "-f",
      "f32le",

      // Write PCM data to stdout.
      "-",
    ],
    {
      encoding: "buffer",
      maxBuffer: 1024 * 1024 * 500,
    },
  );

  if (stdout.length === 0) {
    return [];
  }

  const samples = new Float32Array(
    stdout.buffer,
    stdout.byteOffset,
    Math.floor(stdout.byteLength / Float32Array.BYTES_PER_ELEMENT),
  );

  const samplesPerInterval = Math.max(
    1,
    Math.round(waveform_sample_rate * interval),
  );

  const waveform = [];

  for (let start = 0; start < samples.length; start += samplesPerInterval) {
    const end = Math.min(start + samplesPerInterval, samples.length);

    let min = 1;
    let max = -1;

    for (let i = start; i < end; i++) {
      const sample = samples[i];

      if (sample < min) {
        min = sample;
      }

      if (sample > max) {
        max = sample;
      }
    }

    waveform.push([Number(min.toFixed(4)), Number(max.toFixed(4))]);
  }

  return {
    interval,
    waveform,
  };
}

export function sampleWaveform(waveform, targetCount) {
  if (waveform.length <= targetCount) {
    return waveform;
  }

  const result = [];
  const pointsPerGroup = waveform.length / targetCount;

  for (let i = 0; i < targetCount; i++) {
    const from = Math.floor(i * pointsPerGroup);
    const to = Math.min(waveform.length, Math.ceil((i + 1) * pointsPerGroup));

    let min = 1;
    let max = -1;

    for (let j = from; j < to; j++) {
      const [pointMin, pointMax] = waveform[j];

      if (pointMin < min) {
        min = pointMin;
      }

      if (pointMax > max) {
        max = pointMax;
      }
    }

    result.push([min, max]);
  }

  return result;
}

export function sampleWaveformForRange({
  waveform,
  interval,
  start,
  end,
  pixelsPerSecond,
}) {
  const startIndex = Math.max(0, Math.floor(start / interval));

  const endIndex = Math.min(waveform.length, Math.ceil(end / interval));

  const source = waveform.slice(startIndex, endIndex);

  if (source.length === 0) {
    return [];
  }

  const width = (end - start) * pixelsPerSecond;
  const targetCount = Math.max(1, Math.floor(width / 2));

  return sampleWaveform(source, targetCount);
}
