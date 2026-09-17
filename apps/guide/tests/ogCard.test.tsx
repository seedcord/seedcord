// @vitest-environment node
import { OgPageCard } from '@seedcord/ui/OgCard';
import { loadOgFonts, OG_SIZE } from '@seedcord/ui/og';
import { BRAND } from '@seedcord/ui/palette';
import { ImageResponse } from 'next/og';
import { describe, expect, it } from 'vitest';

// a lone no-break space takes one line of height and draws nothing
const BLANK_LINE = ' ';

const fonts = loadOgFonts();

async function cardWithDescription(description: string): Promise<Buffer> {
    const response = new ImageResponse(
        <OgPageCard
            pill="commands"
            accent={BRAND.seedDark}
            meta={[]}
            name="Commands"
            description={description}
            domain="guide.seedcord.org"
        />,
        { ...OG_SIZE, fonts }
    );
    return Buffer.from(await response.arrayBuffer());
}

describe('og cards', () => {
    it.each(['builder', 'constructor', 'toString', 'valueOf', 'hasOwnProperty'])(
        'draws %s in the description',
        async (word) => {
            const [drawn, blank] = await Promise.all([cardWithDescription(word), cardWithDescription(BLANK_LINE)]);
            expect(drawn.equals(blank)).toBe(false);
        }
    );
});
