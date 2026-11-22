import { stripVTControlCharacters } from 'node:util';

import { vi } from 'vite-plus/test';

interface CapturedOutput extends Disposable {
    stdout(): string;
    stderr(): string;
}

// disposing also resets process.exitCode
export function captureOutput(): CapturedOutput {
    const capture = (stream: NodeJS.WriteStream): { text: () => string; restore: () => void } => {
        const chunks: string[] = [];
        const spy = vi.spyOn(stream, 'write').mockImplementation((chunk: string | Uint8Array) => {
            chunks.push(String(chunk));
            return true;
        });
        return { text: () => stripVTControlCharacters(chunks.join('')), restore: () => spy.mockRestore() };
    };
    const stdout = capture(process.stdout);
    const stderr = capture(process.stderr);

    return {
        stdout: stdout.text,
        stderr: stderr.text,
        [Symbol.dispose]: () => {
            stdout.restore();
            stderr.restore();
            process.exitCode = undefined;
        }
    };
}
