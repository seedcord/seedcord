import { Seedcord } from '@seedcord/gateway';

export default new Seedcord({
    bot: {
        clientOptions: { intents: [] },
        interactions: { path: './handlers' },
        commands: { path: null },
        events: { path: './events' }
    },
    subscribers: { path: null },
    healthCheck: false
});
