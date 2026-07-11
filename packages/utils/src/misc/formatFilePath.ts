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
 * Formats a file path relative to the current working directory.
 *
 * A path outside the working directory, or any path on a runtime without `process`, is returned unchanged.
 *
 * @param filePath - The file path to format.
 * @param options - Formatting options.
 * @returns The formatted file path.
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
    // guarded global read keeps this off node:path, on workerd there is no cwd to relativize against
    const cwd = typeof process !== 'undefined' && typeof process.cwd === 'function' ? process.cwd() : '';
    // the boundary check keeps a sibling dir sharing the prefix (repo-extra vs repo) out
    const boundary = target[cwd.length];
    if (cwd && target.startsWith(cwd) && (boundary === undefined || boundary === '/' || boundary === '\\')) {
        return `${prefix}${target.slice(cwd.length).replace(/^[/\\]+/u, '')}`;
    }
    return target;
}
