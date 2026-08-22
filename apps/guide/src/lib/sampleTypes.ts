// mirrors what mocks/gateway and mocks/http declare in their src/seedcord-gen.d.ts
const REGISTRIES = `
    interface SlashOptionRegistry {
        ping: { detailed: { kind: 'boolean'; required: false } };
    }
`;

export const SAMPLE_AUGMENTATION = `
declare module '@seedcord/gateway' {${REGISTRIES}}
declare module '@seedcord/http' {${REGISTRIES}}
export {};
`;
