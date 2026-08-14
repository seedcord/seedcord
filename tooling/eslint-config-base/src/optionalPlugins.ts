import { createRequire } from 'node:module';

const load = createRequire(import.meta.url);

interface Transpiled {
    __esModule?: boolean;
    default?: unknown;
}

// MODULE_NOT_FOUND also covers a dependency of the plugin
function isAbsent(error: unknown, name: string): boolean {
    if (!Error.isError(error)) return false;

    return (error as NodeJS.ErrnoException).code === 'MODULE_NOT_FOUND' && error.message.includes(name);
}

// a static import would download these for every consumer
export function requirePlugin<Plugin>(name: string, option: string): Plugin {
    let plugin: unknown;

    try {
        plugin = load(name);
    } catch (error: unknown) {
        if (!isAbsent(error, name)) throw error;

        throw new Error(`${option} needs ${name}. Install it as a dev dependency, or drop the option.`, {
            cause: error
        });
    }

    // a plugin transpiled from esm puts itself on default, and eslint-plugin-tailwind-canonical-classes does
    const transpiled = plugin as Transpiled | null;

    // justified: a plugin package has no shared type, and each caller knows the shape it needs
    return (transpiled?.__esModule === true ? transpiled.default : plugin) as Plugin;
}
