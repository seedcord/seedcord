import { Seedcord } from '@seedcord/http';

export default new Seedcord({
    bot: {
        interactions: { path: './handlers' },
        commands: { path: null }
    },
    subscribers: { path: null },
    port: 0
});
