import fs from "node:fs";
import path from "node:path";

export function scanFiles(dir, options = {}) {
  if (!dir || !fs.existsSync(dir)) {
    return [];
  }

  const { includeExts, excludeExts } = options;

  const result = [];
  const items = fs.readdirSync(dir, { withFileTypes: true });

  for (const item of items) {
    const fullPath = path.join(dir, item.name);

    if (item.isDirectory()) {
      result.push(...scanFiles(fullPath, options));
      continue;
    }

    if (!item.isFile()) {
      continue;
    }

    const ext = path.extname(item.name).toLowerCase();

    // If includeExts is provided, only keep files with these extensions.
    if (includeExts && !includeExts.includes(ext)) {
      continue;
    }

    // If excludeExts is provided, remove files with these extensions.
    if (excludeExts && excludeExts.includes(ext)) {
      continue;
    }

    const parsed = path.parse(fullPath);

    /**
     * Full file path.
     *
     * Returned object shape:
     * {
     *   path: "/Users/xxx/Music/song.mp3",    // Full file path
     *   root: "/",                            // Root path
     *   dir: "/Users/xxx/Music",              // Parent directory
     *   base: "song.mp3",                     // File name with extension
     *   ext: ".mp3",                          // File extension, including the dot
     *   name: "song"                          // File name without extension
     * }
     */
    result.push({
      ...parsed,
      path: fullPath,
    });
  }

  return result;
}
