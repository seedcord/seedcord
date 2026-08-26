// mirrors what mocks/gateway and mocks/http declare in their src/seedcord-gen.d.ts
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
        maintenance: {
            options: {
                notify: { kind: 'user'; required: true };
                target: { kind: 'channel'; required: true; channelTypes: [0, 5] };
                reason: { kind: 'string'; required: false };
            };
            cache: 'cached';
        };
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
