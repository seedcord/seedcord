// mirrors what both mocks declare, in mocks/gateway/src/seedcord-gen.d.ts and mocks/http/src/seedcord-gen.d.ts
const REGISTRIES = `
    interface SlashOptionRegistry {
        ping: { detailed: { kind: 'boolean'; required: false } };
    }
`;

// stands in for the seedcord-gen.d.ts a real bot generates
export const SAMPLE_AUGMENTATION = `
declare module '@seedcord/gateway' {${REGISTRIES}}
declare module '@seedcord/http' {${REGISTRIES}}
export {};
`;
