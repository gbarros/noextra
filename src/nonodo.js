#!/usr/bin/env node
const fs = require("node:fs");
const { spawn, spawnSync } = require("node:child_process");
const path = require("node:path");
const { arch, platform } = require("node:os");
const { version } = require("../package.json");

const PACKAGE_NONODO_VERSION = process.env.PACKAGE_NONODO_VERSION ?? "0.1.0";
const PACKAGE_NONODO_PATH =
  process.env.PACKAGE_NONODO_PATH ?? path.join(__dirname, "..", "bin");

const AVAILABLE_NONODE_ARCH = new Set([
  "darwin-amd64",
  "darwin-arm64",
  "linux-amd64",
  "linux-arm64",
  "windows-amd64",
]);

function runNonodo(location) {
  // console.log(`Running nonodo binary: ${location}`);

  const args = process.argv.slice(2);
  const nonodoBin = spawn(location, args, { stdio: "inherit" });
  nonodoBin.on("exit", (code, signal) => {
    process.on("exit", () => {
      if (signal) {
        process.kill(process.pid, signal);
      } else {
        process.exit(code);
      }
    });
  });

  process.on("SIGINT", function () {
    nonodoBin.kill("SIGINT");
    nonodoBin.kill("SIGTERM");
  });
}

function getNonodoAvailable() {
  const nonodoPath = PACKAGE_NONODO_PATH;

  let myPlatform = platform();
  if (myPlatform === "win32") myPlatform = "windows";

  let myArch = arch();
  if (myArch === "x64") myArch = "amd64";

  const support = `${myPlatform}-${myArch}`;

  // console.log(`Looking for nonodo binary for: ${support}`);

  if (AVAILABLE_NONODE_ARCH.has(support)) {
    let filename = `nonodo-v${PACKAGE_NONODO_VERSION}-${support}`;
    if (platform() === "win32") filename += ".exe";

    const fullpath = path.join(nonodoPath, filename);

    // console.log(`Checking: ${fullpath}`);

    // Check if the file exists
    if (!fs.existsSync(fullpath)) {
      throw new Error(`No nonodo binary found: ${fullpath}`);
    }

    // Check if the file is accessible
    try {
      fs.accessSync(fullpath, fs.constants.F_OK);
    } catch (e) {
      throw new Error(`No access: ${fullpath}`);
    }

    return fullpath;
  }

  throw new Error(
    `Incompatible platform. Nonodo supports: ${[...AVAILABLE_NONODE_ARCH].join(", ")}`,
  );
}

function tryPackageNonodo() {
  console.log(`Running nonodo ${version} for ${arch()} ${platform()}`);

  try {
    const nonodoPath = getNonodoAvailable();
    runNonodo(nonodoPath);
    return true;
  } catch (e) {
    console.error(e);
  }

  return false;
}

tryPackageNonodo();
