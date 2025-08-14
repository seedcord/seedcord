import { spawn } from 'child_process';
import os from 'os';

import { Logger } from 'seedcord';

const isMac = os.platform() === 'darwin';

const script = 'pnpm run dev:bot';
const args: string[] = isMac ? [] : ['--legacy-watch'];

const nodemonProcess = spawn(script, args, {
  stdio: 'inherit',
  shell: true
});

nodemonProcess.on('error', (error) => {
  Logger.Error('start-watch', `Error | ${error.message}`);
});

nodemonProcess.on('close', (code) => {
  Logger.Info('start-watch', `nodemon process exited with code ${code}`);
});
