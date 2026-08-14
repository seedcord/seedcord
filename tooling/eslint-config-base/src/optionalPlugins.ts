import { createRequire } from 'node:module';

const load = createRequire(import.meta.url);

interface Transpiled {
    __esModule?: boolean;
    default?: unknown;
}

// a static import would download these for every consumer
export function requirePlugin<Plugin>(name: string, option: string): Plugin {
    let plugin: unknown;

    try {
        plugin = load(name);
    } catch {
        throw new Error(`${option} needs ${name}. Install it as a dev dependency, or drop the option.`);
    }

    // a plugin transpiled from esm puts itself on default, and eslint-plugin-tailwind-canonical-classes does
    const transpiled = plugin as Transpiled;

    // justified: a plugin package has no shared type, and each caller knows the shape it needs
    return (transpiled.__esModule === true ? transpiled.default : plugin) as Plugin;
}
