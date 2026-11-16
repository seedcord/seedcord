/** Options for reply / followUp / send. They apply when the call sends a new message. */
export interface SendOpts {
    /**
     * Whether only the invoking user sees the reply. If the `defer()` placeholder is still empty and this doesn't
     * match it, the placeholder gets deleted and a new message is sent.
     *
     * @defaultValue `true`
     */
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
    /**
     * Whether the eventual reply is ephemeral.
     *
     * @defaultValue `true`
     */
    readonly ephemeral?: boolean;
}
