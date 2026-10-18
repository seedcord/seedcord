import { Seedcord } from '@seedcord/gateway';
import { Envapter } from 'envapt';

console.log(`fixture:env ${Envapter.get('FIXTURE_ENV', 'unset')}`);

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
