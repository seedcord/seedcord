import { CustomId, ModalRoute } from '@seedcord/core';
import { expectTypeOf } from 'vitest';

import { ModalHandler } from '#handlers/interaction/components';

import type { ModalSubmitFields } from 'discord.js';

const ProbeId = new CustomId('modalprobe').str('x');

@ModalRoute(ProbeId)
class CachedProbe extends ModalHandler<[typeof ProbeId]> {
    execute(): Promise<void> {
        expectTypeOf(this.fields).toEqualTypeOf<ModalSubmitFields<'cached'>>();
        return Promise.resolve();
    }
}

@ModalRoute(ProbeId)
class RawProbe extends ModalHandler<[typeof ProbeId], 'raw'> {
    execute(): Promise<void> {
        expectTypeOf(this.fields).toEqualTypeOf<ModalSubmitFields<'raw'>>();
        return Promise.resolve();
    }
}

export type Probes = [CachedProbe, RawProbe];
