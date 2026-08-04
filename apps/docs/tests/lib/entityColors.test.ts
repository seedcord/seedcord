import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { ENTITY_TONE_HEX, FOREGROUND_HEX } from '@lib/entityColors';

const docsTokens = readFileSync(join(import.meta.dirname, '../../src/styles/tokens.css'), 'utf8');
const uiTokens = readFileSync(join(import.meta.dirname, '../../../../tooling/ui/src/styles/tokens.css'), 'utf8');

describe('entity colors mirror token files', () => {
    it.each(Object.entries(ENTITY_TONE_HEX))('%s matches the docs token in both themes', (tone, hex) => {
        expect(docsTokens).toContain(`--entity-${tone}: ${hex.light};`);
        expect(docsTokens).toContain(`--entity-${tone}: ${hex.dark};`);
    });

    it('foreground matches the shared UI text token in both themes', () => {
        expect(uiTokens).toContain(`--color-text: ${FOREGROUND_HEX.light};`);
        expect(uiTokens).toContain(`--color-text: ${FOREGROUND_HEX.dark};`);
    });
});
