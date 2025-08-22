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
  context_menu: ContextMenuCommandBuilder,
  subcommand: SlashCommandSubcommandBuilder,
  group: SlashCommandSubcommandGroupBuilder
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

/**
 * Base class for Discord component wrappers
 *
 * Provides common functionality for building Discord components with proper typing.
 *
 * @typeParam TComponent - The Discord.js component type being wrapped
 */
abstract class BaseComponent<TComponent> {
  private readonly _component: TComponent;

  // eslint-disable-next-line @typescript-eslint/naming-convention
  protected constructor(ComponentClass: new () => TComponent) {
    this._component = new ComponentClass();
  }

  /**
   * Gets the built component (should be considered read-only)
   *
   * Returns the finalized component ready for use in Discord messages.
   *
   * Please do not use for further configuration, use `this.instance` for that.
   * @example new SomeComponent().component
   */
  public abstract get component(): InstantiatedBuilder<BuilderType> | InstantiatedActionRow<ActionRowComponentType>;

  /**
   * Gets the component instance for configuration
   *
   * Use this to access Discord.js builder methods like setTitle(), setDescription(), etc.
   *
   * Use this in your component classes to configure the builder
   * @example this.instance.setTitle('My Modal')
   */
  protected get instance(): TComponent {
    return this._component;
  }

  /**
   * Builds a customId string for interactive components
   *
   * Creates customIds in the format "prefix:arg1-arg2-arg3" for buttons, modals, etc.
   * Arguments are joined with hyphens and separated from prefix with a colon.
   *
   * @param prefix - The route prefix that handlers will match against
   * @param args - Additional arguments to encode in the customId
   * @returns Formatted customId string
   */
  public buildCustomId(prefix: string, ...args: string[]): string {
    if (args.length === 0) return prefix;
    return `${prefix}:${args.join('-')}`;
  }
}

/**
 * Base class for Discord.js builder components
 *
 * Wraps Discord.js builders (SlashCommandBuilder, EmbedBuilder, etc.) with
 * Seedcord-specific defaults and helper methods.
 *
 * @typeParam BuilderKey - The type of Discord.js builder being wrapped
 */
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
}

/**
 * Base class for Discord action row components
 *
 * Wraps Discord.js action row builder with Seedcord-specific defaults and helper methods.
 *
 * @typeParam RowKey - The Discord.js action row type being wrapped
 */
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

/**
 * Action row wrapper for modal components
 *
 * Automatically wraps modal field components in an action row for use in modals.
 *
 * @typeParam ModalKey - The type of modal field component being wrapped
 * @internal
 */
class ModalRow<ModalKey extends ModalFieldTypes> extends RowComponent<'modal'> {
  /**
   * Creates a new modal action row with the specified component.
   *
   * @param component - The modal field component to wrap in an action row
   */
  constructor(component: InstantiatedModalField<ModalKey>) {
    super('modal');

    this.instance.addComponents(component);
  }
}

/**
 * Base class for modal field components
 *
 * Wraps Discord.js modal field builders (TextInputBuilder, etc.) and
 * packages them in action rows for use in modals.
 *
 * @typeParam ModalKey - The type of modal field builder being wrapped
 */
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

/**
 * Pre-configured error embed with default styling
 *
 * This is bundled in {@link CustomError}s as the response.
 */
export class BaseErrorEmbed extends BuilderComponent<'embed'> {
  /**
   * Creates a new error embed with default configuration.
   */
  public constructor() {
    super('embed');
    this.instance.setTitle('Cannot Proceed');
  }
}

/**
 * Base class for custom error types with Discord embed responses
 *
 * Errors extending CustomError should be used with the `Catchable` decorators to implement a control flow. These errors will be caught and handled by the framework to show the user the configured response.
 */
export abstract class CustomError extends Error {
  protected _emit = false;
  public readonly response = new BaseErrorEmbed().component;

  protected constructor(public override message: string) {
    super(message);
    Error.captureStackTrace(this, this.constructor);
  }

  /**
   * Whether this error should be emitted to logs
   *
   * Controls logging behavior. Errors with emit=true will always be logged,
   * while emit=false errors may be suppressed in production.
   *
   * @returns True if the error should be logged
   */
  public get emit(): boolean {
    return this._emit;
  }
}

/** Constructor type for custom error classes */
export type CustomErrorConstructor = new (message: string, ...args: any[]) => CustomError;
