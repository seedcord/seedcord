import 'reflect-metadata';

// Errors.ts registers the two notices thrown by a failed decode
import '#customId/Errors';

export type { MessageContextMenuRegistry, UserContextMenuRegistry } from '#registries/ContextMenuRegistry';
export type { SlashRegistry } from '#registries/SlashRegistry';

export { Commands, ContextMenus } from '#src/commands/CommandInjector';
export type {
    CommandInfo,
    ContextMenuInfo,
    InjectedCommandMap,
    InjectedContextMenuMap
} from '#src/commands/CommandInjector';

export { RegisterCommand } from '#decorators/Command';
export { SelectMenuKind } from '#decorators/interactionRoutes';
export {
    AutocompleteRoute,
    ButtonRoute,
    MessageContextMenuRoute,
    UserContextMenuRoute,
    ModalRoute,
    SelectMenuRoute,
    SlashRoute
} from '#decorators/routes';

export { InteractionKind } from '#src/metadataKeys';

export { DispatchContext } from '#src/dispatch/DispatchContext';
export type { DispatchState } from '#src/dispatch/DispatchContext';

export { BaseHandler } from '#src/handlers/BaseHandler';
export { RepliableHandler } from '#src/handlers/RepliableHandler';

export { BaseReplySender } from '#reply/BaseReplySender';
export type { ModalLike } from '#reply/BaseReplySender';

export type { CoreBase } from '#interfaces/CoreBase';

export { ShutdownPhase, StartupPhase } from '#src/lifecycle/phases';

export { defineEffectGate, defineGate } from '#gates/Gate';
export type { EffectGate, Gate, GateContextBase, GuildPermissionsContext, RequiredOf } from '#gates/Gate';
export { and, or } from '#gates/combinators';
export { DmOnly, GuildOnly, OwnerOnly } from '#gates/catalog/access';
export { Cooldown, type CooldownOptions } from '#gates/catalog/Cooldown';
export { RequireBotPermissions, RequirePermissions, RequireRole } from '#gates/catalog/permissions';
export type { PermissionScope, RequirePermissionsOptions, RequireRoleOptions } from '#gates/catalog/permissions';
export type { GateNoticeOptions } from '#gates/catalog/options';

export { assertPermissions } from '#src/permissions/assert';
export type { PermissionAssertion, PermissionNoticeOverrides } from '#src/permissions/assert';
export { mergeRoles } from '#src/permissions/mergeRoles';

export { BuilderComponent, RowComponent } from '#components/Component';
export { type RowType, type BuilderType } from '#components/builderTypes';

export { Notice } from '#stops/Notice';
export { Fault } from '#stops/Fault';
export { Silence } from '#stops/Silence';

export { CustomId, setCustomIdErrors } from '@seedcord/custom-id';
export type { FieldOptions } from '@seedcord/custom-id';

export { ResolvedEmoji } from '#src/miscellaneous/emoji';

export type { AutocompleteOptions } from '#inputs/AutocompleteOptions';

export { paginate } from '#pagination/paginate';
export { type PageView } from '#pagination/PageView';
export { PaginatorBase } from '#pagination/PaginatorBase';
export type { PaginatorConfig } from '#pagination/PaginatorBase';
export { ArraySourceBase, CursorSourceBase } from '#pagination/sources';
export type { PageSourceBase } from '#pagination/sources';
export type { ControlCosmetics, ControlKey, PaginatorControls } from '#pagination/controls';
export type { ItemRender, PageRender } from '#pagination/render';

export { Bus, Subscribe, Subscriber, WebhookLog, WebhookUrl } from '#subscribers/index';
export type {
    AttemptedWrite,
    DispatchOutcome,
    FaultSource,
    ResponseAttempt,
    ResponseFailed,
    ResponseOutcome,
    ResponseSent,
    SubscribeOptions,
    Subscriptions,
    SubscriptionData,
    SubscriptionKey,
    WebhookFile,
    WebhookReport
} from '#subscribers/index';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
