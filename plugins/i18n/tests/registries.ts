// what seedcord codegen would write for the commands in commands.ts
declare module '@seedcord/core' {
    interface SlashRegistry {
        '8ball': { options: {}; cache: undefined };
        'config/logs/set': { options: { channel: { kind: 'channel'; required: true } }; cache: undefined };
        'config/show': { options: {}; cache: undefined };
        probe: {
            options: { category: { kind: 'string'; required: false; choices: ['books', 'films'] } };
            cache: undefined;
        };
    }
    interface UserContextMenuRegistry {
        'View Profile': { cache: undefined };
    }
    interface MessageContextMenuRegistry {
        'Report Message': { cache: undefined };
    }
}

export {};
