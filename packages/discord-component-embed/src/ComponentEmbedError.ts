/**
 * Thrown when a component tree breaks a rule of Discord's component embed format. Discord drops an invalid payload
 * and shows the Open Graph card instead, without reporting an error anywhere.
 */
export class ComponentEmbedError extends Error {
    override readonly name = 'ComponentEmbedError';
}
