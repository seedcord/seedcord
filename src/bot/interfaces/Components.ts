import {
  ActionRowBuilder,
  ButtonBuilder,
  EmbedBuilder,
  InteractionContextType,
  ModalActionRowComponentBuilder,
  ModalBuilder,
  SlashCommandBuilder,
  SlashCommandSubcommandBuilder,
  SlashCommandSubcommandGroupBuilder,
  StringSelectMenuBuilder,
  StringSelectMenuOptionBuilder,
  TextInputBuilder
} from 'discord.js';
import { Globals } from '../../core/library/globals/Globals';
import { TypedConstructor } from '../../core/library/types/Miscellaneous';

const BuilderTypes = {
  command: SlashCommandBuilder,
  embed: EmbedBuilder,
  button: ButtonBuilder,
  menu_string: StringSelectMenuBuilder,
  menu_option_string: StringSelectMenuOptionBuilder,
  modal: ModalBuilder,
  subcommand: SlashCommandSubcommandBuilder,
  group: SlashCommandSubcommandGroupBuilder
};

const RowTypes = {
  button: ActionRowBuilder<ButtonBuilder>,
  menu_string: ActionRowBuilder<StringSelectMenuBuilder>,
  modal: ActionRowBuilder<ModalActionRowComponentBuilder>
};

const ModalTypes = {
  text: TextInputBuilder
};

type BuilderType = keyof typeof BuilderTypes;
type InstantiatedBuilder<B extends BuilderType> = InstanceType<(typeof BuilderTypes)[B]>;

type ActionRowComponentType = keyof typeof RowTypes;
type InstantiatedActionRow<A extends ActionRowComponentType> = InstanceType<(typeof RowTypes)[A]>;

type ModalFieldTypes = keyof typeof ModalTypes;
type InstantiatedModalField<M extends ModalFieldTypes> = InstanceType<(typeof ModalTypes)[M]>;

abstract class BaseComponent<C> {
  private readonly _component: C;

  protected constructor(ComponentClass: new () => C) {
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
  protected get instance(): C {
    return this._component;
  }
}

export abstract class BuilderComponent<C extends BuilderType> extends BaseComponent<InstantiatedBuilder<C>> {
  protected constructor(type: C) {
    const ComponentClass = BuilderTypes[type] as unknown;
    super(ComponentClass as new () => InstantiatedBuilder<C>);

    // Override in builders
    if (this.instance instanceof EmbedBuilder) {
      this.instance.setColor(Globals.botColor);
    }

    // Override in builders
    if (this.instance instanceof SlashCommandBuilder) {
      this.instance.setContexts(InteractionContextType.Guild);
    }
  }

  get component(): InstantiatedBuilder<C> {
    // TODO: Add checks for specific builders that make sure mandatory fields are set

    return this.instance;
  }
}

export abstract class RowComponent<C extends ActionRowComponentType> extends BaseComponent<InstantiatedActionRow<C>> {
  protected constructor(type: C) {
    const ComponentClass = RowTypes[type] as unknown;
    super(ComponentClass as new () => InstantiatedActionRow<C>);
  }

  get component(): InstantiatedActionRow<C> {
    return this.instance;
  }
}

class ModalRow<M extends ModalFieldTypes> extends RowComponent<'modal'> {
  constructor(component: InstantiatedModalField<M>) {
    super('modal');

    this.instance.addComponents(component);
  }
}

export abstract class ModalComponent<M extends ModalFieldTypes> extends BaseComponent<InstantiatedModalField<M>> {
  protected constructor(type: M) {
    const ComponentClass = ModalTypes[type] as unknown;
    super(ComponentClass as new () => InstantiatedModalField<M>);
  }

  get component(): InstantiatedActionRow<'modal'> {
    return new ModalRow<M>(this.instance).component;
  }
}

export abstract class CustomError extends Error {
  protected _emit: boolean = false;

  public constructor(public override message: string) {
    super(message);
    Object.setPrototypeOf(this, new.target.prototype);
    this.name = new.target.name;
  }

  public get emit(): boolean {
    return this._emit;
  }
}

export class BaseError extends CustomError {
  constructor(public override message: string) {
    super(message);
  }
}

export type CustomErrorConstructor = new (message: string, ...args: any[]) => CustomError;
export type BaseErrorConstructor = TypedConstructor<typeof BaseError>;

export abstract class BaseErrorEmbed extends BuilderComponent<'embed'> {
  public constructor(public readonly error?: CustomError) {
    super('embed');
    this.instance.setTitle('Cannot Proceed');
  }
}

export type BaseErrorEmbedConstructor = TypedConstructor<typeof BaseErrorEmbed>;
