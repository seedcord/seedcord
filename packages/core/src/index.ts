import 'reflect-metadata';

export type * from '@registries/ContextMenuRegistry';
export type * from '@registries/SlashOptionRegistry';

export { RegisterCommand } from '@decorators/Command';
export { SelectMenuKind } from '@decorators/interactionRoutes';
export {
    AutocompleteRoute,
    ButtonRoute,
    ContextMenuRoute,
    ModalRoute,
    SelectMenuRoute,
    SlashRoute
} from '@decorators/routes';

export { DispatchContext } from '@src/dispatch/DispatchContext';
export type { DispatchState } from '@src/dispatch/DispatchContext';

export { BaseHandler } from '@src/handlers/BaseHandler';
export { RepliableHandler } from '@src/handlers/RepliableHandler';

export type { CoreBase } from '@interfaces/CoreBase';

export type { Initializeable } from '@src/plugin/Plugin';

export { ShutdownPhase, StartupPhase } from '@src/lifecycle/phases';

export { defineEffectGate, defineGate } from '@gates/Gate';
export type { EffectGate, Gate, GateContextBase, GuildPermissionsContext, RequiredOf } from '@gates/Gate';
export { and, or } from '@gates/combinators';
export { DmOnly, GuildOnly, OwnerOnly } from '@gates/catalog/access';
export { Cooldown, type CooldownOptions } from '@gates/catalog/Cooldown';
export { RequireBotPermissions, RequirePermissions, RequireRole } from '@gates/catalog/permissions';
export type { PermissionScope, RequirePermissionsOptions, RequireRoleOptions } from '@gates/catalog/permissions';
export type { GateNoticeOptions } from '@gates/catalog/options';

export { BuilderComponent, RowComponent } from '@components/Component';
export { type RowType, type BuilderType } from '@components/builderTypes';

export { Notice } from '@stops/Notice';
export { Fault } from '@stops/Fault';
export { Silence } from '@stops/Silence';

export { CustomId } from '@customId/CustomId';

export type { AutocompleteOptions } from '@inputs/AutocompleteOptions';

export { paginate } from '@pagination/paginate';
export { type PageView } from '@pagination/PageView';

export { Bus, Subscribe, Subscriber, WebhookLog, WebhookUrl } from '@subscribers/index';
export type {
    DispatchOutcome,
    FaultSource,
    SubscribeOptions,
    Subscriptions,
    SubscriptionData,
    SubscriptionKey,
    WebhookFile,
    WebhookReport
} from '@subscribers/index';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
