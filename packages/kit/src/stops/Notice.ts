import type { RenderContext, ReplyResponse } from '@seedcord/types';

/**
 * Base class for a user-facing refusal or a reported fault.
 *
 * Throw a `Notice` to stop a handler and reply to the user. The framework catches it at the controller
 * boundary and renders {@link Notice.render}, which always decides what the user sees. With `report`
 * false (the default) that render is all that happens. With `report` true the framework also logs the
 * fault and publishes it to the `handledException` bus. A raw, non-Notice throw shows the generic message.
 *
 * @example
 * ```ts
 * import { Notice, BuilderComponent, type RenderContext, type ReplyResponse } from 'seedcord';
 * import { TextDisplayBuilder } from 'discord.js';
 *
 * // reading `.component` applies the configured bot color to the container accent
 * class TooPoorCard extends BuilderComponent<'container'> {
 *     constructor(balance: number) {
 *         super('container');
 *         this.instance.addTextDisplayComponents(
 *             new TextDisplayBuilder().setContent(`### Insufficient balance\nYou need more than ${balance} coins.`)
 *         );
 *     }
 * }
 *
 * class TooPoor extends Notice {
 *     constructor(private readonly balance: number) {
 *         super(`balance ${balance} is below the cost`);
 *     }
 *
 *     render(_ctx: RenderContext): ReplyResponse {
 *         return { components: [new TooPoorCard(this.balance).component] };
 *     }
 * }
 *
 * // in a handler, throwing stops the handler and replies with render(ctx)
 * if (wallet.balance < cost) throw new TooPoor(wallet.balance);
 * ```
 */
export abstract class Notice extends Error {
    /**
     * Whether this denial is a reported fault. True also logs it and publishes it to the `handledException`
     * bus. The user always sees {@link Notice.render} either way.
     */
    public report = false;

    /**
     * Whether the reply is ephemeral, so only the invoking user sees it. Defaults to true. Set it false for
     * a refusal the whole channel should see.
     */
    public ephemeral = true;

    /**
     * A short one-line reason. When every arm of an `or` gate refuses and each refusal sets this, `or`
     * lists them instead of showing a neutral message.
     */
    public summary?: string;

    protected constructor(message: string, options?: ErrorOptions) {
        super(message, options);

        // Error sets name to 'Error', so stamp the concrete subclass name for logs and the fault report
        this.name = new.target.name;
        Error.captureStackTrace(this, this.constructor);
    }

    /**
     * Builds what the user sees. Called fresh each time the denial is shown, so the builders are new
     * and the bot color resolves at render time rather than at construction time.
     */
    public abstract render(ctx: RenderContext): ReplyResponse;
}
