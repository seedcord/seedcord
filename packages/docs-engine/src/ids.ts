export type GlobalId = `${string}:${number}`;

export const toGlobalId = (pkg: string, id: number): GlobalId => `${pkg}:${id}` as const;
