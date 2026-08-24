declare module '@seedcord/core' {
    interface SlashRegistry {
        ping: Record<never, never>;
        'config/set': { options: { value: { kind: 'string'; required: true } }; cache: 'cached' };
        ban: { options: { user: { kind: 'user'; required: true } }; cache: 'cached' };
    }

    interface UserContextMenuRegistry {
        'User Info': { cache: 'cached' };
    }
}

export {};
