import { defineConfig as defineServerConfig } from '#src/index';
import { defineConfig } from '#src/workerd.index';

// @ts-expect-error the cloudflare plugin sets an edge worker's output folder
defineConfig({ instance: './bot.ts', build: { outDir: './out' } });

// @ts-expect-error the start file moved to build.start
defineServerConfig({ instance: './bot.ts', entry: './index.ts' });

// @ts-expect-error a worker has no start file. cloudflare calls the default export of instance
defineConfig({ instance: './bot.ts', build: { start: './index.ts' } });

defineServerConfig({ instance: './bot.ts', build: { start: './index.ts', outDir: './out' } });
defineServerConfig({ instance: './bot.ts' });
