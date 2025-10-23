import fs from 'node:fs/promises';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { fileURLToPath } from 'node:url';
import { inspect } from 'node:util';

import { resolveGeneratedDir } from './constants';
import { DocsEngine, type DocsEngineOptions } from './engine';
import { DEFAULT_SEARCH_TARGETS } from './search-targets';

import type { DocNode } from './types';

const HELP_TEXT = `Usage: tsx smoke.ts [options] [generated-root]

Options:
    --output <dir>    Directory to write search result samples (aliases: -o, -g)
    --help            Show this message and exit

Positional Arguments:
    generated-root    Optional directory containing the generated docs. If omitted,
                                        defaults to the directory resolved by resolveGeneratedDir().
`;

const DEFAULT_SAMPLES_DIR = path.resolve(fileURLToPath(new URL('.', import.meta.url)), '../samples');
const INITIAL_CWD = process.env.INIT_CWD ? path.resolve(process.env.INIT_CWD) : undefined;

interface SmokeOptions {
    generatedDir?: string;
    outputDir?: string;
    showHelp: boolean;
}

const FLAG_ALIASES: Record<string, string> = {
    '-o': '--output',
    '-g': '--output',
    '-h': '--help'
};

const resolvePath = (value: string): string => {
    if (path.isAbsolute(value)) {
        return path.normalize(value);
    }

    const base = INITIAL_CWD ?? process.cwd();
    return path.normalize(path.resolve(base, value));
};

const normalizeFlag = (value: string): string => FLAG_ALIASES[value] ?? value;
type FlagHandler = (value: string, options: SmokeOptions) => void;

const FLAG_HANDLERS = new Map<string, FlagHandler>([
    [
        '--output',
        (value, options) => {
            options.outputDir = resolvePath(value);
        }
    ]
]);

const assignPositional = (current: string | undefined, value: string): string => {
    if (current) {
        throw new Error('Too many positional arguments provided. Expected at most one.');
    }

    return value;
};

const parseArgs = (args: string[]): SmokeOptions => {
    const options: SmokeOptions = { showHelp: false };
    let positional: string | undefined;

    for (let index = 0; index < args.length; index += 1) {
        const raw = args[index];
        if (!raw) {
            throw new Error('Unexpected empty argument.');
        }

        const flag = normalizeFlag(raw);
        if (flag === '--help') {
            options.showHelp = true;
            return options;
        }

        const handler = FLAG_HANDLERS.get(flag);
        if (handler) {
            const value = args[index + 1];
            if (!value || value.startsWith('-')) {
                throw new Error(`Missing value for ${raw}`);
            }

            handler(value, options);
            index += 1;
            continue;
        }

        if (raw.startsWith('-')) {
            throw new Error(`Unknown argument: ${raw}`);
        }

        positional = assignPositional(positional, raw);
    }

    if (!options.generatedDir && positional) {
        options.generatedDir = resolvePath(positional);
    }

    return options;
};

const sanitizeFileSegment = (segment: string): string =>
    segment
        .trim()
        .replace(/[^a-z0-9]+/giu, '-')
        .replace(/^-+|-+$/gu, '')
        .toLowerCase();

type MissingStatus = 'no-results' | 'unresolved';

type SampleResult =
    | { status: 'written'; query: string; filePath: string; packageName?: string }
    | { status: MissingStatus; query: string; packageName?: string };

const ensureSegment = (value: string): string => {
    const segment = sanitizeFileSegment(value);
    return segment.length > 0 ? segment : 'entry';
};

const createSamplePath = (samplesDir: string, node: DocNode, query: string): string => {
    const label =
        typeof node.kindLabel === 'string' && node.kindLabel.length > 0 ? node.kindLabel : `kind-${node.kind}`;
    const kindSegment = ensureSegment(label);
    const nameSegment = ensureSegment(query);
    return path.join(samplesDir, `${kindSegment}-${nameSegment}.txt`);
};

const attemptCustomSearch = async (
    query: string,
    packageName: string | undefined,
    engine: DocsEngine,
    samplesDir: string
): Promise<SampleResult> => {
    const results = engine.search(query, packageName);
    if (results.length === 0) {
        if (packageName) {
            return { status: 'no-results', query, packageName };
        }

        return { status: 'no-results', query };
    }

    const target = results.find((entry) => entry.name === query) ?? results[0];
    if (!target) {
        if (packageName) {
            return { status: 'no-results', query, packageName };
        }

        return { status: 'no-results', query };
    }

    const node = engine.getNodeBySlug(target.packageName, target.slug);
    if (!node) {
        if (packageName) {
            return { status: 'unresolved', query, packageName };
        }

        return { status: 'unresolved', query };
    }

    const filePath = createSamplePath(samplesDir, node, query);
    const payload = inspect(node, { depth: 10, colors: false });
    await fs.writeFile(filePath, payload, 'utf8');

    if (packageName) {
        return { status: 'written', query, packageName, filePath };
    }

    return { status: 'written', query, filePath };
};

const formatScope = (packageName: string | undefined): string => packageName ?? 'all packages';

const formatRelative = (target: string): string => {
    const relative = path.relative(process.cwd(), target);
    return relative.length > 0 ? relative : '.';
};

type WrittenSampleResult = Extract<SampleResult, { status: 'written' }>;
type MissedSampleResult = Extract<SampleResult, { status: MissingStatus }>;

const summarizeResults = (
    results: SampleResult[]
): { written: WrittenSampleResult[]; missed: MissedSampleResult[] } => {
    const written: WrittenSampleResult[] = [];
    const missed: MissedSampleResult[] = [];

    for (const result of results) {
        if (result.status === 'written') {
            written.push(result);
        } else {
            missed.push(result);
        }
    }

    return { written, missed };
};

const runSmoke = async (parsed: SmokeOptions): Promise<void> => {
    const generatedRoot = parsed.generatedDir ?? resolveGeneratedDir();
    const samplesDir = parsed.outputDir ?? DEFAULT_SAMPLES_DIR;

    await fs.mkdir(samplesDir, { recursive: true });

    const start = performance.now();
    const engine = await DocsEngine.create({ generatedRoot } satisfies DocsEngineOptions);
    const packages = engine.listPackages();

    console.log(`Doc engine smoke: ${packages.length} package(s) loaded from ${formatRelative(generatedRoot)}.`);
    console.log(`Writing samples to ${formatRelative(samplesDir)}.`);

    const results: SampleResult[] = [];
    for (const target of DEFAULT_SEARCH_TARGETS) {
        results.push(await attemptCustomSearch(target.query, target.packageName, engine, samplesDir));
    }

    const { written, missed } = summarizeResults(results);

    for (const result of written) {
        console.log(`  ✓ ${result.query} (${formatScope(result.packageName)}) -> ${formatRelative(result.filePath)}`);
    }

    for (const result of missed) {
        const reason = result.status === 'no-results' ? 'no results' : 'node unresolved';
        console.log(`  ⚠ ${result.query} (${formatScope(result.packageName)}) -> ${reason}`);
    }

    const duration = Math.round(performance.now() - start);
    console.log(`Completed: ${written.length}/${results.length} samples in ${duration}ms.`);
};

const main = async (): Promise<void> => {
    const args = process.argv.slice(2);

    let parsed: SmokeOptions;
    try {
        parsed = parseArgs(args);
    } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`
Argument parsing error: ${message}`);
        process.exitCode = 1;
        return;
    }

    if (parsed.showHelp) {
        console.log(HELP_TEXT);
        return;
    }

    await runSmoke(parsed);
};

main().catch((error: unknown) => {
    console.error('\n❌ smoke.ts encountered an error:\n');
    console.error(error);
    process.exitCode = 1;
});
