import type { EmbedElement, EmbedNode } from './element';

export { Fragment } from './fragment';

/** The JSX transform calls this for every element in a file set to `jsxImportSource: 'discord-component-embed'`. */
export function jsx(type: unknown, props: object): EmbedElement {
    return { type, props };
}

export { jsx as jsxs };

/** The types TypeScript checks this package's JSX against. An HTML tag like `<div>` is a type error. */
// eslint-disable-next-line @typescript-eslint/no-namespace -- typescript reads JSX types only from a namespace named JSX
export namespace JSX {
    export type Element = EmbedElement;
    export type ElementType = (props: never) => EmbedNode;
    export type IntrinsicElements = Record<never, never>;
    export interface IntrinsicAttributes {
        key?: string | number | bigint | null;
    }
    export interface ElementChildrenAttribute {
        children: unknown;
    }
}
