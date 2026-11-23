import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vite-plus/test';

import { useNavigateAndClose } from '#src/lib/useNavigateAndClose';

describe('useNavigateAndClose', () => {
    it('pushes the page and closes the dialog', () => {
        const router = { push: vi.fn() };
        const setOpen = vi.fn();
        const { result } = renderHook(() => useNavigateAndClose(router, setOpen));

        act(() => result.current('/checks/cooldown/'));

        expect(router.push).toHaveBeenCalledExactlyOnceWith('/checks/cooldown/');
        expect(setOpen).toHaveBeenCalledExactlyOnceWith(false);
    });
});
