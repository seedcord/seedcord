import { expectTypeOf } from 'vitest';

import { Plugin } from '#src/plugin/Plugin';

import type { Generated } from '#src/plugin/Generated';

abstract class Probe extends Plugin {
    public init(): Promise<void> {
        return Promise.resolve();
    }
}

class NotGenerated extends Probe {
    public static readonly id = 'probe-not-generated';
    public override codegen(): Promise<{ names: Record<string, true> }> {
        return Promise.resolve({ names: {} });
    }
}

class Generates extends Probe {
    public static readonly id = 'probe-generates';
    public override codegen(): Promise<{ names: Record<string, true> }> {
        return Promise.resolve({ names: {} });
    }
}

class WideId extends Probe {
    public static id = 'probe-wide-id';
    public override codegen(): Promise<{ names: Record<string, true> }> {
        return Promise.resolve({ names: {} });
    }
}

class NoId extends Probe {
    public override codegen(): Promise<{ names: Record<string, true> }> {
        return Promise.resolve({ names: {} });
    }
}

declare module '#src/plugin/Generated' {
    interface PluginTypes {
        'probe-generates': { names: { DailyDigest: true; Heartbeat: true } };
    }
}

expectTypeOf<Generated<typeof NotGenerated>>().toEqualTypeOf<{ names: Record<string, true> }>();
expectTypeOf<keyof Generated<typeof Generates>['names']>().toEqualTypeOf<'DailyDigest' | 'Heartbeat'>();
expectTypeOf<Generated<typeof WideId>['names']>().toExtend<`${string}static readonly id${string}`>();
// @ts-expect-error a class without a static id
expectTypeOf<Generated<typeof NoId>>();

void NotGenerated;
void Generates;
void WideId;
void NoId;
