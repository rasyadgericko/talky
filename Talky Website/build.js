const fs = require('fs');
const path = require('path');
const CleanCSS = require('clean-css');
const { minify } = require('terser');

const DIST = path.join(__dirname, 'dist');

// Copy a file or directory recursively
function copyRecursive(src, dest) {
  const stat = fs.statSync(src);
  if (stat.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const item of fs.readdirSync(src)) {
      if (['node_modules', 'dist', '.vercel', '.next', '.git', '.vscode'].includes(item)) continue;
      copyRecursive(path.join(src, item), path.join(dest, item));
    }
  } else {
    fs.copyFileSync(src, dest);
  }
}

async function build() {
  // Clean dist
  if (fs.existsSync(DIST)) fs.rmSync(DIST, { recursive: true });
  fs.mkdirSync(DIST, { recursive: true });

  // Copy all files to dist
  for (const item of fs.readdirSync(__dirname)) {
    if (['node_modules', 'dist', '.vercel', '.next', '.git', '.vscode', 'package.json', 'package-lock.json', 'build.js', 'vercel.json', '.gitignore'].includes(item)) continue;
    copyRecursive(path.join(__dirname, item), path.join(DIST, item));
  }

  // Minify CSS
  const cssFile = path.join(DIST, 'style.css');
  if (fs.existsSync(cssFile)) {
    const css = fs.readFileSync(cssFile, 'utf8');
    const minified = new CleanCSS({ level: 2 }).minify(css);
    fs.writeFileSync(cssFile, minified.styles);
    console.log(`style.css: ${css.length} → ${minified.styles.length} bytes`);
  }

  // Minify JS
  const jsFile = path.join(DIST, 'script.js');
  if (fs.existsSync(jsFile)) {
    const js = fs.readFileSync(jsFile, 'utf8');
    const result = await minify(js, { compress: true, mangle: true });
    fs.writeFileSync(jsFile, result.code);
    console.log(`script.js: ${js.length} → ${result.code.length} bytes`);
  }

  console.log('Build complete → dist/');
}

build().catch(err => { console.error(err); process.exit(1); });
