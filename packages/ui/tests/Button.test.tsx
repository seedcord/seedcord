import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { createRef } from 'react';
import { describe, expect, it, vi } from 'vitest';

import { Button } from '../src/Button';

describe('Button behavior', () => {
    it('fires onClick when clicked', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(<Button onClick={onClick}>Click</Button>);
        await user.click(screen.getByRole('button', { name: 'Click' }));
        expect(onClick).toHaveBeenCalledTimes(1);
    });

    it('does not fire onClick when disabled', async () => {
        const user = userEvent.setup();
        const onClick = vi.fn();
        render(
            <Button disabled onClick={onClick}>
                Off
            </Button>
        );
        const btn = screen.getByRole('button', { name: 'Off' });
        expect(btn).toBeDisabled();
        await user.click(btn);
        expect(onClick).not.toHaveBeenCalled();
    });

    it('renders children', () => {
        render(<Button>Hello</Button>);
        expect(screen.getByRole('button', { name: 'Hello' })).toHaveTextContent('Hello');
    });

    it('defaults type to "button"', () => {
        render(<Button>Default</Button>);
        expect(screen.getByRole('button', { name: 'Default' })).toHaveAttribute('type', 'button');
    });

    it('respects explicit type="submit"', () => {
        render(<Button type="submit">Submit</Button>);
        expect(screen.getByRole('button', { name: 'Submit' })).toHaveAttribute('type', 'submit');
    });

    it('forwards ref to the underlying <button>', () => {
        const ref = createRef<HTMLButtonElement>();
        render(<Button ref={ref}>Ref</Button>);
        expect(ref.current).not.toBeNull();
        expect(ref.current?.tagName).toBe('BUTTON');
    });

    it('spreads arbitrary HTML attributes onto the button', () => {
        render(
            <Button data-testid="custom-btn" aria-label="custom">
                X
            </Button>
        );
        const btn = screen.getByTestId('custom-btn');
        expect(btn).toHaveAttribute('aria-label', 'custom');
    });
});

describe('Button asChild', () => {
    it('renders the child element instead of a <button>', () => {
        render(
            <Button asChild>
                <a href="/docs">Docs</a>
            </Button>
        );
        const link = screen.getByRole('link', { name: 'Docs' });
        expect(link.tagName).toBe('A');
        expect(link).toHaveAttribute('href', '/docs');
        expect(screen.queryByRole('button')).toBeNull();
    });

    it('omits the type attribute on the slotted element', () => {
        render(
            <Button asChild>
                <a href="/x">Link</a>
            </Button>
        );
        expect(screen.getByRole('link', { name: 'Link' })).not.toHaveAttribute('type');
    });
});
