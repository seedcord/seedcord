interface PluginKeyParts {
    readonly head: string;
    readonly leaf: string | undefined;
}

// 'services.users' attaches the plugin as users inside the group services
export function splitPluginKey(key: string): PluginKeyParts {
    const dot = key.indexOf('.');
    return dot === -1 ? { head: key, leaf: undefined } : { head: key.slice(0, dot), leaf: key.slice(dot + 1) };
}
