import { SeedcordErrorCode } from '@seedcord/errors';
import { SeedcordTypeError } from '@seedcord/errors/internal';
import { ChannelType, ComponentType } from 'discord-api-types/v10';

import { pick } from '#inputs/pick';

import type { Collection } from '@discordjs/collection';
import type {
    APIAttachment,
    APIInteractionDataResolved,
    APIInteractionDataResolvedChannel,
    APIInteractionDataResolvedGuildMember,
    APIModalSubmission,
    APIRole,
    APIUser,
    ModalSubmitComponent
} from 'discord-api-types/v10';

type FieldKind = ModalSubmitComponent['type'];
type KindWithValues = Extract<ModalSubmitComponent, { values: string[] }>['type'];

interface KindLabel {
    label: string;
    getter: string;
}

const FIELD_KINDS: Record<FieldKind, KindLabel> = {
    [ComponentType.TextInput]: { label: 'a text input', getter: 'getTextInputValue' },
    [ComponentType.StringSelect]: { label: 'a string select', getter: 'getStringSelectValues' },
    [ComponentType.UserSelect]: { label: 'a user select', getter: 'getSelectedUsers' },
    [ComponentType.RoleSelect]: { label: 'a role select', getter: 'getSelectedRoles' },
    [ComponentType.MentionableSelect]: { label: 'a mentionable select', getter: 'getSelectedMentionables' },
    [ComponentType.ChannelSelect]: { label: 'a channel select', getter: 'getSelectedChannels' },
    [ComponentType.FileUpload]: { label: 'a file upload', getter: 'getUploadedFiles' },
    [ComponentType.RadioGroup]: { label: 'a radio group', getter: 'getRadioGroup' },
    [ComponentType.CheckboxGroup]: { label: 'a checkbox group', getter: 'getCheckboxGroup' },
    [ComponentType.Checkbox]: { label: 'a checkbox', getter: 'getCheckbox' }
};

function nameOfChannelType(type: ChannelType): string {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- ChannelType doesn't have a member for a type discord adds later
    return ChannelType[type] ?? String(type);
}

function listOf(values: string[]): string[] {
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- discord.js guards this key on every select kind
    return values ?? [];
}

function isKind<Kind extends FieldKind>(
    entry: ModalSubmitComponent,
    kinds: readonly Kind[]
): entry is Extract<ModalSubmitComponent, { type: Kind }> {
    return (kinds as readonly FieldKind[]).includes(entry.type);
}

/** The users, members, and roles a mentionable select picked. */
export interface SelectedMentionables {
    users: Collection<string, APIUser>;
    members: Collection<string, APIInteractionDataResolvedGuildMember>;
    roles: Collection<string, APIRole>;
}

/**
 * The fields a modal carries, read by custom id.
 *
 * Every getter throws when no field in the modal has that custom id. It also throws when the field holds a
 * kind that getter does not read. The message names the getter that does.
 *
 * A select getter resolves the ids its field picked against the interaction's `resolved` data and returns a
 * `Collection` keyed by id. A field that picked nothing returns null. Pass `required` to throw there instead.
 */
export class ModalFields {
    private readonly entries = new Map<string, ModalSubmitComponent>();
    private readonly resolved: APIInteractionDataResolved | undefined;

    constructor(data: APIModalSubmission) {
        this.resolved = data.resolved;
        // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- the wire can omit components even though the typing requires it
        for (const component of data.components ?? []) {
            // discord nests each field under an action row or a label
            if ('components' in component) {
                for (const child of component.components) this.entries.set(child.custom_id, child);
            }
            if ('component' in component) this.entries.set(component.component.custom_id, component.component);
        }
    }

    private entry(customId: string): ModalSubmitComponent {
        const found = this.entries.get(customId);
        if (!found) throw new SeedcordTypeError(SeedcordErrorCode.ModalFieldNotFound, [customId]);
        return found;
    }

    private field<Kind extends FieldKind>(
        customId: string,
        kinds: readonly Kind[]
    ): Extract<ModalSubmitComponent, { type: Kind }> {
        const entry = this.entry(customId);
        if (!isKind(entry, kinds)) {
            // a modal can carry a component type newer than this enum
            const known = (FIELD_KINDS as Partial<Record<ComponentType, KindLabel>>)[entry.type];
            const args = known
                ? ([customId, known.label, known.getter] as const)
                : ([customId, `component type ${entry.type}`] as const);
            throw new SeedcordTypeError(SeedcordErrorCode.ModalFieldWrongKind, [...args]);
        }
        return entry;
    }

    private selected<Value>(
        customId: string,
        kinds: readonly KindWithValues[],
        bucket: Record<string, Value> | undefined,
        required: boolean
    ): Collection<string, Value> | null {
        const { values } = this.field(customId, kinds);
        const found = pick(values, bucket);
        if (found.size > 0) return found;
        if (required) throw new SeedcordTypeError(SeedcordErrorCode.ModalFieldEmpty, [customId]);
        return null;
    }

    /**
     * Returns the field with this custom id, as Discord sent it. Use it for a component type the typed
     * getters do not cover.
     *
     * Pass a component type to get that exact type back. It throws when the field holds a different one.
     */
    getField<Kind extends FieldKind>(customId: string, kind: Kind): Extract<ModalSubmitComponent, { type: Kind }>;
    getField(customId: string): ModalSubmitComponent;
    getField(customId: string, kind?: FieldKind): ModalSubmitComponent {
        return kind === undefined ? this.entry(customId) : this.field(customId, [kind]);
    }

    getTextInputValue(customId: string): string {
        return this.field(customId, [ComponentType.TextInput]).value;
    }

    getStringSelectValues(customId: string): string[] {
        return listOf(this.field(customId, [ComponentType.StringSelect]).values);
    }

    getSelectedUsers(customId: string, required: true): Collection<string, APIUser>;
    getSelectedUsers(customId: string, required?: boolean): Collection<string, APIUser> | null;
    getSelectedUsers(customId: string, required = false): Collection<string, APIUser> | null {
        const kinds = [ComponentType.UserSelect, ComponentType.MentionableSelect] as const;
        return this.selected(customId, kinds, this.resolved?.users, required);
    }

    /** The guild members behind the picked users. Discord resolves these only inside a guild. */
    getSelectedMembers(customId: string): Collection<string, APIInteractionDataResolvedGuildMember> | null {
        const kinds = [ComponentType.UserSelect, ComponentType.MentionableSelect] as const;
        return this.selected(customId, kinds, this.resolved?.members, false);
    }

    getSelectedRoles(customId: string, required: true): Collection<string, APIRole>;
    getSelectedRoles(customId: string, required?: boolean): Collection<string, APIRole> | null;
    getSelectedRoles(customId: string, required = false): Collection<string, APIRole> | null {
        const kinds = [ComponentType.RoleSelect, ComponentType.MentionableSelect] as const;
        return this.selected(customId, kinds, this.resolved?.roles, required);
    }

    /** Pass `channelTypes` to throw when a pick falls outside those types. */
    getSelectedChannels(
        customId: string,
        required: true,
        channelTypes?: readonly ChannelType[]
    ): Collection<string, APIInteractionDataResolvedChannel>;
    getSelectedChannels(
        customId: string,
        required?: boolean,
        channelTypes?: readonly ChannelType[]
    ): Collection<string, APIInteractionDataResolvedChannel> | null;
    getSelectedChannels(
        customId: string,
        required = false,
        channelTypes: readonly ChannelType[] = []
    ): Collection<string, APIInteractionDataResolvedChannel> | null {
        const kinds = [ComponentType.ChannelSelect] as const;
        const picked = this.selected(customId, kinds, this.resolved?.channels, required);
        if (!picked || channelTypes.length === 0) return picked;
        for (const found of picked.values()) {
            if (channelTypes.includes(found.type)) continue;
            const allowed = channelTypes.map(nameOfChannelType).join(', ');
            throw new SeedcordTypeError(SeedcordErrorCode.ModalFieldChannelType, [
                customId,
                nameOfChannelType(found.type),
                allowed
            ]);
        }
        return picked;
    }

    getSelectedMentionables(customId: string, required: true): SelectedMentionables;
    getSelectedMentionables(customId: string, required?: boolean): SelectedMentionables | null;
    getSelectedMentionables(customId: string, required = false): SelectedMentionables | null {
        const { values } = this.field(customId, [ComponentType.MentionableSelect]);
        const resolved = this.resolved;
        const picked: SelectedMentionables = {
            users: pick(values, resolved?.users),
            members: pick(values, resolved?.members),
            roles: pick(values, resolved?.roles)
        };
        if (picked.users.size + picked.members.size + picked.roles.size > 0) return picked;
        if (required) throw new SeedcordTypeError(SeedcordErrorCode.ModalFieldEmpty, [customId]);
        return null;
    }

    getUploadedFiles(customId: string, required: true): Collection<string, APIAttachment>;
    getUploadedFiles(customId: string, required?: boolean): Collection<string, APIAttachment> | null;
    getUploadedFiles(customId: string, required = false): Collection<string, APIAttachment> | null {
        const kinds = [ComponentType.FileUpload] as const;
        return this.selected(customId, kinds, this.resolved?.attachments, required);
    }

    getRadioGroup(customId: string, required: true): string;
    getRadioGroup(customId: string, required?: boolean): string | null;
    getRadioGroup(customId: string, required = false): string | null {
        // discord.js guards this key against an absent value
        const value = this.field(customId, [ComponentType.RadioGroup]).value ?? null;
        if (value !== null) return value;
        if (required) throw new SeedcordTypeError(SeedcordErrorCode.ModalFieldEmpty, [customId]);
        return null;
    }

    getCheckboxGroup(customId: string): string[] {
        return listOf(this.field(customId, [ComponentType.CheckboxGroup]).values);
    }

    getCheckbox(customId: string): boolean {
        return this.field(customId, [ComponentType.Checkbox]).value;
    }
}
