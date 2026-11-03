// @vitest-environment node
import { BRAND_COLORS } from '@seedcord/brand';
import { OgPageCard } from '@seedcord/ui/OgCard';
import { loadOgFonts, OG_SIZE } from '@seedcord/ui/og';
import { ImageResponse } from 'takumi-js/response';
import { describe, expect, it } from 'vite-plus/test';

// a lone no-break space takes one line of height and draws nothing
const BLANK_LINE = ' ';

const fonts = loadOgFonts();

async function cardWithDescription(description: string): Promise<Buffer> {
    const response = new ImageResponse(
        <OgPageCard
            pill="commands"
            accent={BRAND_COLORS.seedDark}
            meta={[]}
            name="Commands"
            description={description}
            domain="seedcord.org/guide"
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
