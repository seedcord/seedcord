// these are all the types the registry uses to type its examples. expand as needed
const REGISTRIES = `
    interface SlashRegistry {
        ping: { options: { detailed: { kind: 'boolean'; required: false } }; cache: 'cached' };
        ban: {
            options: {
                target: { kind: 'user'; required: true };
                reason: { kind: 'string'; required: false };
            };
            cache: 'cached';
        };
        kick: {
            options: {
                target: { kind: 'user'; required: true };
            };
            cache: 'cached';
        };
        maintenance: {
            options: {
                notify: { kind: 'user'; required: true };
                target: { kind: 'channel'; required: true; channelTypes: [0, 5] };
                reason: { kind: 'string'; required: false };
            };
            cache: 'cached';
        };
        'role/add': {
            options: {
                member: { kind: 'user'; required: true };
                role: { kind: 'role'; required: true };
            };
            cache: 'cached';
        };
        'role/remove': {
            options: {
                member: { kind: 'user'; required: true };
                role: { kind: 'role'; required: true };
            };
            cache: 'cached';
        };
        'settings/notifications/enable': { options: {}; cache: 'cached' };
        probe: {
            options: {
                query: { kind: 'string'; required: true; autocomplete: true };
                count: { kind: 'integer'; required: false; autocomplete: true };
                ratio: { kind: 'number'; required: false; autocomplete: true };
                category: { kind: 'string'; required: false; choices: ['books', 'films'] };
                exact: { kind: 'boolean'; required: false };
            };
            cache: 'cached';
        };
    }
`;

export const SAMPLE_AUGMENTATION = `
declare module '@seedcord/gateway' {${REGISTRIES}}
declare module '@seedcord/http' {${REGISTRIES}}
export {};
`;
