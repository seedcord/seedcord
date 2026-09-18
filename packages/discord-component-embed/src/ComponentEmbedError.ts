/**
 * What went wrong, as a value to branch on. Messages can be reworded between releases. The codes stay.
 *
 * - `InvalidStructure`: a wrong root, a component in the wrong place, a parent with the wrong number of children, an
 *   empty `<TextDisplay>`, or text outside one.
 * - `InvalidProp`: a prop with the wrong type or value, like a `spacing` of `'medium'` or a URL with a bad scheme.
 * - `OverLimit`: a length, count, or byte limit Discord sets.
 * - `UnsupportedComponent`: a `memo`, `lazy`, `forwardRef`, context, class, or async component.
 * - `ReadFailed`: a component or an iterator of yours threw while the package read the tree. The original error is on
 *   `cause`.
 */
export type ComponentEmbedErrorCode =
    'InvalidStructure' | 'InvalidProp' | 'OverLimit' | 'UnsupportedComponent' | 'ReadFailed';

/**
 * Thrown when a component tree breaks a rule of Discord's component embed format, or when your own code throws while
 * the tree is read. Discord drops an invalid payload and shows the Open Graph card instead, without reporting an error
 * anywhere.
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
    readonly code: ComponentEmbedErrorCode;

    constructor(code: ComponentEmbedErrorCode, message: string, options?: ErrorOptions) {
        super(message, options);
        this.code = code;
    }
}
