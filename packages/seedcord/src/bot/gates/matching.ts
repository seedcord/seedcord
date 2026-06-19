import type { EventGateContext, Gate, GateContextBase, InteractionGateContext, RequiredOf } from './Gate';
import type { ValidEventTypes } from '@handlers/BaseHandler';
import type { EventHandler } from '@handlers/event';
import type { InteractionHandler } from '@handlers/interaction/InteractionHandler';
import type {
    ButtonInteraction,
    ChannelSelectMenuInteraction,
    ChatInputCommandInteraction,
    MentionableSelectMenuInteraction,
    MessageContextMenuCommandInteraction,
    ModalSubmitInteraction,
    RoleSelectMenuInteraction,
    StringSelectMenuInteraction,
    UserContextMenuCommandInteraction,
    UserSelectMenuInteraction
} from 'discord.js';
import type { Constructor } from 'type-fest';

// not type-fest UnionToIntersection, which collapses a union-context gate to never. this keeps each arm whole
export type IntersectRequired<Gates extends readonly Gate<GateContextBase>[]> = Gates extends readonly [
    infer First extends Gate<GateContextBase>,
    ...infer Rest extends readonly Gate<GateContextBase>[]
]
    ? RequiredOf<First> & IntersectRequired<Rest>
    : unknown;

// a combinator of one gate is just that gate, so and/or take two or more
export type TwoOrMore<Item> = readonly [Item, Item, ...Item[]];

type GateName<TGate> = TGate extends Gate<GateContextBase, infer Name> ? Name : string;

// joins the arm names so a combinator gate names its arms in a mismatch error instead of the wildcard string
export type JoinNames<Gates extends readonly Gate<GateContextBase>[], Sep extends string> = Gates extends readonly [
    infer Only extends Gate<GateContextBase>
]
    ? GateName<Only>
    : Gates extends readonly [
            infer First extends Gate<GateContextBase>,
            ...infer Rest extends readonly Gate<GateContextBase>[]
        ]
      ? `${GateName<First>}${Sep}${JoinNames<Rest, Sep>}`
      : string;

// the bound is the structural shape, not a generic. a generic unknown bound widens ProvidedContext to the
// full Repliables, which breaks the per-kind checks
export type AnyHandlerCtor = abstract new (...args: never[]) => {
    execute(): Promise<void>;
    getEvent(): ValidEventTypes;
};

// a marker no gate's required context matches, so @Gated rejects every gate on an autocomplete handler
declare const UngateableBrand: unique symbol;
interface Ungateable {
    readonly [UngateableBrand]: true;
}

// the interaction or event context a handler provides. autocomplete matches neither arm and maps to
// Ungateable, a refusal there has no reply target
type ProvidedContext<TCtor extends AnyHandlerCtor> =
    InstanceType<TCtor> extends InteractionHandler<infer Repliable>
        ? InteractionGateContext<Repliable>
        : InstanceType<TCtor> extends EventHandler<infer Names>
          ? EventGateContext<Names>
          : Ungateable;

// the short label a context targets, so a mismatch error names the kind instead of dumping the raw
// (and TS-truncated) djs context type
type KindName<Ctx> = Ctx extends Ungateable
    ? 'autocomplete'
    : Ctx extends InteractionGateContext<infer R>
      ? R extends ChatInputCommandInteraction
          ? 'Slash'
          : R extends MessageContextMenuCommandInteraction
            ? 'MessageMenu'
            : R extends UserContextMenuCommandInteraction
              ? 'UserMenu'
              : R extends StringSelectMenuInteraction
                ? 'StringSelect'
                : R extends UserSelectMenuInteraction
                  ? 'UserSelect'
                  : R extends RoleSelectMenuInteraction
                    ? 'RoleSelect'
                    : R extends ChannelSelectMenuInteraction
                      ? 'ChannelSelect'
                      : R extends MentionableSelectMenuInteraction
                        ? 'MentionableSelect'
                        : R extends ButtonInteraction
                          ? 'Button'
                          : R extends ModalSubmitInteraction
                            ? 'Modal'
                            : 'an interaction'
      : Ctx extends EventGateContext<infer N>
        ? `${N & string} event`
        : 'an agnostic';

type GateMismatch<
    Name extends string,
    Want extends string,
    Got extends string
> = `gate '${Name}' wants a ${Want} handler but this handler is ${Got}`;

// brackets match Provided whole, a bare union would distribute and pass on a partial fit. on a mismatch the
// message goes in a Constructor tuple so TS prints it inline, not a truncated djs context type
type GateFits<Provided, TGate> = [Provided] extends [RequiredOf<TGate>]
    ? TGate
    : TGate extends Gate<infer Req, infer Name>
      ? Constructor<[GateMismatch<Name, KindName<Req>, KindName<Provided>>]>
      : never;

export type FitAll<TCtor extends AnyHandlerCtor, Gates extends readonly Gate<GateContextBase>[]> = {
    [Index in keyof Gates]: GateFits<ProvidedContext<TCtor>, Gates[Index]>;
};
