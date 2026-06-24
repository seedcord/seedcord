import { describe, expect, it } from 'vitest';

import { pageMetadata } from '@lib/site';

describe('pageMetadata', () => {
    it('advertises the Markdown mirror as a text/markdown alternate when markdownPath is given', () => {
        const meta = pageMetadata({
            title: 'Seedcord',
            description: 'The core orchestrator.',
            path: '/packages/seedcord/1.0.0/classes/seedcord',
            markdownPath: '/llms/packages/seedcord/1.0.0/classes/seedcord'
        });
        expect(meta.alternates?.types?.['text/markdown']).toContain('/llms/packages/seedcord/1.0.0/classes/seedcord');
    });

    it('omits the markdown alternate when no markdownPath is given', () => {
        const meta = pageMetadata({ title: 'Seedcord', description: 'x', path: '/packages/seedcord/1.0.0' });
        expect(meta.alternates?.types).toBeUndefined();
    });
});
