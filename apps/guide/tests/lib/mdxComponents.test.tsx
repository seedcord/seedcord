import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mdxComponents } from '#lib/mdxComponents';

const { Image } = mdxComponents;

function classesOf(alt: string): string[] {
    return screen.getByRole('img', { name: alt }).className.split(/\s+/);
}

function borderWidthOf(alt: string): string | undefined {
    return classesOf(alt).find((name) => name === 'border' || /^border-\d+$/.test(name));
}

function marginOf(alt: string): string | undefined {
    return classesOf(alt).find((name) => /^m[a-z]-auto$/.test(name));
}

describe('the image component', () => {
    it('draws a border by default', () => {
        render(<Image src="/logo.svg" alt="framed" />);

        expect(borderWidthOf('framed')).toBeDefined();
    });

    it('gives each weight its own border', () => {
        render(
            <>
                <Image src="/logo.svg" alt="thin" frame="thin" />
                <Image src="/logo.svg" alt="regular" frame="regular" />
                <Image src="/logo.svg" alt="thick" frame="thick" />
            </>
        );

        const widths = ['thin', 'regular', 'thick'].map((alt) => borderWidthOf(alt));

        expect(new Set(widths).size).toBe(widths.length);
    });

    it('drops the border and keeps frame off the dom', () => {
        render(<Image src="/logo.svg" alt="bare" frame={false} />);

        expect(borderWidthOf('bare')).toBeUndefined();
        expect(screen.getByRole('img', { name: 'bare' })).not.toHaveAttribute('frame');
    });

    it('gives each alignment its own margin', () => {
        render(
            <>
                <Image src="/logo.svg" alt="left" align="left" />
                <Image src="/logo.svg" alt="center" align="center" />
                <Image src="/logo.svg" alt="right" align="right" />
            </>
        );

        const margins = ['left', 'center', 'right'].map((alt) => marginOf(alt));

        expect(new Set(margins).size).toBe(margins.length);
    });

    it('keeps align off the dom', () => {
        render(<Image src="/logo.svg" alt="centred" align="center" />);

        expect(screen.getByRole('img', { name: 'centred' })).not.toHaveAttribute('align');
    });

    it('keeps a class the page passed in', () => {
        render(<Image src="/logo.svg" alt="classy" className="test-only-marker" />);

        expect(classesOf('classy')).toContain('test-only-marker');
    });

    // mdx does not typecheck the props a page writes
    it.each(['frame', 'align'])('refuses an unknown %s', (prop) => {
        expect(() => render(<Image src="/logo.svg" alt="typo" {...{ [prop]: 'nonsense' }} />)).toThrow('nonsense');
    });
});
