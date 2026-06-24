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

    it('collapses TSDoc newlines so the meta description is a single line', () => {
        const meta = pageMetadata({
            title: 'ModalHandler',
            description:
                'Base class for a modal submit handler.\n\nRegister the customId definitions, then read `this.params`\nfor a single route.',
            path: '/packages/seedcord/1.0.0/classes/modal-handler'
        });
        expect(meta.description).not.toMatch(/\n/);
        expect(meta.openGraph?.description).not.toMatch(/\n/);
        expect(meta.twitter?.description).not.toMatch(/\n/);
    });

    it('uses "seedcord documentation" as the OpenGraph site name', () => {
        const meta = pageMetadata({ title: 'X', description: 'y', path: '/packages/seedcord/1.0.0' });
        expect(meta.openGraph?.siteName).toBe('seedcord documentation');
    });
});
