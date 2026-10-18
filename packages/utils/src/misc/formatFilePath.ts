import { displayPath } from '@seedcord/errors/internal';

/**
 * Options for formatting file paths.
 */
export interface FormatFileOptions {
    /**
     * Whether to return only the directory part of the path.
     *
     * @defaultValue `false`
     */
    onlyDir?: boolean;
    /**
     * A prefix to prepend to the formatted path.
     *
     * @defaultValue `'./'`
     */
    prefix?: string;
}

/**
 * Formats a file path relative to the current working directory, with forward slashes on every OS.
 *
 * It returns the full path when the path is outside the working directory or the runtime has no `process`.
 *
 * @example
 * ```ts
 * // cwd is /repo
 * formatFilePath('/repo/src/Bot.ts'); // './src/Bot.ts'
 * formatFilePath('/repo/src/Bot.ts', { onlyDir: true }); // './src'
 * formatFilePath('/repo/src/Bot.ts', { prefix: '' }); // 'src/Bot.ts'
 * ```
 */
export function formatFilePath(filePath: string, options: FormatFileOptions = {}): string {
    const { onlyDir = false, prefix = './' } = options;

    const target = onlyDir ? filePath.replace(/[/\\][^/\\]*$/u, '') : filePath;
    return displayPath(target, { prefix });
}
