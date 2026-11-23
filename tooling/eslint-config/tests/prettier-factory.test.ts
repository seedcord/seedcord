import { describe, expect, it } from 'vite-plus/test';

import { createPrettierConfig } from '#src/prettier';

const NARROW_MDX = [{ files: 'content/**/*.mdx', options: { printWidth: 68 } }];

describe('createPrettierConfig', () => {
    it('passes the overrides it was given', () => {
        expect(createPrettierConfig({ overrides: NARROW_MDX }).overrides).toEqual(NARROW_MDX);
    });

    it('keeps them alongside the tailwind plugin', () => {
        const config = createPrettierConfig({
            tailwind: { stylesheet: './globals.css' },
            overrides: NARROW_MDX
        });

        expect(config.overrides).toEqual(NARROW_MDX);
        expect(config.plugins).toContain('prettier-plugin-tailwindcss');
    });

    it("doesn't set overrides when none are given", () => {
        expect(createPrettierConfig().overrides).toBeUndefined();
    });
});
