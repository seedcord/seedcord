import { readFile } from 'node:fs/promises';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

import { isTimezone } from '#src/schedule';

const source = path.resolve(import.meta.dirname, '../../src/types/Timezone.ts');

// the list is a type, so the only way to compare it with the runtime is through its text
async function listedZones(): Promise<Set<string>> {
    const text = await readFile(source, 'utf8');
    const union = text.slice(text.indexOf('export type IanaTimezone'), text.indexOf('export type Timezone<'));
    const quoted = union.match(/'[^']+'/g) ?? [];
    return new Set(quoted.map((zone) => zone.slice(1, -1)));
}

describe('IanaTimezone', () => {
    it('lists every zone this Node supports', async () => {
        const listed = await listedZones();
        const missing = Intl.supportedValuesOf('timeZone').filter((zone) => !listed.has(zone));

        expect(missing).toEqual([]);
    });

    it('lists only zones this Node supports', async () => {
        const listed = await listedZones();
        const unknown = [...listed].filter((zone) => !isTimezone(zone));

        expect(unknown).toEqual([]);
    });
});
