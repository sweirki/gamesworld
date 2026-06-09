// Lightweight project config validator used by npm poststart.
// Keep this file dependency-free so Expo start never fails because of tooling.
const fs = require("fs");

const required = ["app.config.js", "package.json", "tsconfig.json"];
const missing = required.filter((file) => !fs.existsSync(file));

if (missing.length) {
  console.warn(`Missing project config files: ${missing.join(", ")}`);
}
