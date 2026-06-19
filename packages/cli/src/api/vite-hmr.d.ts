import type { SeedcordFrameworkEvents, SeedcordCliEvents } from '@seedcord/types/internal';

// types the HMR wire events on the dev server (this.hot.send / .on) against the shared event maps.
declare module 'vite/types/customEvent.d.ts' {
    interface CustomEventMap extends SeedcordFrameworkEvents, SeedcordCliEvents {}
}
