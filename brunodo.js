#!/usr/bin/env node
const fs = require("fs");
const { spawn, spawnSync } = require("child_process");
const path = require("path");
const { arch, platform } = require("os");
const { version } = require("./package.json");

const PACKAGE_NONODO_PATH = path.join(__dirname, "nonodo");

function runNonodo(location) {
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

function tryPackageNonodo() {
    console.log(`Running nonodo ${version} for ${arch()} ${platform()}`)
    let nonodoPath = PACKAGE_NONODO_PATH
    if (arch() === 'arm64' && platform() === 'darwin') {
        nonodoPath = path.join(__dirname, 'nonodo-arm64-darwin')
    }
    //   if (arch() !== "x64" || platform() !== "linux") {
    //     console.error(`Only x86_64 / Linux distributed in NPM package right now.`);
    //     return false;
    //   }

    runNonodo(nonodoPath);
    return true;
}

tryPackageNonodo()