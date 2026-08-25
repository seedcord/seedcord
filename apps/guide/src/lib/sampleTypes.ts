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
    }
`;

export const SAMPLE_AUGMENTATION = `
declare module '@seedcord/gateway' {${REGISTRIES}}
declare module '@seedcord/http' {${REGISTRIES}}
export {};
`;
