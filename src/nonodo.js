#!/usr/bin/env node
const { existsSync, createReadStream, writeFileSync } = require("node:fs");
const { Buffer } = require("node:buffer")
const { URL } = require("node:url");
const { spawn } = require("node:child_process");
const path = require("node:path");
const { arch, platform, tmpdir } = require("node:os");
const { version } = require("../package.json");
const { createHash } = require("node:crypto");
const { get: request } = require("node:https");
// const { unzip, gunzip } = require("node:zlib");

const PACKAGE_NONODO_VERSION = process.env.PACKAGE_NONODO_VERSION ?? "0.1.0";
const PACKAGE_NONODO_URL = new URL(
  process.env.PACKAGE_NONODO_URL ??
  `https://github.com/gligneul/nonodo/releases/download/v${PACKAGE_NONODO_VERSION}/`
);
const PACKAGE_NONODO_DIR = process.env.PACKAGE_NONODO_DIR ?? tmpdir();

const HASH_ALGO = "md5";

const AVAILABLE_BINARY_NAME = new Set([
  "darwin-amd64",
  "darwin-arm64",
  "linux-amd64",
  "linux-arm64",
  "windows-amd64",
])

function getPlatform() {
  const plat = platform();
  if (plat === "win32") return "windows";
  else return plat;
}

function getArch() {
  const arc = arch();
  if (arc === "x64") return "amd64";
  else return arc;
}


function getReleaseName() {
  const arcName = getArch();
  const platformName = getPlatform();
  const exe = platform() === "win32" ? ".zip" : ".tar.gz";
  return `nonodo-v${PACKAGE_NONODO_VERSION}-${platformName}-${arcName}${exe}`;
}

function getBinaryName() {
  const arcName = getArch();
  const platformName = getPlatform();
  const exe = platform() === "win32" ? ".exe" : "";
  return `nonodo-v${PACKAGE_NONODO_VERSION}-${platformName}-${arcName}${exe}`;
}

const releaseName = getReleaseName();
const binaryName = getBinaryName();
const asyncController = new AbortController();

function calculateHash(content, algorithm) {
  return new Promise((resolve, reject) => {
    const hash = createHash(algorithm);
    hash.update(content);
    const hex = hash.digest("hex");
    resolve(hex);
  });
}

async function extractFileFromTarball(tarballBuffer, filepath) {
  let offset = 0;
  while (offset < tarballBuffer.length) {
    const header = tarballBuffer.slice(offset, offset + 512);

    const fileName = header.toString('utf-8', 0, 100).replace(/\0.*/g, '')
    const fileSize = parseInt(header.toString('utf-8', 124, 136).replace(/\0.*/g, ''), 8)

    if (fileName === filepath) {
      return tarballBuffer.subarray(offset, offset + fileSize)
    }

    // Clamp offset to the uppoer multiple of 512
    offset = (offset + fileSize + 511) & ~511
  }
}

async function downloadBinary() {
  const dir = PACKAGE_NONODO_DIR;
  const url = new URL(PACKAGE_NONODO_URL);
  if (!url.href.endsWith("/")) url.pathname += "/";
  url.pathname += releaseName;

  console.log(`Downloading: ${url.href}`);

  const dest = path.join(dir, releaseName);

  const binary = await makeRequest(url);

  writeFileSync(dest, binary, {
    signal: asyncController.signal,
  });

  const tarballBuffer = unzipSync(binary);

  return binary;
}

async function downloadHash() {
  const algo = HASH_ALGO;
  const filename = `${releaseName}.${algo}`;

  const dir = PACKAGE_NONODO_DIR;
  const url = new URL(PACKAGE_NONODO_URL);
  if (!url.href.endsWith("/")) url.pathname += "/";
  url.pathname += filename;

  console.log(`Downloading: ${url.href}`);

  const dest = path.join(dir, filename);

  const response = await makeRequest(url);
  const body = response.toString("utf-8");

  writeFileSync(dest, body, {
    signal: asyncController.signal,
  });

  console.log(`Downloaded hex: ${dest}`);

  return body.trim();
}

/**
 *
 * @param {URL} url
 * @returns {Promise<Buffer>}
 */
function makeRequest(url) {
  console.log("makeRequest", url.href);

  return new Promise((resolve, reject) => {
    const req = request(url, (res) => {
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const length = parseInt(res.headers["content-length"], 10);
        const chunks = []
        let size = 0;

        res.on("data", (chunk) => {
          console.log(`progress ${url.pathname}`, size, "/", length, "bytes");
          chunks.push(chunk);
          if (chunk?.length) {
            size += chunk.length;
          } else {
            size++;
          }
        });

        res.on("end", () => {
          resolve(Buffer.concat(chunks));
        });
      } else if (res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
        makeRequest(new URL(res.headers.location)).then(resolve).catch(reject);
      } else {
        reject(new Error(`Error ${res.statusCode} when downloading the package!`));
      }
    });

    req.on("error", (e) => {
      reject(e);
    });

    asyncController.signal.addEventListener("abort", () => {
      req.destroy();
      reject(new Error("Request aborted."));
    });
  });

}

async function runNonodo(location) {
  console.log(`Running nonodo binary: ${location}`);

  const args = process.argv.slice(2);
  const nonodoBin = spawn(location, args, { stdio: "inherit" });
  nonodoBin.on("exit", (code, signal) => {
    process.on("exit", () => {
      if (signal) {
        process.kill(process.pid, signal);
      } else {
        process.exit(code ?? 1);
      }
    });
  });

  process.on("SIGINT", function () {
    nonodoBin.kill("SIGINT");
    nonodoBin.kill("SIGTERM");
  });
}

async function getNonodoAvailable() {
  const nonodoPath = PACKAGE_NONODO_DIR;

  const myPlatform = getPlatform();
  const myArch = getArch();
  const support = `${myPlatform}-${myArch}`;

  if (AVAILABLE_BINARY_NAME.has(support)) {
    const fullpath = path.join(nonodoPath, binaryName);

    if (existsSync(fullpath)) return fullpath;

    console.log(`Nonodo binary not found: ${fullpath}`);
    console.log(`Downloading nonodo binary...`);
    const [binary, hash] = await Promise.all([downloadBinary(), downloadHash()]);
    const calculatedHash = await calculateHash(binary, HASH_ALGO);

    if (hash !== calculatedHash) {
      throw new Error(`Hash mismatch for nonodo binary. Expected ${hash}, got ${calculatedHash}`);
    }

    console.log(`Downloaded nonodo binary.`);

    return fullpath;
  }

  throw new Error(`Incompatible platform.`);
}

async function tryPackageNonodo() {
  console.log(`Running nonodo ${version} for ${arch()} ${platform()}`);

  try {
    process.once("SIGINT", () => asyncController.abort());
    const nonodoPath = await getNonodoAvailable();
    console.log("nonodo path:", nonodoPath);
    await runNonodo(nonodoPath);
    return true;
  } catch (e) {
    console.error(e);
  }

  return false;
}

tryPackageNonodo()
  .then((success) => {
    if (!success) {
      process.exit(1);
    }
  })
  .catch((e) => {
    console.error(e);
    process.exit(1);
  });
