import { pathToFileURL } from 'node:url';

import type { Plugin } from 'vite';

export const GREETING = 'hi from a plugin';

const ID = 'virtual:greeting';

// a bot file that loads only when vitePlugins serve virtual:greeting
export const GREETING_PROBE = `export { default } from '${ID}';\n`;

export function greetingPlugin(): Plugin {
    return {
        name: 'greeting',
        resolveId: (id) => (id === ID ? `\0${ID}` : undefined),
        load: (id) => (id === `\0${ID}` ? `export default ${JSON.stringify(GREETING)};` : undefined)
    };
}

// vitePlugins is source text, like '[greetingPlugin()]'
export function configWithGreetingPlugin(fields: string, vitePlugins = '[greetingPlugin()]'): string {
    return [
        `import { greetingPlugin } from ${JSON.stringify(pathToFileURL(import.meta.filename).href)};`,
        '',
        `export default { ${fields}, vitePlugins: ${vitePlugins} };`,
        ''
    ].join('\n');
}
