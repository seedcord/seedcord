import { describe, expect, it } from 'vitest';

import changelog from '#src/release/changelog';

describe('changelog module', () => {
    it('throws naming the missing repo option', () => {
        expect(() => changelog.getReleaseLine({ summary: 'A thing changed.' }, 'patch', null)).toThrow(/repo/);
    });

    it('renders a changeset with no commit without asking git or github', async () => {
        const line = await changelog.getReleaseLine({ summary: 'A thing changed.' }, 'patch', {
            repo: 'seedcord/seedcord'
        });

        expect(line).toBe('- A thing changed.');
    });
});
