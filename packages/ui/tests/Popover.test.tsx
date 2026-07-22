import * as PopoverPrimitive from '@radix-ui/react-popover';
import { act, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { beforeAll, describe, expect, it } from 'vitest';

import { Popover, PopoverArrow, PopoverContent, PopoverTrigger } from '@/Popover';

import type { ReactElement } from 'react';

// justified: jsdom omits ResizeObserver (PopoverArrow's use-size hook needs it) and PointerEvent (Radix dismissable-layer listens on pointerdown).
beforeAll(() => {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- jsdom omits ResizeObserver at runtime even though the type says it exists
    if (globalThis.ResizeObserver === undefined) {
        class StubResizeObserver {
            observe(): void {}
            unobserve(): void {}
            disconnect(): void {}
        }
        (globalThis as unknown as { ResizeObserver: typeof StubResizeObserver }).ResizeObserver = StubResizeObserver;
    }
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- jsdom omits PointerEvent at runtime even though the type says it exists
    if (globalThis.PointerEvent === undefined) {
        (globalThis as unknown as { PointerEvent: typeof MouseEvent }).PointerEvent = MouseEvent;
    }
});

function Basic({
    withArrow = false,
    defaultOpen = false
}: {
    withArrow?: boolean;
    defaultOpen?: boolean;
}): ReactElement {
    return (
        <Popover defaultOpen={defaultOpen}>
            <PopoverTrigger>Open</PopoverTrigger>
            <PopoverContent>
                Panel body
                {withArrow ? <PopoverArrow data-testid="arrow" /> : null}
            </PopoverContent>
        </Popover>
    );
}

describe('Popover open via Trigger click', () => {
    it('starts closed and opens on Trigger click', async () => {
        const user = userEvent.setup();
        render(<Basic />);
        const trigger = screen.getByRole('button', { name: 'Open' });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Panel body')).toBeNull();
        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Panel body')).toBeInTheDocument();
    });
});

describe('Popover close behaviour', () => {
    it('closes when Escape is pressed', async () => {
        const user = userEvent.setup();
        render(<Basic defaultOpen />);
        const trigger = screen.getByRole('button', { name: 'Open' });
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await user.keyboard('{Escape}');
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Panel body')).toBeNull();
    });

    it('closes on outside pointer-down', async () => {
        render(
            <div>
                <button data-testid="outside" type="button">
                    outside
                </button>
                <Basic defaultOpen />
            </div>
        );
        const trigger = screen.getByRole('button', { name: 'Open' });
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        // justified: Radix DismissableLayer registers its document pointerdown listener via setTimeout(0), so a macrotask must flush before dispatching or the handler isn't wired yet.
        await act(async () => {
            await new Promise((resolve) => setTimeout(resolve, 0));
        });
        const outside = screen.getByTestId('outside');
        // justified: SyntheticEvent path doesn't reach the document-level native listener; dispatch natively.
        act(() => {
            outside.dispatchEvent(new MouseEvent('pointerdown', { bubbles: true, cancelable: true }));
            outside.dispatchEvent(new MouseEvent('mousedown', { bubbles: true, cancelable: true }));
            outside.dispatchEvent(new MouseEvent('click', { bubbles: true, cancelable: true }));
        });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
});

describe('Popover aria-expanded toggling', () => {
    it('flips aria-expanded across toggles', async () => {
        const user = userEvent.setup();
        render(<Basic />);
        const trigger = screen.getByRole('button', { name: 'Open' });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });
});

describe('Popover arrow rendering', () => {
    it('renders an arrow element when PopoverArrow is provided', () => {
        render(<Basic withArrow defaultOpen />);
        expect(screen.getByTestId('arrow')).toBeInTheDocument();
    });

    it('omits the arrow when PopoverArrow is not provided', () => {
        render(<Basic defaultOpen />);
        expect(screen.queryByTestId('arrow')).toBeNull();
    });
});

describe('Popover portal vs inline render', () => {
    it('renders PopoverContent in a portal outside the local container', () => {
        const { container } = render(<Basic defaultOpen />);
        expect(container.querySelector('[role="dialog"]')).toBeNull();
        expect(screen.getByText('Panel body')).toBeInTheDocument();
    });

    it('renders Radix Content inline (no portal) when used directly without our wrapper', () => {
        const { container } = render(
            <Popover defaultOpen>
                <PopoverTrigger>Open</PopoverTrigger>
                <PopoverPrimitive.Content data-testid="inline-content">Inline body</PopoverPrimitive.Content>
            </Popover>
        );
        const inline = container.querySelector('[data-testid="inline-content"]');
        expect(inline).not.toBeNull();
        expect(inline?.textContent).toBe('Inline body');
    });
});

describe('Popover controlled vs uncontrolled', () => {
    it('uncontrolled: manages its own open state via Trigger', async () => {
        const user = userEvent.setup();
        render(<Basic />);
        const trigger = screen.getByRole('button', { name: 'Open' });
        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Panel body')).toBeInTheDocument();
    });

    it('controlled: open is driven by parent state and onOpenChange fires', async () => {
        const user = userEvent.setup();
        const changes: boolean[] = [];
        function Controlled(): ReactElement {
            const [open, setOpen] = useState(false);
            return (
                <Popover
                    open={open}
                    onOpenChange={(next) => {
                        changes.push(next);
                        setOpen(next);
                    }}
                >
                    <PopoverTrigger>Open</PopoverTrigger>
                    <PopoverContent>Controlled body</PopoverContent>
                </Popover>
            );
        }
        render(<Controlled />);
        const trigger = screen.getByRole('button', { name: 'Open' });
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        await user.click(trigger);
        expect(changes).toEqual([true]);
        expect(trigger).toHaveAttribute('aria-expanded', 'true');
        expect(screen.getByText('Controlled body')).toBeInTheDocument();
        await user.click(trigger);
        expect(changes).toEqual([true, false]);
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
    });

    it('controlled: parent can force open=false even if Trigger was clicked without state sync', async () => {
        const user = userEvent.setup();
        render(
            <Popover open={false}>
                <PopoverTrigger>Open</PopoverTrigger>
                <PopoverContent>Forced closed</PopoverContent>
            </Popover>
        );
        const trigger = screen.getByRole('button', { name: 'Open' });
        await user.click(trigger);
        expect(trigger).toHaveAttribute('aria-expanded', 'false');
        expect(screen.queryByText('Forced closed')).toBeNull();
    });
});
