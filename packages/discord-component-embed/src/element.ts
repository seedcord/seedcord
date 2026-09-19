/** One node of a component embed tree. React and Preact elements have the same shape. */
export interface EmbedElement {
    type: unknown;
    props: unknown;
}

/** Anything that can go where children go. Booleans, `null`, and `undefined` add nothing. */
export type EmbedNode = EmbedElement | string | number | boolean | null | undefined | Iterable<EmbedNode>;

type OwnProps<Props> = Props extends unknown ? Omit<Props, 'children'> : never;

type ChildrenOf<Props> = 'children' extends keyof Props
    ? Props extends { children: infer Child }
        ? [Child, ...Child[]]
        : Props extends { children?: infer Child }
          ? Child[]
          : []
    : [];

/**
 * Builds an element without JSX. Use it in any file that can't compile this package's JSX, like a Svelte server file.
 * Pass a component, its props, then its children.
 *
 * @example
 * ```ts
 * const preview = h(
 *     Container, { accentColor: 0xf8f6e8 },
 *     h(Section, { accessory: h(LinkButton, { url: page.url, label: 'Read' }) },
 *     h(TextDisplay, null, `# ${page.title}`))
 * );
 * ```
 */
export function h<Props extends object>(
    type: (props: Props) => EmbedNode,
    props: object extends OwnProps<Props> ? OwnProps<Props> | null : OwnProps<Props>,
    ...children: ChildrenOf<Props>
): EmbedElement {
    return { type, props: withChildren({ ...props }, children) };
}

/**
 * The JSX transform calls this in place of `jsx` for a `key` written after a spread. Build elements yourself with
 * {@link h}.
 */
export function createElement(
    type: unknown,
    config: Record<string, unknown> | null,
    ...children: EmbedNode[]
): EmbedElement {
    // the dev JSX transform adds __self and __source
    const { key: _key, __self: _self, __source: _source, ...props } = config ?? {};
    return { type, props: withChildren(props, children) };
}

function withChildren(props: object, children: readonly unknown[]): object {
    if (children.length === 0) return props;
    return { ...props, children: children.length === 1 ? children[0] : children };
}
