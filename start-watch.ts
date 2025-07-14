import { spawn } from 'child_process';
import { config } from 'dotenv';
import os from 'os';
import { LogService } from './src/core/services/LogService';

config({ path: '.env.development' });

const isMac = os.platform() === 'darwin';

const script = 'npm run dev:bot';
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
