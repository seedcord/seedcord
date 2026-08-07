const ALWAYS_INTENT = 'Guilds';

export const CAPABILITIES = [
    {
        id: 'guild-messages',
        label: 'Messages in servers',
        hint: 'know when a message is sent, edited, or deleted',
        privileged: false,
        intents: ['GuildMessages'],
        partials: []
    },
    {
        id: 'message-text',
        label: 'What messages actually say',
        hint: 'privileged. without this, message text is empty unless the message mentions your bot',
        privileged: true,
        intents: ['MessageContent'],
        partials: []
    },
    {
        id: 'direct-messages',
        label: 'Direct messages',
        hint: 'messages people send your bot directly',
        privileged: false,
        // djs documents Partials.Channel as required to receive direct messages
        intents: ['DirectMessages'],
        partials: ['Channel']
    },
    {
        id: 'reactions',
        label: 'Reactions',
        hint: 'know when someone reacts to a message',
        privileged: false,
        intents: ['GuildMessageReactions', 'DirectMessageReactions'],
        partials: ['Message', 'Channel', 'Reaction']
    },
    {
        id: 'members',
        label: 'Member joins and leaves',
        hint: 'privileged. also covers nickname and role changes',
        privileged: true,
        intents: ['GuildMembers'],
        partials: []
    },
    {
        id: 'presence',
        label: 'Member online status',
        hint: 'privileged. who is online, and what they are playing',
        privileged: true,
        intents: ['GuildPresences'],
        partials: []
    },
    {
        id: 'voice',
        label: 'Voice channel activity',
        hint: 'know when someone joins, leaves, or moves between voice channels',
        privileged: false,
        intents: ['GuildVoiceStates'],
        partials: []
    },
    {
        id: 'moderation',
        label: 'Bans and timeouts',
        hint: 'know when a member is banned, unbanned, or timed out',
        privileged: false,
        intents: ['GuildModeration'],
        partials: []
    },
    {
        id: 'scheduled-events',
        label: 'Scheduled events',
        hint: 'know when a server event is created, updated, or starts',
        privileged: false,
        intents: ['GuildScheduledEvents'],
        partials: []
    },
    {
        id: 'automod',
        label: 'AutoMod',
        hint: 'know when a server AutoMod rule changes or fires',
        privileged: false,
        intents: ['AutoModerationConfiguration', 'AutoModerationExecution'],
        partials: []
    },
    {
        id: 'polls',
        label: 'Polls',
        hint: 'know when someone votes in a poll',
        privileged: false,
        intents: ['GuildMessagePolls', 'DirectMessagePolls'],
        partials: []
    }
] as const;

type Capability = (typeof CAPABILITIES)[number];

// a type test pins these against the real discord.js enums
export type IntentName = Capability['intents'][number] | typeof ALWAYS_INTENT;
export type PartialName = Capability['partials'][number];

function picked(ids: readonly string[]): Capability[] {
    const wanted = new Set(ids);
    return CAPABILITIES.filter((capability) => wanted.has(capability.id));
}

export function intentsFor(ids: readonly string[]): IntentName[] {
    return [...new Set<IntentName>([ALWAYS_INTENT, ...picked(ids).flatMap((capability) => capability.intents)])];
}

export function partialsFor(ids: readonly string[]): PartialName[] {
    return [...new Set<PartialName>(picked(ids).flatMap((capability) => capability.partials))];
}

export function privilegedFor(ids: readonly string[]): IntentName[] {
    return picked(ids)
        .filter((capability) => capability.privileged)
        .flatMap((capability) => capability.intents);
}
