import { cpus, totalmem } from 'node:os';
import process from 'node:process';

import { Envapter } from 'envapt';

const enabled = Envapter.getBoolean('SEEDCORD_DEV_PROFILE', false);

const MEDIAN = 0.5;
const NEAR_WORST = 0.99;
const BYTES_PER_MB = 1024 * 1024;
const PERCENT = 100;
const MS_PER_SECOND = 1000;

// each one is the elapsed time when that startup step finished
const PHASES = ['config', 'vite', 'entry', 'ready'] as const;
type Phase = (typeof PHASES)[number];

const marks = new Map<Phase, number>();
const renderTimes: number[] = [];
let wrapCalls = 0;
let wrapTotal = 0;
let writes = 0;
let written = 0;
let writeTotal = 0;
let framesAtReady = 0;

export function profileMark(phase: Phase): void {
    if (!enabled) return;

    // performance.now() counts from process start
    marks.set(phase, performance.now());

    // everything after the bot is up is the idle cost
    if (phase === 'ready') framesAtReady = renderTimes.length;
}

export function profileFrame(renderTime: number): void {
    if (enabled) renderTimes.push(renderTime);
}

// ink's renderTime brackets its own layout only
export function profileWrap<Rows>(build: () => Rows): Rows {
    if (!enabled) return build();

    const started = performance.now();
    const rows = build();
    wrapTotal += performance.now() - started;
    wrapCalls++;

    return rows;
}

// conhost is far slower at bulk writes than a mac terminal
export function profileStdout(): void {
    if (!enabled) return;

    const original = process.stdout.write.bind(process.stdout);

    process.stdout.write = (chunk: string | Uint8Array, ...rest: never[]) => {
        writes++;
        written += typeof chunk === 'string' ? Buffer.byteLength(chunk) : chunk.byteLength;

        const started = performance.now();
        const flushed = original(chunk, ...rest);
        writeTotal += performance.now() - started;

        return flushed;
    };
}

function at(sorted: readonly number[], fraction: number): number {
    return sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * fraction))] ?? 0;
}

function ms(value: number): string {
    return `${value.toFixed(1)} ms`;
}

function machine(): string[] {
    const cores = cpus();
    const gb = (totalmem() / BYTES_PER_MB / 1024).toFixed(1);
    const terminal = process.env.WT_SESSION ? 'windows terminal' : (process.env.TERM_PROGRAM ?? 'unknown');

    return [
        `  node         ${process.version} on ${process.platform} ${process.arch}`,
        `  cpu          ${cores[0]?.model ?? 'unknown'} x${String(cores.length)}, ${gb} GB`,
        `  terminal     ${terminal}, TERM=${process.env.TERM ?? 'unset'}, ${String(process.stdout.columns)}x${String(process.stdout.rows)}`
    ];
}

function startup(): string[] {
    const ready = marks.get('ready');
    if (ready === undefined) return ['  startup      never reached ready'];

    const lines = [`  startup      ${ms(ready)}`];
    let previous = 0;

    for (const phase of PHASES) {
        const at = marks.get(phase);
        if (at === undefined) continue;

        lines.push(`    ${phase.padEnd(10)} ${ms(at - previous)}`);
        previous = at;
    }

    return lines;
}

export function profileReport(): string | null {
    if (!enabled) return null;

    const session = performance.now();
    const sorted = renderTimes.toSorted((a, b) => a - b);
    const layoutTotal = renderTimes.reduce((sum, time) => sum + time, 0);
    const mb = (written / BYTES_PER_MB).toFixed(2);
    const share = (part: number): string => `${((part / session) * PERCENT).toFixed(1)}% of session`;

    const ready = marks.get('ready') ?? session;
    const idleFrames = renderTimes.length - framesAtReady;
    const idleSeconds = (session - ready) / MS_PER_SECOND;
    const idleRate = idleSeconds > 0 ? (idleFrames / idleSeconds).toFixed(1) : '0.0';

    return [
        'seedcord dev profile',
        ...machine(),
        `  session      ${ms(session)}`,
        ...startup(),
        `  frames       ${String(renderTimes.length)}`,
        `  idle         ${String(idleFrames)} frames over ${idleSeconds.toFixed(1)}s = ${idleRate} fps`,
        `  layout       p50 ${ms(at(sorted, MEDIAN))}, p99 ${ms(at(sorted, NEAR_WORST))}, total ${ms(layoutTotal)}, ${share(layoutTotal)}`,
        `  stdout       ${mb} MB over ${String(writes)} writes, ${ms(writeTotal)}, ${share(writeTotal)}`,
        `  log wrap     ${ms(wrapTotal)} over ${String(wrapCalls)} builds, ${share(wrapTotal)}`
    ].join('\n');
}
