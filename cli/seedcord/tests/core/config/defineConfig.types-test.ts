import { defineConfig as defineServerConfig } from '#src/index';
import { defineConfig } from '#src/workerd.index';

// @ts-expect-error the cloudflare plugin sets an edge worker's output folder
defineConfig({ instance: './bot.ts', build: { outDir: './out' } });

// @ts-expect-error a worker has no start file. cloudflare calls the default export of instance
defineConfig({ instance: './bot.ts', build: { start: './index.ts' } });

defineServerConfig({ instance: './bot.ts', build: { start: './index.ts', outDir: './out' } });
defineServerConfig({ instance: './bot.ts' });

// @ts-expect-error entry moved to build.start
defineServerConfig({ instance: './bot.ts', entry: './index.ts' });

// @ts-expect-error build.bootstrap is gone, the entry is always index.mjs
defineServerConfig({ instance: './bot.ts', build: { bootstrap: './boot.ts' } });

defineServerConfig({
    instance: './bot.ts',
    make: { templates: './tpl', helpers: { shout: (value: string) => value } }
});

// @ts-expect-error seedcord ships pascal
defineServerConfig({ instance: './bot.ts', make: { helpers: { pascal: (value: string) => value } } });
