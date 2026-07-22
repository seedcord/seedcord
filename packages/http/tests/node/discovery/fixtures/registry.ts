declare module '@seedcord/core' {
    interface SlashOptionRegistry {
        ping: Record<never, never>;
        'config/set': { value: { kind: 'string'; required: true } };
        ban: { user: { kind: 'user'; required: true } };
    }

    interface UserContextMenuRegistry {
        'User Info': true;
    }
}

export {};
