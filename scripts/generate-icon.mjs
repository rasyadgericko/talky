/**
 * Generate Talky app icon — a sleek black rounded-rect with a white microphone.
 * Uses sharp (already a project dependency) to render SVG → PNG → .icns
 */

import { execSync } from "child_process";
import { mkdirSync, rmSync, existsSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const projectRoot = join(__dirname, "..");
const buildDir = join(projectRoot, "build");

// ─── SVG Icon Design ──────────────────────────────────────────
// Black rounded square with a clean white microphone icon
const iconSvg = `<svg width="1024" height="1024" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg">
  <!-- Background: black rounded square (macOS icon shape) -->
  <rect width="1024" height="1024" rx="228" ry="228" fill="#000000"/>

  <!-- Subtle inner glow ring -->
  <rect x="40" y="40" width="944" height="944" rx="200" ry="200"
        fill="none" stroke="rgba(255,255,255,0.06)" stroke-width="1"/>

  <!-- Microphone group, centered -->
  <g transform="translate(512, 460)">
    <!-- Mic capsule (rounded rectangle) -->
    <rect x="-85" y="-220" width="170" height="300" rx="85" ry="85"
          fill="white"/>

    <!-- Three horizontal detail lines on the capsule grill -->
    <line x1="-40" y1="-120" x2="40" y2="-120"
          stroke="rgba(0,0,0,0.12)" stroke-width="6" stroke-linecap="round"/>
    <line x1="-50" y1="-90" x2="50" y2="-90"
          stroke="rgba(0,0,0,0.12)" stroke-width="6" stroke-linecap="round"/>
    <line x1="-40" y1="-60" x2="40" y2="-60"
          stroke="rgba(0,0,0,0.12)" stroke-width="6" stroke-linecap="round"/>

    <!-- Pickup arc (U-shape cradle around the capsule) -->
    <path d="M-150,30 C-150,160 150,160 150,30"
          fill="none" stroke="white" stroke-width="36" stroke-linecap="round"/>

    <!-- Vertical stand -->
    <line x1="0" y1="155" x2="0" y2="260"
          stroke="white" stroke-width="36" stroke-linecap="round"/>

    <!-- Horizontal base -->
    <line x1="-80" y1="260" x2="80" y2="260"
          stroke="white" stroke-width="36" stroke-linecap="round"/>
  </g>

  <!-- Small "sound wave" arcs on the sides for character -->
  <g transform="translate(512, 380)" opacity="0.35">
    <!-- Left waves -->
    <path d="M-220,-30 C-240,0 -240,60 -220,90"
          fill="none" stroke="white" stroke-width="16" stroke-linecap="round"/>
    <path d="M-270,-60 C-300,0 -300,90 -270,120"
          fill="none" stroke="white" stroke-width="12" stroke-linecap="round"/>

    <!-- Right waves -->
    <path d="M220,-30 C240,0 240,60 220,90"
          fill="none" stroke="white" stroke-width="16" stroke-linecap="round"/>
    <path d="M270,-60 C300,0 300,90 270,120"
          fill="none" stroke="white" stroke-width="12" stroke-linecap="round"/>
  </g>
</svg>`;

async function generateIcon() {
  // Dynamic import of sharp
  const sharpModule = await import("sharp");
  const sharp = sharpModule.default;

  const iconsetDir = join(buildDir, "icon.iconset");

  // Clean up any previous iconset
  if (existsSync(iconsetDir)) {
    rmSync(iconsetDir, { recursive: true });
  }
  mkdirSync(iconsetDir, { recursive: true });

  // macOS iconset sizes
  const sizes = [
    { name: "icon_16x16.png", size: 16 },
    { name: "icon_16x16@2x.png", size: 32 },
    { name: "icon_32x32.png", size: 32 },
    { name: "icon_32x32@2x.png", size: 64 },
    { name: "icon_128x128.png", size: 128 },
    { name: "icon_128x128@2x.png", size: 256 },
    { name: "icon_256x256.png", size: 256 },
    { name: "icon_256x256@2x.png", size: 512 },
    { name: "icon_512x512.png", size: 512 },
    { name: "icon_512x512@2x.png", size: 1024 },
  ];

  console.log("Generating icon sizes...");

  const svgBuffer = Buffer.from(iconSvg);

  for (const { name, size } of sizes) {
    await sharp(svgBuffer)
      .resize(size, size, { fit: "contain" })
      .png()
      .toFile(join(iconsetDir, name));
    console.log(`  ✓ ${name} (${size}x${size})`);
  }

  // Convert iconset to .icns using macOS iconutil
  const icnsPath = join(buildDir, "icon.icns");
  if (existsSync(icnsPath)) {
    rmSync(icnsPath);
  }

  console.log("Converting to .icns...");
  execSync(`iconutil -c icns "${iconsetDir}" -o "${icnsPath}"`);
  console.log(`✓ Created ${icnsPath}`);

  // Clean up iconset directory
  rmSync(iconsetDir, { recursive: true });
  console.log("✓ Cleaned up temporary iconset");
}

generateIcon().catch((err) => {
  console.error("Failed to generate icon:", err);
  process.exit(1);
});
