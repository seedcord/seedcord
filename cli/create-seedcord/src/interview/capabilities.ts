const ALWAYS_INTENT = 'Guilds';

export const CAPABILITIES = [
    {
        id: 'guild-messages',
        label: 'Messages in servers',
        hint: 'know when a message is sent, edited, or deleted',
        intents: ['GuildMessages'],
        partials: []
    },
    {
        id: 'message-text',
        label: 'What messages actually say',
        hint: 'privileged. without this, message text is empty unless the message mentions your bot',
        // MessageContent subscribes to nothing on its own
        intents: ['GuildMessages', 'MessageContent'],
        partials: []
    },
    {
        id: 'direct-messages',
        label: 'Direct messages',
        hint: 'messages people send your bot directly',
        // djs documents Partials.Channel as required to receive direct messages
        intents: ['DirectMessages'],
        partials: ['Channel']
    },
    {
        id: 'reactions',
        label: 'Reactions',
        hint: 'know when someone reacts to a message',
        intents: ['GuildMessageReactions', 'DirectMessageReactions'],
        partials: ['Message', 'Channel', 'Reaction']
    },
    {
        id: 'members',
        label: 'Member joins and leaves',
        hint: 'privileged. also covers nickname and role changes',
        intents: ['GuildMembers'],
        partials: ['GuildMember']
    },
    {
        id: 'presence',
        label: 'Member online status',
        hint: 'privileged. who is online, and what they are playing',
        intents: ['GuildPresences'],
        partials: []
    },
    {
        id: 'voice',
        label: 'Voice channel activity',
        hint: 'know when someone joins, leaves, or moves between voice channels',
        intents: ['GuildVoiceStates'],
        partials: []
    },
    {
        id: 'moderation',
        label: 'Bans and timeouts',
        hint: 'know when a member is banned, unbanned, or timed out',
        intents: ['GuildModeration'],
        partials: []
    },
    {
        id: 'scheduled-events',
        label: 'Scheduled events',
        hint: 'know when a server event is made, changed, or starts, and when people sign up',
        intents: ['GuildScheduledEvents'],
        // only the sign-up events read the user cache
        partials: ['User']
    },
    {
        id: 'automod',
        label: 'AutoMod',
        hint: 'know when a server AutoMod rule changes or fires',
        intents: ['AutoModerationConfiguration', 'AutoModerationExecution'],
        partials: []
    },
    {
        id: 'polls',
        label: 'Polls',
        hint: 'know when someone votes in a poll',
        intents: ['GuildMessagePolls', 'DirectMessagePolls'],
        // getPoll returns null on a partial message unless both Poll and PollAnswer are set
        partials: ['Message', 'Channel', 'Poll', 'PollAnswer']
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

// each of the three has its own toggle on the Discord dashboard
const PRIVILEGED_INTENTS = new Set<IntentName>(['GuildMembers', 'GuildPresences', 'MessageContent']);

export function privilegedFor(ids: readonly string[]): IntentName[] {
    return intentsFor(ids).filter((intent) => PRIVILEGED_INTENTS.has(intent));
}
