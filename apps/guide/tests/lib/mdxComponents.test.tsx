import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';

import { mdxComponents } from '#lib/mdxComponents';
import { MAPPED_TAGS } from '#lib/remarkNoMappedJsx';

const { Image, pre: Fence, a: Link } = mdxComponents;

describe('the rejected jsx tag list', () => {
    it('names every lowercase tag the map claims', () => {
        const mapped = Object.keys(mdxComponents).filter((tag) => tag === tag.toLowerCase());

        expect([...MAPPED_TAGS].sort()).toEqual(mapped.sort());
    });
});

function classesOf(alt: string): string[] {
    return screen.getByRole('img', { name: alt }).className.split(/\s+/);
}

function borderWidthOf(alt: string): string | undefined {
    return classesOf(alt).find((name) => name === 'border' || /^border-\d+$/.test(name));
}

function marginOf(alt: string): string | undefined {
    return classesOf(alt).find((name) => /^m[a-z]-auto$/.test(name));
}

describe('a fence', () => {
    // mdx gives pre one code child
    async function renderFence(props: Record<string, unknown>): Promise<void> {
        render(await Fence({ children: <code {...props}>const a = 1;</code> }));
    }

    it('captions the block with the fence title', async () => {
        await renderFence({ className: 'language-ts', 'data-title': 'src/commands/Ping.ts' });

        expect(screen.getByText('src/commands/Ping.ts')).toBeInTheDocument();
    });

    it('draws no caption when the fence gives no title', async () => {
        await renderFence({ className: 'language-ts' });

        expect(screen.queryByText('src/commands/Ping.ts')).toBeNull();
    });

    it('drops the copy button on a fence tagged as output', async () => {
        await renderFence({ className: 'language-bash', 'data-output': '' });

        expect(screen.queryByRole('button', { name: /Copy/ })).toBeNull();
    });

    it('keeps the copy button on every other fence', async () => {
        await renderFence({ className: 'language-bash' });

        expect(screen.getByRole('button', { name: /Copy/ })).toBeInTheDocument();
    });
});

describe('a link', () => {
    it('opens a link off the guide in a new tab', () => {
        render(<Link href="https://discord.com/developers/applications">the portal</Link>);

        const anchor = screen.getByRole('link');

        expect(anchor).toHaveAttribute('target', '_blank');
        expect(anchor).toHaveAttribute('rel', 'noreferrer noopener');
    });

    it.each(['/gateway-or-http', '#intents', './commands'])('keeps %s in this tab', (href) => {
        render(<Link href={href}>somewhere in the guide</Link>);

        expect(screen.getByRole('link')).not.toHaveAttribute('target');
    });
});

describe('the image component', () => {
    it('draws no border by default', () => {
        render(<Image src="/logo.svg" alt="bare" />);

        expect(borderWidthOf('bare')).toBeUndefined();
    });

    it('gives each weight its own border', () => {
        render(
            <>
                <Image src="/logo.svg" alt="thin" frame="thin" />
                <Image src="/logo.svg" alt="regular" frame="regular" />
                <Image src="/logo.svg" alt="thick" frame="thick" />
            </>
        );

        expect(borderWidthOf('thin')).toBe('border');
        expect(borderWidthOf('regular')).toBe('border-2');
        expect(borderWidthOf('thick')).toBe('border-4');
    });

    it('keeps frame off the dom', () => {
        render(<Image src="/logo.svg" alt="asked for bare" frame={false} />);

        expect(borderWidthOf('asked for bare')).toBeUndefined();
        expect(screen.getByRole('img', { name: 'asked for bare' })).not.toHaveAttribute('frame');
    });

    it('gives each alignment its own margin', () => {
        render(
            <>
                <Image src="/logo.svg" alt="left" align="left" />
                <Image src="/logo.svg" alt="center" align="center" />
                <Image src="/logo.svg" alt="right" align="right" />
            </>
        );

        expect(marginOf('left')).toBe('me-auto');
        expect(marginOf('center')).toBe('mx-auto');
        expect(marginOf('right')).toBe('ms-auto');
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
