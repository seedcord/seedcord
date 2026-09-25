import { describe, expect, it } from 'vitest';

import { DocsPage, entityCard, packageCard } from '#lib/docs/DocsPage';

import type { EntityModel, PackageCatalogEntry, PackageVersionCatalog } from '#lib/docs/types';

// each fixture carries only the fields DocsPage reads
const VERSION = { id: '0.13.0', label: '0.13.0' } as unknown as PackageVersionCatalog;
const ENTRY = {
    id: 'types',
    manifestName: '@seedcord/types',
    label: '@seedcord/types',
    description: 'Shared types.'
} as unknown as PackageCatalogEntry;

function entity(name: string, summary: string): EntityModel {
    return {
        name,
        kind: 'class',
        manifestPackage: '@seedcord/core',
        displayPackage: '@seedcord/core',
        summary: summary ? [{ plain: summary, html: summary }] : []
    } as unknown as EntityModel;
}

const ENTITY_PATH = '/packages/core/0.13.0/classes/logger';

describe('DocsPage.metadata', () => {
    it('advertises the Markdown mirror as a text/markdown alternate', () => {
        const meta = DocsPage.forPackage(ENTRY, VERSION).metadata();
        expect(meta.alternates?.types?.['text/markdown']).toContain('/packages/types/0.13.0.md');
    });

    it('points a package overview at its latest url, whichever version rendered it', () => {
        const meta = DocsPage.forPackage(ENTRY, VERSION).metadata();
        expect(meta.alternates?.canonical).toBe('https://docs.seedcord.org/packages/types/latest');
    });

    it('puts the package name in an entity title', () => {
        const meta = DocsPage.forEntity(ENTITY_PATH, entity('Logger', 'x'), VERSION, ENTITY_PATH).metadata();
        expect(meta.title).toEqual({ absolute: 'Logger · @seedcord/core' });
        expect(meta.openGraph?.title).toBe('Logger · @seedcord/core');
    });

    it('titles a package overview with its full package name', () => {
        expect(DocsPage.forPackage(ENTRY, VERSION).metadata().title).toEqual({ absolute: '@seedcord/types 0.13.0' });
    });

    it('adds the site name to a title that does not carry it', () => {
        const entry = { ...ENTRY, id: 'discord-component-embed', manifestName: 'discord-component-embed' };
        expect(DocsPage.forPackage(entry, VERSION).metadata().title).toEqual({
            absolute: 'discord-component-embed 0.13.0 · seedcord'
        });
    });

    it('decides the site name from the package, whatever the symbol is called', () => {
        const embed = { ...entity('seedcordPreview', 'x'), manifestPackage: 'discord-component-embed' };
        const meta = DocsPage.forEntity(ENTITY_PATH, embed, VERSION, ENTITY_PATH).metadata();

        expect(meta.title).toEqual({ absolute: 'seedcordPreview · discord-component-embed · seedcord' });
    });

    it('collapses TSDoc newlines so the meta description is a single line', () => {
        const summary = 'Base class for a modal submit handler.\n\nRegister the customId definitions,\nthen read it.';
        const meta = DocsPage.forEntity(ENTITY_PATH, entity('ModalHandler', summary), VERSION, ENTITY_PATH).metadata();
        expect(meta.description).not.toMatch(/\n/);
        expect(meta.openGraph?.description).not.toMatch(/\n/);
        expect(meta.twitter?.description).not.toMatch(/\n/);
    });

    it('strips markdown links and code spans from the meta description', () => {
        const summary = 'Routes to a [`ContextMenuHandler`](/packages/seedcord/0.14.0/classes/x). Pass `Type.User`.';
        const meta = DocsPage.forEntity(
            ENTITY_PATH,
            entity('ContextMenuRoute', summary),
            VERSION,
            undefined
        ).metadata();
        expect(meta.description).not.toContain('`');
        expect(meta.description).not.toContain('[');
        expect(meta.description).not.toContain('/packages/seedcord/0.14.0/classes/x');
        expect(meta.description).toContain('ContextMenuHandler');
        expect(meta.description).toContain('Type.User');
    });

    it('builds the image alt from the name the card draws', () => {
        const meta = DocsPage.forPackage(ENTRY, VERSION).metadata();
        const images = meta.openGraph?.images as { alt: string }[];
        expect(images[0]?.alt).toBe('A seedcord card reading @seedcord/types, labelled package, 0.13.0');
    });

    it('drops a page from the index once the latest version has no canonical for it', () => {
        const meta = DocsPage.forEntity(ENTITY_PATH, entity('Gone', 'x'), VERSION, undefined).metadata();
        expect(meta.robots).toEqual({ index: false, follow: true });
    });

    it('sets no robots rule on a page that still has a canonical', () => {
        const meta = DocsPage.forEntity(ENTITY_PATH, entity('Here', 'x'), VERSION, ENTITY_PATH).metadata();
        expect(meta.robots).toBeUndefined();
    });

    it('points an older page at its twin in the latest version', () => {
        const latest = '/packages/core/0.14.0/classes/logger';
        const meta = DocsPage.forEntity(ENTITY_PATH, entity('Logger', 'x'), VERSION, latest).metadata();
        expect(meta.alternates?.canonical).toContain(latest);
    });
});

describe('the card each page kind draws', () => {
    it('keeps the version off a package card name and in its badges', () => {
        const card = packageCard(ENTRY, VERSION);
        expect(card.name).toBe('@seedcord/types');
        expect(card.meta).toEqual(['0.13.0']);
    });

    it('falls back to naming the symbol when it carries no summary', () => {
        expect(entityCard(entity('Logger', ''), VERSION).description).toBe('Logger, a class in @seedcord/core.');
    });

    it('draws the same description the head sends', () => {
        const page = DocsPage.forEntity(ENTITY_PATH, entity('Logger', ''), VERSION, ENTITY_PATH);
        expect(page.metadata().description).toBe(page.card.description);
    });
});
