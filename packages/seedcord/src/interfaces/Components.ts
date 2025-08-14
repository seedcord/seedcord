import {
  ActionRowBuilder,
  ButtonBuilder,
  ChannelSelectMenuBuilder,
  ContextMenuCommandBuilder,
  EmbedBuilder,
  InteractionContextType,
  MentionableSelectMenuBuilder,
  ModalBuilder,
  RoleSelectMenuBuilder,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder,
  UserSelectMenuBuilder
} from 'discord.js';

import { Globals } from '../library/Globals';

import type { ModalActionRowComponentBuilder } from 'discord.js';

const BuilderTypes = {
  command: SlashCommandBuilder,
  embed: EmbedBuilder,
  button: ButtonBuilder,
  menu_string: StringSelectMenuBuilder,
  menu_option_string: StringSelectMenuOptionBuilder,
  menu_user: UserSelectMenuBuilder,
  menu_channel: ChannelSelectMenuBuilder,
  menu_mentionable: MentionableSelectMenuBuilder,
  menu_role: RoleSelectMenuBuilder,
  modal: ModalBuilder,
  subcommand: SlashCommandSubcommandBuilder,
  group: SlashCommandSubcommandGroupBuilder,
  context_menu: ContextMenuCommandBuilder
};

const RowTypes: {
  button: typeof ActionRowBuilder<ButtonBuilder>;
  menu_string: typeof ActionRowBuilder<StringSelectMenuBuilder>;
  menu_user: typeof ActionRowBuilder<UserSelectMenuBuilder>;
  menu_channel: typeof ActionRowBuilder<ChannelSelectMenuBuilder>;
  menu_mentionable: typeof ActionRowBuilder<MentionableSelectMenuBuilder>;
  menu_role: typeof ActionRowBuilder<RoleSelectMenuBuilder>;
  modal: typeof ActionRowBuilder<ModalActionRowComponentBuilder>;
} = {
  button: ActionRowBuilder<ButtonBuilder>,
  menu_string: ActionRowBuilder<StringSelectMenuBuilder>,
  menu_user: ActionRowBuilder<UserSelectMenuBuilder>,
  menu_channel: ActionRowBuilder<ChannelSelectMenuBuilder>,
  menu_mentionable: ActionRowBuilder<MentionableSelectMenuBuilder>,
  menu_role: ActionRowBuilder<RoleSelectMenuBuilder>,
  modal: ActionRowBuilder<ModalActionRowComponentBuilder>
};

const ModalTypes = {
  text: TextInputBuilder
};

type BuilderType = keyof typeof BuilderTypes;
type InstantiatedBuilder<BuilderKey extends BuilderType> = InstanceType<(typeof BuilderTypes)[BuilderKey]>;

type ActionRowComponentType = keyof typeof RowTypes;
type InstantiatedActionRow<RowKey extends ActionRowComponentType> = InstanceType<(typeof RowTypes)[RowKey]>;

type ModalFieldTypes = keyof typeof ModalTypes;
type InstantiatedModalField<ModalKey extends ModalFieldTypes> = InstanceType<(typeof ModalTypes)[ModalKey]>;

abstract class BaseComponent<TComponent> {
  private readonly _component: TComponent;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  protected constructor(ComponentClass: new () => TComponent) {
    this._component = new ComponentClass();
  }

  /**
   * @description Returns the configured component
   * @note Do not use for mutating using setters.
   * @see instance for mutating the component
   * @usage `new SomeComponent().component`
   */
  public abstract get component(): InstantiatedBuilder<BuilderType> | InstantiatedActionRow<ActionRowComponentType>;

  /**
   * @description Returns the instantiated component
   * @note Use this for configuring the component using its instance setters.
   * @usage `this.instance.someMethod()`
   */
  protected get instance(): TComponent {
    return this._component;
  }
}

export abstract class BuilderComponent<BuilderKey extends BuilderType> extends BaseComponent<
  InstantiatedBuilder<BuilderKey>
> {
  protected constructor(type: BuilderKey) {
    const ComponentClass = BuilderTypes[type] as unknown;
    super(ComponentClass as new () => InstantiatedBuilder<BuilderKey>);

    // Override in builders
    if (this.instance instanceof EmbedBuilder) this.instance.setColor(Globals.botColor);

    // Override in builders
    if (this.instance instanceof SlashCommandBuilder || this.instance instanceof ContextMenuCommandBuilder) {
      this.instance.setContexts(InteractionContextType.Guild);
    }
  }

  get component(): InstantiatedBuilder<BuilderKey> {
    // TODO: Add checks for specific builders that make sure mandatory fields are set

    return this.instance;
  }

  public buildCustomId(prefix: string, ...args: string[]): string {
    if (args.length === 0) return prefix;
    return `${prefix}:${args.join('-')}`;
  }
}

export abstract class RowComponent<RowKey extends ActionRowComponentType> extends BaseComponent<
  InstantiatedActionRow<RowKey>
> {
  protected constructor(type: RowKey) {
    const ComponentClass = RowTypes[type] as unknown;
    super(ComponentClass as new () => InstantiatedActionRow<RowKey>);
  }

  get component(): InstantiatedActionRow<RowKey> {
    return this.instance;
  }
}

class ModalRow<ModalKey extends ModalFieldTypes> extends RowComponent<'modal'> {
  constructor(component: InstantiatedModalField<ModalKey>) {
    super('modal');

    this.instance.addComponents(component);
  }
}

export abstract class ModalComponent<ModalKey extends ModalFieldTypes> extends BaseComponent<
  InstantiatedModalField<ModalKey>
> {
  protected constructor(type: ModalKey) {
    const ComponentClass = ModalTypes[type] as unknown;
    super(ComponentClass as new () => InstantiatedModalField<ModalKey>);
  }

  get component(): InstantiatedActionRow<'modal'> {
    return new ModalRow<ModalKey>(this.instance).component;
  }
}

export class BaseErrorEmbed extends BuilderComponent<'embed'> {
  public constructor() {
    super('embed');
    this.instance.setTitle('Cannot Proceed');
  }
}

export abstract class CustomError extends Error {
  protected _emit = false;
  public readonly response = new BaseErrorEmbed().component;

  protected constructor(public override message: string) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }

  public get emit(): boolean {
    return this._emit;
  }
}

export type CustomErrorConstructor = new (message: string, ...args: any[]) => CustomError;
