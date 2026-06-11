import type { Repliables } from '@handlers/BaseHandler';
import type { RepliableInteractionHandler } from '@handlers/repliable';
import type { BuilderComponent, RowComponent } from '@interfaces/Components';
import type {
    ButtonInteraction,
    ChannelSelectMenuInteraction,
    ComponentType,
    MentionableSelectMenuInteraction,
    MessageComponentInteraction,
    MessageComponentType,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction
} from 'discord.js';
import type { Except, IntClosedRange, NonEmptyTuple, Promisable, TupleOf } from 'type-fest';

/**
 * Context object supplied to Confirmable factory callbacks.
 */
export interface ConfirmableContext {
    /** Handler instance that owns the decorated method. */
    handler: RepliableInteractionHandler;
    /** Interaction that triggered the decorated handler. */
    interaction: Repliables;
    /** Resolved confirmation question shown to the user. */
    question: string;
}

/**
 * Factory helper that supports synchronous and asynchronous Confirmable values.
 */
export type ConfirmableFactory<ConfirmableResult> =
    | ConfirmableResult
    | ((ctx: ConfirmableContext) => Promisable<ConfirmableResult>);

/**
 * Utility type to extract the underlying component type from builder components.
 *
 * @internal
 */
export type ExtractComponent<TComp> = TComp extends { component: infer C } ? C : never;

/**
 * Normalized container component structure used by Confirmable internals.
 *
 * @internal
 */
export type ContainerLike = ExtractComponent<BuilderComponent<'container'>>;

/**
 * Normalized embed component structure used by Confirmable internals.
 *
 * Ensures the embed count remains within the Discord limit of 1..10.
 *
 * @internal
 */
export type EmbedLike = TupleOf<IntClosedRange<1, 10>, ExtractComponent<BuilderComponent<'embed'>>>;

/**
 * Normalized action row structure for button components.
 *
 * @internal
 */
export type RowLike = ExtractComponent<RowComponent<'button'>>;

/**
 * Response payload produced when using classic message component rows.
 *
 * @internal
 */
export interface ClassicPayload {
    components: readonly RowLike[];
    embeds?: EmbedLike;
    content?: string;
    flags?: unknown;
}

/**
 * Response payload produced when using the Component V2 container API.
 *
 * @internal
 */
export interface ComponentsV2Payload {
    flags: 'IsComponentsV2';
    components: readonly ContainerLike[];
}

/**
 * Payload variants that Confirmable may send back to the platform.
 *
 * @internal
 */
export type ConfirmablePayload = ClassicPayload | ComponentsV2Payload;

/**
 * Maps a message component type to the corresponding interaction subtype.
 *
 * @internal
 */
export type ComponentInteractionFor<TComponentType extends MessageComponentType> =
    TComponentType extends ComponentType.Button
        ? ButtonInteraction
        : TComponentType extends ComponentType.StringSelect
          ? StringSelectMenuInteraction
          : TComponentType extends ComponentType.UserSelect
            ? UserSelectMenuInteraction
            : TComponentType extends ComponentType.RoleSelect
              ? RoleSelectMenuInteraction
              : TComponentType extends ComponentType.MentionableSelect
                ? MentionableSelectMenuInteraction
                : TComponentType extends ComponentType.ChannelSelect
                  ? ChannelSelectMenuInteraction
                  : MessageComponentInteraction;

/**
 * Information supplied to the optional onResolved callback.
 */
export interface ConfirmableResolution<
    TComponentType extends MessageComponentType = ComponentType.Button
> extends ConfirmableContext {
    /** Whether the user confirmed the action. */
    confirmed: boolean;
    /** Whether the confirmation UI timed out without a response. */
    timedOut: boolean;
    /** Interaction that resolved the decision, if any. */
    button?: ComponentInteractionFor<TComponentType>;
}

/**
 * Strategy for resolving a user's decision via a custom resolver function.
 */
export interface ConfirmableDecisionByResolver<TComponentType extends MessageComponentType> {
    kind: 'resolver';
    /** Message component type expected by the resolver. */
    componentType: TComponentType;
    /** Resolves whether the user confirmed the prompt. */
    resolve: (i: ComponentInteractionFor<TComponentType>) => Promisable<boolean>;
}

/**
 * Strategy for resolving a user's decision via strict custom ID matching.
 */
export interface ConfirmableDecisionByCustomIds<TComponentType extends MessageComponentType> {
    kind: 'customIds';
    /** Custom IDs that should resolve the confirmation as accepted. */
    confirm: readonly string[];
    /** Optional custom IDs that should resolve the confirmation as rejected. */
    cancel?: readonly string[];
    /** The component type to listen for. {@default MessageComponentType.Button} */
    componentType?: TComponentType;
}

/**
 * Discriminated union of strategies for determining the confirmation outcome.
 */
export type ConfirmableDecision<TComponentType extends MessageComponentType> =
    | ConfirmableDecisionByResolver<TComponentType>
    | ConfirmableDecisionByCustomIds<TComponentType>;

/**
 * Confirmable configuration shared across the classic and component V2 modes.
 */
export interface ConfirmableSharedOptions<TComponentType extends MessageComponentType = ComponentType.Button> {
    /**
     * whether the response should be ephemeral. {@default `true`}
     */
    ephemeral?: boolean;
    /**
     * Timeout in milliseconds before the prompt is considered timed out. {@default `10000`}
     */
    timeoutMs?: number;
    /**
     * Callback invoked after the decision is resolved and UI is cleared/replaced.
     * This runs before the decorated method (if confirmed).
     */
    onResolved?: (r: ConfirmableResolution<TComponentType>) => Promisable<void>;
    /**
     * Whether to defer the interaction automatically. {@default `true`}
     */
    defer?: boolean;
    /**
     * Strategy for deciding if the user confirmed or cancelled.
     * If omitted, implementation defaults are not specified here (but handled in logic).
     */
    decision: ConfirmableDecision<TComponentType>;
}

/**
 * Classic mode payload that allows omitting components when clearing the UI.
 */
export type MaybeClearedClassic = Except<ClassicPayload, 'components'> & {
    components?: readonly RowLike[];
};

/**
 * Outcome UI factories used by classic message component rows.
 */
export interface ConfirmableOutcomeUiClassic {
    /** Factory invoked when the user cancels the prompt. */
    onCancel: ConfirmableFactory<MaybeClearedClassic>;
    /** Factory invoked when the prompt times out. */
    onTimeout: ConfirmableFactory<MaybeClearedClassic>;
    /** Factory invoked when the user confirms the prompt. */
    onConfirm?: ConfirmableFactory<MaybeClearedClassic>;
}

/**
 * Outcome UI factories used by the Component V2 container API.
 */
export interface ConfirmableOutcomeUiV2 {
    /** Factory invoked when the user cancels the prompt. */
    onCancel: ConfirmableFactory<ComponentsV2Payload>;
    /** Factory invoked when the prompt times out. */
    onTimeout: ConfirmableFactory<ComponentsV2Payload>;
    /** Factory invoked when the user confirms the prompt. */
    onConfirm?: ConfirmableFactory<ComponentsV2Payload>;
}

/**
 * Configuration for Confirmable when using classic message component rows.
 */
export interface ConfirmableClassicOptions<
    TComponentType extends MessageComponentType = ComponentType.Button
> extends ConfirmableSharedOptions<TComponentType> {
    mode: 'classic';
    /** Prompt content or embed factory shown to the user. */
    prompt: ConfirmableFactory<BuilderComponent<'embed'> | string>;
    /** Action row factory producing confirm and cancel components. */
    rows: ConfirmableFactory<NonEmptyTuple<RowLike>>;
    /** Outcome UI factories applied once the decision is resolved. */
    outcomeUi?: ConfirmableOutcomeUiClassic;
}

/**
 * Configuration for Confirmable when using the Component V2 container API.
 */
export interface ConfirmableComponentsV2Options<
    TComponentType extends MessageComponentType = ComponentType.Button
> extends ConfirmableSharedOptions<TComponentType> {
    mode: 'v2';
    /** Container factory that renders the confirmation UI. */
    container: ConfirmableFactory<BuilderComponent<'container'>>;
    /** Outcome UI factories applied once the decision is resolved. */
    outcomeUi?: ConfirmableOutcomeUiV2;
}

/**
 * Union of supported Confirmable configuration variants.
 */
export type ConfirmableOptions<TComponentType extends MessageComponentType = ComponentType.Button> =
    | ConfirmableClassicOptions<TComponentType>
    | ConfirmableComponentsV2Options<TComponentType>;

/**
 * Supported signature for the question argument passed to {@link Confirmable}.
 *
 * Can either be a static string or a factory that resolves the question dynamically (the handler context is bound to `this` and passed as the first argument).
 */
export type ConfirmableQuestionInput = string | ((this: RepliableInteractionHandler) => Promisable<string>);
