import type { SlashRegistry } from '@seedcord/core';
import type { SlashOptions as OptionView } from '@seedcord/core/internal';
import type {
    APIAttachment,
    APIInteractionDataResolvedChannelBase,
    APIInteractionDataResolvedGuildMember,
    APIRole,
    APIThreadChannel,
    APIUser,
    ChannelType,
    ThreadChannelType
} from 'discord-api-types/v10';

// one union member per channel type so the view's Extract resolves to one
type ResolvedChannelOf<Type extends ChannelType> = APIInteractionDataResolvedChannelBase<Type> &
    (Type extends ThreadChannelType ? Pick<APIThreadChannel, 'parent_id' | 'thread_metadata'> : unknown);

type AnyResolvedChannel = { [Type in ChannelType]: ResolvedChannelOf<Type> }[ChannelType];

interface HttpLens {
    user: APIUser;
    member: APIInteractionDataResolvedGuildMember;
    channel: AnyResolvedChannel;
    role: APIRole;
    mentionable: APIUser | APIInteractionDataResolvedGuildMember | APIRole;
    attachment: APIAttachment;
}

/**
 * The typed view over a chat-input command's options for one route on the HTTP transport. Each getter
 * restricts its `name` to that route's options of the matching kind, drops the null on required options,
 * narrows `choices` to their literal union, and only appears when the route has an option of that kind.
 * The rich kinds return `discord-api-types` payloads resolved from the interaction's `resolved` data.
 *
 * A channel option declared with `addChannelTypes` narrows `getChannel` to the matching resolved-channel
 * subtype.
 *
 * @typeParam Route - A route key from the generated {@link SlashRegistry}.
 */
export type SlashOptions<Route extends keyof SlashRegistry> = OptionView<Route, HttpLens>;
