import type { HotkeySpec } from '@seedcord/ui';

// a plain module, since PageNav renders on the server and reads these too
export const GUIDE_KEYS = {
    previousPage: { key: 'ArrowLeft', description: 'Previous page' },
    nextPage: { key: 'ArrowRight', description: 'Next page' },
    previousTab: { key: 'ArrowLeft', shift: true, description: 'Previous tab' },
    nextTab: { key: 'ArrowRight', shift: true, description: 'Next tab' },
    nextSection: { key: 'j', description: 'Next section' },
    previousSection: { key: 'k', description: 'Previous section' },
    copySection: { key: 'y', description: 'Copy a link to this section' }
} as const satisfies Record<string, HotkeySpec>;
