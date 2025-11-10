import type { BuilderComponent, RowComponent } from '@interfaces/Components';
import type { RepliableInteractionHandler, Repliables } from '@interfaces/Handler';
import type { TypedOmit } from '@seedcord/types';
import type {
    MessageComponentInteraction,
    MessageComponentType,
    ComponentType,
    ButtonInteraction,
    StringSelectMenuInteraction,
    UserSelectMenuInteraction,
    RoleSelectMenuInteraction,
    MentionableSelectMenuInteraction,
    ChannelSelectMenuInteraction
} from 'discord.js';
import type { Promisable, TupleOf, IntClosedRange, NonEmptyTuple } from 'type-fest';

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
 * Information supplied to the optional onResolved callback.
 */
export interface ConfirmableResolution extends ConfirmableContext {
    /** Whether the user confirmed the action. */
    confirmed: boolean;
    /** Whether the confirmation UI timed out without a response. */
    timedOut: boolean;
    /** Interaction that resolved the decision, if any. */
    button?: MessageComponentInteraction;
}

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
 * Confirmable configuration shared across the classic and component V2 modes.
 */
export interface ConfirmableSharedOptions<TComponentType extends MessageComponentType = ComponentType.Button> {
    ephemeral?: boolean;
    timeoutMs?: number;
    componentType?: TComponentType;
    onResolved?: (r: ConfirmableResolution) => Promisable<void>;
    defer?: boolean;
}

/**
 * Classic mode payload that allows omitting components when clearing the UI.
 */
export type MaybeClearedClassic = TypedOmit<ClassicPayload, 'components'> & {
    components?: readonly RowLike[];
};

/**
 * Outcome UI factories used by classic message component rows.
 */
export interface OutcomeUiClassic {
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
export interface OutcomeUiV2 {
    /** Factory invoked when the user cancels the prompt. */
    onCancel: ConfirmableFactory<ComponentsV2Payload>;
    /** Factory invoked when the prompt times out. */
    onTimeout: ConfirmableFactory<ComponentsV2Payload>;
    /** Factory invoked when the user confirms the prompt. */
    onConfirm?: ConfirmableFactory<ComponentsV2Payload>;
}

/**
 * Source definition that resolves a confirmation decision from a component interaction.
 */
export interface ResolverSource<TComponentType extends MessageComponentType> {
    /** Message component type expected by the resolver. */
    componentType: TComponentType;
    /** Resolves whether the user confirmed the prompt. */
    resolveDecision: (i: ComponentInteractionFor<TComponentType>) => Promisable<boolean>;
}

/**
 * Source definition that lists custom IDs for confirm and cancel actions.
 */
export interface CustomIdSource {
    /** Custom IDs that should resolve the confirmation as accepted. */
    confirmCustomIds: readonly string[];
    /** Optional custom IDs that should resolve the confirmation as rejected. */
    cancelCustomIds?: readonly string[];
}

/**
 * Configuration for Confirmable when using classic message component rows.
 */
export type ConfirmableClassicOptions<TComponentType extends MessageComponentType = ComponentType.Button> =
    ConfirmableSharedOptions<TComponentType> &
        (ResolverSource<TComponentType> | CustomIdSource) & {
            /** Prompt content or embed factory shown to the user. */
            prompt: ConfirmableFactory<BuilderComponent<'embed'> | string>;
            /** Action row factory producing confirm and cancel components. */
            rows: ConfirmableFactory<NonEmptyTuple<RowLike>>;
            container?: never;
            /** Outcome UI factories applied once the decision is resolved. */
            outcomeUi: OutcomeUiClassic;
        };

/**
 * Configuration for Confirmable when using the Component V2 container API.
 */
export type ConfirmableComponentsV2Options<TComponentType extends MessageComponentType = ComponentType.Button> =
    ConfirmableSharedOptions<TComponentType> &
        (ResolverSource<TComponentType> | CustomIdSource) & {
            /** Container factory that renders the confirmation UI. */
            container: ConfirmableFactory<BuilderComponent<'container'>>;
            prompt?: never;
            rows?: never;
            /** Outcome UI factories applied once the decision is resolved. */
            outcomeUi: OutcomeUiV2;
        };

/**
 * Union of supported Confirmable configuration variants.
 */
export type ConfirmableOptions<TComponentType extends MessageComponentType = ComponentType.Button> =
    | ConfirmableClassicOptions<TComponentType>
    | ConfirmableComponentsV2Options<TComponentType>;

/**
 * Supported signature for the question argument passed to {@link Confirmable}.
 */
export type QuestionInput = string | (() => Promise<string>);
