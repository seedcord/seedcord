import { pathToFileURL } from 'node:url';

import type { Plugin } from 'vite';

export const GREETING = 'hi from a plugin';

const ID = 'virtual:greeting';

// a bot file that loads only when vitePlugins serve virtual:greeting
export const GREETING_PROBE = `export { default } from '${ID}';\n`;

// a user plugin scopes itself to the bot by the environment's name
export function greetingPlugin(): Plugin {
    return {
        name: 'greeting',
        applyToEnvironment: ({ name }) => name === 'seedcord',
        resolveId: (id) => (id === ID ? `\0${ID}` : undefined),
        load: (id) => (id === `\0${ID}` ? `export default ${JSON.stringify(GREETING)};` : undefined)
    };
}

// plugins is the source text of the array vitePlugins returns, like '[greetingPlugin()]'
export function configWithGreetingPlugin(fields: string, plugins = '[greetingPlugin()]'): string {
    return [
        `import { greetingPlugin } from ${JSON.stringify(pathToFileURL(import.meta.filename).href)};`,
        '',
        `export default { ${fields}, vitePlugins: () => ${plugins} };`,
        ''
    ].join('\n');
}
