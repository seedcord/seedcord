import { defineConfig } from '#src/workerd.index';

// @ts-expect-error the cloudflare plugin sets an edge worker's output folder
defineConfig({ instance: './bot.ts', build: { outDir: './out' } });
