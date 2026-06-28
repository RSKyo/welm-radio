import { spawn } from "node:child_process";

function getPlatform() {
  return process.platform;
}

function assertMacOS() {
  if (getPlatform() !== "darwin") {
    throw new Error("clipboard is only supported on macOS");
  }
}

function runCommand(command, input = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(command);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);

    child.on("close", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(stderr.trim() || `${command} failed with code ${code}`));
    });

    if (input !== null) {
      child.stdin.end(String(input));
    }
  });
}

export async function readClipboard() {
  assertMacOS();
  return await runCommand("pbpaste");
}

export async function writeClipboard(text) {
  assertMacOS();
  await runCommand("pbcopy", String(text));
  return true;
}

export async function clearClipboard() {
  assertMacOS();
  await writeClipboard("");
  return true;
}