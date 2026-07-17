import { Logger, paint } from '@seedcord/logger';
import { Envapter } from 'envapt';

import type { GateObserver } from './runGates';

// a check slower than this cuts into the 3s interaction-ack budget
const SLOW_GATE_MS = 750;

// lazy because the logger reads the environment, which binds after this module loads
let gateLogger: Logger | undefined;
function logger(): Logger {
    gateLogger ??= new Logger('Gates');
    return gateLogger;
}

function warnSlowGate(name: string, ms: number): void {
    if (ms < SLOW_GATE_MS) return;
    logger().warn(`gate ${paint.sky.bold(name)} took ${paint.amber(`${Math.round(ms)}ms`)}, against the 3s ack budget`);
}

// read per call, the environment binds after this module loads
export function slowGateObserver(): GateObserver | undefined {
    return Envapter.isProduction ? undefined : warnSlowGate;
}
