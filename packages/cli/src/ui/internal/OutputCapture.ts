import { LineBuffer } from './LineBuffer';

type WriteCallback = (error?: Error | null) => void;

export interface TuiCaptureHandlers {
    readonly onStdoutLine?: (line: string) => void;
    readonly onStderrLine?: (line: string) => void;
}

export interface TuiCaptureToggles {
    readonly stdout: boolean;
    readonly stderr: boolean;
}

type WriteMethod = (chunk: string | Uint8Array, encoding?: BufferEncoding, cb?: WriteCallback) => boolean;

function chunkToString(chunk: string | Uint8Array, encoding?: BufferEncoding): string {
    if (typeof chunk === 'string') return chunk;
    return Buffer.from(chunk).toString(encoding ?? 'utf8');
}

function normalizeWriteArgs(
    chunk: string | Uint8Array,
    encodingOrCb?: BufferEncoding | WriteCallback,
    cbMaybe?: WriteCallback
): { text: string; cb?: WriteCallback } {
    if (typeof encodingOrCb === 'function') {
        return { text: chunkToString(chunk), cb: encodingOrCb };
    }

    if (cbMaybe !== undefined) {
        return { text: chunkToString(chunk, encodingOrCb), cb: cbMaybe };
    }
    return { text: chunkToString(chunk, encodingOrCb) };
}

export class OutputCapture {
    private readonly stdoutBuffer = new LineBuffer();
    private readonly stderrBuffer = new LineBuffer();

    private stdoutOriginal: WriteMethod | null = null;
    private stderrOriginal: WriteMethod | null = null;

    private installed = false;

    public install(
        toggles: TuiCaptureToggles,
        handlers: TuiCaptureHandlers
    ): { stdoutRaw: WriteMethod; stderrRaw: WriteMethod } {
        if (this.installed) {
            const so = this.stdoutOriginal ?? process.stdout.write.bind(process.stdout);
            const se = this.stderrOriginal ?? process.stderr.write.bind(process.stderr);
            return { stdoutRaw: so, stderrRaw: se };
        }

        this.stdoutOriginal = process.stdout.write.bind(process.stdout);
        this.stderrOriginal = process.stderr.write.bind(process.stderr);

        const stdoutRaw = this.stdoutOriginal;
        const stderrRaw = this.stderrOriginal;

        if (toggles.stdout) {
            process.stdout.write = ((
                chunk: string | Uint8Array,
                encoding?: BufferEncoding | WriteCallback,
                cb?: WriteCallback
            ) => {
                const { text, cb: callback } = normalizeWriteArgs(chunk, encoding, cb);

                const lines = this.stdoutBuffer.push(text);
                for (const line of lines) handlers.onStdoutLine?.(line);

                callback?.(null);
                return true;
            }) as unknown as typeof process.stdout.write;
        }

        if (toggles.stderr) {
            process.stderr.write = ((
                chunk: string | Uint8Array,
                encoding?: BufferEncoding | WriteCallback,
                cb?: WriteCallback
            ) => {
                const { text, cb: callback } = normalizeWriteArgs(chunk, encoding, cb);

                const lines = this.stderrBuffer.push(text);
                for (const line of lines) handlers.onStderrLine?.(line);

                callback?.(null);
                return true;
            }) as unknown as typeof process.stderr.write;
        }

        this.installed = true;

        return { stdoutRaw, stderrRaw };
    }

    public uninstall(): void {
        if (!this.installed) return;

        if (this.stdoutOriginal) process.stdout.write = this.stdoutOriginal as unknown as typeof process.stdout.write;
        if (this.stderrOriginal) process.stderr.write = this.stderrOriginal as unknown as typeof process.stderr.write;

        this.stdoutOriginal = null;
        this.stderrOriginal = null;
        this.installed = false;

        this.stdoutBuffer.flush();
        this.stderrBuffer.flush();
    }
}
