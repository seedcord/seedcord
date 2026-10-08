import { API } from '@discordjs/core/http-only';
import { DispatchContext } from '@seedcord/core';
import { describe, expect, it } from 'vitest';

import { AutocompleteHandler } from '#handlers/interaction/AutocompleteHandler';
import { SlashHandler } from '#handlers/interaction/SlashHandler';
import { testCore } from '#tests/helpers/core';
import { nullPathConfig, VALID_TOKEN } from '#tests/helpers/fixtures';

import type { ValidInteractionTypes } from '#handlers/interactionTypes';
import type { Core } from '#interfaces/Core';

const dispatch = new DispatchContext('test:probe');

declare module '@seedcord/core' {
    interface SlashRegistry {
        apiprobe: { options: Record<never, never>; cache: 'cached' };
    }
}

class SlashProbe extends SlashHandler<'apiprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }

    public exposedApi(): API {
        return this.api;
    }
}

class AutocompleteProbe extends AutocompleteHandler<'apiprobe'> {
    async execute(): Promise<void> {
        await Promise.resolve();
    }

    public exposedApi(): API {
        return this.api;
    }
}

// justified: the probes construct with the payload and never read it
const payload = { type: 2, data: { type: 1, name: 'apiprobe' } } as unknown as ValidInteractionTypes;

function core(): Core {
    return testCore(nullPathConfig, VALID_TOKEN);
}

describe('handler api field', () => {
    it('constructs the typed api over the core rest client', () => {
        const shared = core();
        // justified: the probe ctor accepts the narrowed payload arm at runtime
        const handler = new SlashProbe(payload as never, shared, dispatch);

        expect(handler.exposedApi()).toBeInstanceOf(API);
    });

    it('caches one api per core across handlers', () => {
        const shared = core();
        // justified: the probe ctors accept the narrowed payload arms at runtime
        const slash = new SlashProbe(payload as never, shared, dispatch);
        const autocomplete = new AutocompleteProbe(payload as never, shared, dispatch);

        expect(slash.exposedApi()).toBe(autocomplete.exposedApi());
    });
});
