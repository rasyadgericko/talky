import {
  cpSync,
  mkdirSync,
  existsSync,
  rmSync,
  renameSync,
  readdirSync,
  lstatSync,
  readlinkSync,
  unlinkSync,
} from "fs";
import { join, dirname, resolve } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const standaloneDir = join(projectRoot, ".next", "standalone");
const outputDir = join(projectRoot, "electron-app-server");

// Clean previous output
if (existsSync(outputDir)) {
  rmSync(outputDir, { recursive: true });
  console.log("✓ Cleaned previous electron-app-server/");
}

// Copy entire standalone directory to electron-app-server/
console.log("Copying standalone build to electron-app-server/...");
cpSync(standaloneDir, outputDir, { recursive: true });
console.log("✓ Copied .next/standalone/ → electron-app-server/");

// Fix broken symlinks: replace symlinks with actual files or remove broken ones
function fixSymlinks(dir) {
  if (!existsSync(dir)) return;
  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    try {
      if (entry.isSymbolicLink()) {
        const target = readlinkSync(fullPath);
        const resolvedTarget = resolve(dirname(fullPath), target);
        if (existsSync(resolvedTarget)) {
          // Replace symlink with actual content
          unlinkSync(fullPath);
          cpSync(resolvedTarget, fullPath, { recursive: true });
          console.log(`  ✓ Resolved symlink: ${entry.name}`);
        } else {
          // Remove broken symlink
          unlinkSync(fullPath);
          console.log(`  ✓ Removed broken symlink: ${entry.name}`);
        }
      } else if (entry.isDirectory()) {
        fixSymlinks(fullPath);
      }
    } catch (err) {
      console.warn(`  ⚠ Could not process ${fullPath}: ${err.message}`);
    }
  }
}

console.log("Fixing symlinks in output...");
fixSymlinks(outputDir);
console.log("✓ Symlinks resolved");

// CRITICAL: Copy missing native libs that Next.js standalone tracing misses.
// onnxruntime-node's .node binary dynamically loads platform-specific libs at runtime,
// but Next.js file tracing only copies the .node file.
function copyMissingNativeDeps() {
  // Detect platform and architecture for the ONNX native binaries
  const platform = process.platform; // "darwin" or "win32"
  const arch = process.arch; // "arm64" or "x64"

  let onnxPlatformDir;
  let nativeExtension;

  if (platform === "darwin") {
    onnxPlatformDir = join("darwin", arch);
    nativeExtension = ".dylib";
  } else if (platform === "win32") {
    onnxPlatformDir = join("win32", arch);
    nativeExtension = ".dll";
  } else {
    console.warn(`⚠ Unsupported platform "${platform}", skipping native dep copy`);
    return;
  }

  const onnxSrcDir = join(
    projectRoot,
    "node_modules",
    "onnxruntime-node",
    "bin",
    "napi-v3",
    ...onnxPlatformDir.split("/")
  );
  const onnxDestDir = join(
    outputDir,
    "node_modules",
    "onnxruntime-node",
    "bin",
    "napi-v3",
    ...onnxPlatformDir.split("/")
  );

  if (!existsSync(onnxSrcDir)) {
    console.warn(`⚠ onnxruntime-node source dir not found at ${onnxSrcDir}, skipping native lib copy`);
    return;
  }

  // Find all native library files in the source
  const entries = readdirSync(onnxSrcDir);
  for (const entry of entries) {
    if (entry.endsWith(nativeExtension) || entry.endsWith(".node")) {
      const srcPath = join(onnxSrcDir, entry);
      const destPath = join(onnxDestDir, entry);
      if (!existsSync(destPath)) {
        mkdirSync(onnxDestDir, { recursive: true });
        cpSync(srcPath, destPath);
        console.log(`  ✓ Copied missing native lib: ${entry}`);
      }
    }
  }
}

console.log("Copying missing native dependencies...");
copyMissingNativeDeps();
console.log("✓ Native dependencies copied");

// Copy public/ into the output directory
const publicSrc = join(projectRoot, "public");
const publicDest = join(outputDir, "public");
if (existsSync(publicSrc)) {
  cpSync(publicSrc, publicDest, { recursive: true });
  console.log("✓ Copied public/ → electron-app-server/public/");
}

// Copy .next/static/ into the output directory
const staticSrc = join(projectRoot, ".next", "static");
const staticDest = join(outputDir, ".next", "static");
if (existsSync(staticSrc)) {
  mkdirSync(join(outputDir, ".next"), { recursive: true });
  cpSync(staticSrc, staticDest, { recursive: true });
  console.log("✓ Copied .next/static/ → electron-app-server/.next/static/");
}

// CRITICAL: Rename node_modules to _node_modules
// electron-builder strips any directory named "node_modules" from extraResources.
// We rename it here and restore it at runtime via symlink in the Electron main process.
const nodeModulesPath = join(outputDir, "node_modules");
const renamedPath = join(outputDir, "_node_modules");
if (existsSync(nodeModulesPath)) {
  renameSync(nodeModulesPath, renamedPath);
  console.log(
    "✓ Renamed node_modules → _node_modules (to bypass electron-builder stripping)"
  );
} else {
  console.error("✗ WARNING: node_modules missing from standalone build!");
}

console.log("✓ Electron build preparation complete.");
