#!/usr/bin/env node

import { spawn } from "node:child_process";
import path from "node:path";
import process from "node:process";
import { fileURLToPath } from "node:url";

function main(): void {
  const currentFile = fileURLToPath(import.meta.url);
  const cliEntry = path.resolve(path.dirname(currentFile), "../../../scripts/run-node.mjs");

  const rawArgs = process.argv.slice(2);
  const mappedArgs =
    rawArgs.length > 0 && rawArgs[0] === "run" ? ["onboard", ...rawArgs.slice(1)] : rawArgs;

  const child = spawn(process.execPath, [cliEntry, ...mappedArgs], {
    stdio: "inherit",
    env: process.env,
  });

  child.on("exit", (code, signal) => {
    if (signal) {
      process.kill(process.pid, signal);
      return;
    }
    process.exit(code ?? 1);
  });

  child.on("error", (error) => {
    console.error(`[clawgtm] Failed to launch CLI: ${String(error)}`);
    process.exit(1);
  });
}

main();
