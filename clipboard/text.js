import { spawn } from "child_process";

function run(command, args = [], input = null) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args);

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (d) => {
      stdout += d.toString("utf8");
    });

    child.stderr.on("data", (d) => {
      stderr += d.toString("utf8");
    });

    child.on("error", (err) => {
      reject(new Error(`Failed to start ${command}: ${err.message}`));
    });

    child.on("close", (code) => {
      if (code === 0) return resolve(stdout);
      reject(new Error(stderr.trim() || `${command} failed (${code})`));
    });

    if (input !== null) {
      child.stdin.end(String(input));
    } else {
      child.stdin.end();
    }
  });
}

export async function readClipboardText() {
  if (process.platform === "darwin") {
    return await run("pbpaste");
  }

  if (process.platform === "win32") {
    return await run("powershell.exe", [
      "-NoProfile",
      "-Command",
      "Get-Clipboard -Raw",
    ]);
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}

export async function writeClipboardText(text) {
  if (process.platform === "darwin") {
    await run("pbcopy", [], text);
    return;
  }

  if (process.platform === "win32") {
    await run(
      "powershell.exe",
      ["-NoProfile", "-Command", "$input | Set-Clipboard"],
      text
    );
    return;
  }

  throw new Error(`Unsupported platform: ${process.platform}`);
}