import { Seedcord } from '@seedcord/http';

export default new Seedcord({
    bot: {
        interactions: { path: './src/handlers' },
        commands: { path: null }
    },
    subscribers: { path: null }
});
