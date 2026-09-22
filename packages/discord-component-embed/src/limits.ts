import { ComponentEmbedError } from './ComponentEmbedError';

import type { Collector } from './collector';
import type {
    APIComponentInContainer,
    APIComponentInMessageActionRow,
    APIContainerComponent
} from 'discord-api-types/v10';

// from the component embed docs
export const MAX_COMPONENTS = 40;
// the docs leave this out. on discord's crawler 10 items render and 11 show the Open Graph card, however the galleries split them
export const MAX_ITEMS_ACROSS_GALLERIES = 10;
// discord counts the bytes it receives, escapes included
export const MAX_JSON_BYTES = 3000;

export function checkEmbedLimits(component: APIContainerComponent, json: string, collector: Collector): void {
    const checks = [
        () => checkComponentCount(component),
        () => checkGalleryItemCount(component),
        () => checkJsonSize(json)
    ];
    collector.map(checks, (check) => check());
}

function checkComponentCount(component: APIContainerComponent): void {
    const count = countComponents(component);
    if (count > MAX_COMPONENTS) {
        throw new ComponentEmbedError(
            'OverLimit',
            `This component embed has ${String(count)} components. Discord allows ${String(MAX_COMPONENTS)}, and the <Container>, buttons, and thumbnails all count toward that. Gallery items don't. Merge neighboring <TextDisplay>s into one, or remove some components.`
        );
    }
}

export function embedStats(component: APIContainerComponent): { components: number; galleryItems: number } {
    return { components: countComponents(component), galleryItems: sum(itemsPerGallery(component)) };
}

function itemsPerGallery({ components }: APIContainerComponent): number[] {
    return components.flatMap((child) => ('items' in child ? [child.items.length] : []));
}

function sum(counts: readonly number[]): number {
    return counts.reduce((total, count) => total + count, 0);
}

function checkGalleryItemCount(component: APIContainerComponent): void {
    const perGallery = itemsPerGallery(component);
    const total = sum(perGallery);
    if (total > MAX_ITEMS_ACROSS_GALLERIES) {
        throw new ComponentEmbedError(
            'OverLimit',
            `The galleries in this component embed hold ${String(total)} items (${perGallery.join(' + ')}). Discord allows ${String(MAX_ITEMS_ACROSS_GALLERIES)} across all of them. Remove some, or show them as <Section> thumbnails, which don't count toward the ${String(MAX_ITEMS_ACROSS_GALLERIES)}.`
        );
    }
}

function checkJsonSize(json: string): void {
    const bytes = new TextEncoder().encode(json).byteLength;
    if (bytes > MAX_JSON_BYTES) {
        throw new ComponentEmbedError(
            'OverLimit',
            `This component embed's JSON is ${String(bytes)} bytes, over Discord's limit of ${String(MAX_JSON_BYTES)}. Shorten its text or its URLs.`
        );
    }
}

type Counted = APIContainerComponent | APIComponentInContainer | APIComponentInMessageActionRow;

function countComponents(component: Counted): number {
    const nested =
        'components' in component ? component.components.reduce((sum, child) => sum + countComponents(child), 0) : 0;
    const accessory = 'accessory' in component ? 1 : 0;
    return 1 + nested + accessory;
}
