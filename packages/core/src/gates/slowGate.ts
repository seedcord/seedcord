import { Logger, paint } from '@seedcord/logger';
import { Envapter } from 'envapt';

import type { GateObserver } from './runGates';

// combined check time slower than this cuts into the 3s interaction-ack budget
const SLOW_GATE_MS = 750;

// lazy because the logger reads the environment, which binds after this module loads
let gateLogger: Logger | undefined;
function logger(): Logger {
    gateLogger ??= new Logger('Gates');
    return gateLogger;
}

/**
 * Collects each gate check's elapsed time for one dispatch. `report` warns once when the checks sum
 * past the threshold, naming the total, the route, and each gate's share.
 */
export interface SlowGateMonitor {
    readonly observe: GateObserver;
    report(routeId: string | null): void;
}

// undefined in production, so timedCheck skips the clock there. read per call, the environment binds late
export function slowGateMonitor(): SlowGateMonitor | undefined {
    if (Envapter.isProduction) return undefined;
    const readings: { name: string; ms: number }[] = [];
    return {
        observe: (name, ms) => readings.push({ name, ms }),
        report(routeId) {
            const total = readings.reduce((sum, reading) => sum + reading.ms, 0);
            if (total < SLOW_GATE_MS) return;
            const shares = readings
                .toSorted((a, b) => b.ms - a.ms)
                .map((reading) => `${paint.sky.bold(reading.name)} ${Math.round(reading.ms)}ms`);
            const route = routeId === null ? '' : ` for ${paint.sky.bold(routeId)}`;
            const headline = `gates${route} took ${paint.amber(`${Math.round(total)}ms`)} of the 3s ack budget`;
            logger().utils.block(headline, shares, 'warn', (text) => text);
        }
    };
}
