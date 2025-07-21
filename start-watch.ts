import { spawn } from 'child_process';
import os from 'os';

import { config } from 'dotenv';

import { LogService } from './src/core/services/LogService';

config({ path: '.env' });

const isMac = os.platform() === 'darwin';

const script = 'pnpm run dev:bot';
const args: string[] = isMac ? [] : ['--legacy-watch'];

const nodemonProcess = spawn(script, args, {
  stdio: 'inherit',
  shell: true
});

nodemonProcess.on('error', (error) => {
  LogService.Error('start-watch', `Error | ${error.message}`);
});

nodemonProcess.on('close', (code) => {
  LogService.Info('start-watch', `nodemon process exited with code ${code}`);
});
