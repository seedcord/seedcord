/**
 * Error codes for component embed issues. You can branch on them to handle different
 * kinds of errors programmatically using the {@link ComponentEmbedError.code} property.
 *
 * - `InvalidStructure`: a wrong root, a component in the wrong place, a parent with the wrong number of children, an
 *   empty {@link TextDisplay}, text outside one, or a Vue VNode.
 *
 * - `InvalidProp`: a prop with the wrong type or value, like a `spacing` of `'medium'` or a URL with a bad scheme.
 *
 * - `OverLimit`: a length, count, or byte limit Discord sets.
 *
 * - `UnsupportedComponent`: a `memo`, `lazy`, `forwardRef`, context, class, or async component.
 *
 * - `ReadFailed`: a component or an iterator of yours threw while the package read the tree. The original error is on
 *   `cause`.
 */
export type ComponentEmbedErrorCode =
    'InvalidStructure' | 'InvalidProp' | 'OverLimit' | 'UnsupportedComponent' | 'ReadFailed';

/**
 * Thrown when a component tree breaks a rule of Discord's component embed format, or when your own code throws while
 * the package reads the tree. Read {@link ComponentEmbedError.code} to tell which. Discord drops an invalid payload
 * and falls back to the Open Graph card. The card you see is your only signal.
 *
 * @example
 * ```tsx
 * try {
 *     toComponentEmbed(<GuidePreview page={page} />);
 * } catch (error) {
 *     if (error instanceof ComponentEmbedError && error.code === 'ReadFailed') console.error(error.cause);
 *     throw error;
 * }
 * ```
 */
export class ComponentEmbedError extends Error {
    override readonly name = 'ComponentEmbedError';
    /** Which rule the tree broke. */
    readonly code: ComponentEmbedErrorCode;
    /**
     * The steps from the root to the component that broke a rule, like `['Container', 'PostCard', 'Section 2']`. Your
     * own components appear by name. A number marks a component written next to others with the same name. The path
     * is empty when the problem is the whole embed, like its size.
     */
    readonly path: readonly string[];

    constructor(
        code: ComponentEmbedErrorCode,
        message: string,
        { path = [], ...options }: ErrorOptions & { path?: readonly string[] } = {}
    ) {
        super(path.length > 0 ? `${message}\nFound at ${path.join(' > ')}` : message, options);
        this.code = code;
        this.path = path;
    }
}
