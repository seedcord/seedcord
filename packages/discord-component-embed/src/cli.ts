#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { WriteStream } from 'node:tty';

import { runCheckCommand } from './checkCommand';

// a pipe gets color only when FORCE_COLOR is set
const colorDepth =
    process.stdout.isTTY || process.env.FORCE_COLOR !== undefined ? WriteStream.prototype.getColorDepth() : 1;

const { output, exitCode } = await runCheckCommand(process.argv.slice(2), {
    readFile: (path) => readFile(path, 'utf8'),
    fetch: (url, init) => fetch(url, init),
    colorDepth
});

process.stdout.write(output);
process.exitCode = exitCode;
