/** Options for reply / followUp / send. send() applies them only when it creates a new message. */
export interface SendOpts {
    /** Whether only the invoking user sees the reply. Leave it out to use `bot.interactions.ephemeral`. */
    readonly ephemeral?: boolean | undefined;
    /**
     * Whether the message skips push and desktop notifications.
     *
     * @defaultValue `false`
     */
    readonly silent?: boolean;
}

/** Options for defer. */
export interface DeferOpts {
    /** Whether the eventual reply is ephemeral. Leave it out to use `bot.interactions.ephemeral`. */
    readonly ephemeral?: boolean;
}
