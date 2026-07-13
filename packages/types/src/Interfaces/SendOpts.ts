/** Options for reply / followUp / send. send() applies them only when it creates a new message. */
export interface SendOpts {
    /**
     * Whether only the invoking user sees the reply.
     *
     * @defaultValue `true`
     */
    readonly ephemeral?: boolean;
    /**
     * Whether the message skips push and desktop notifications.
     *
     * @defaultValue `false`
     */
    readonly silent?: boolean;
}

/** Options for defer. */
export interface DeferOpts {
    /**
     * Whether the eventual reply is ephemeral.
     *
     * @defaultValue `true`
     */
    readonly ephemeral?: boolean;
}
