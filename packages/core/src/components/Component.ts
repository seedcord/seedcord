import { ContainerBuilder, ContextMenuCommandBuilder, EmbedBuilder, SlashCommandBuilder } from '@discordjs/builders';
import { InteractionContextType } from 'discord-api-types/v10';

import { getBotColor } from './botColorHolder';
import { BuilderTypes, RowTypes } from './builderTypes';
import { resolveColor } from './resolveColor';

import type { BuilderType, InstantiatedActionRow, InstantiatedBuilder, RowType } from './builderTypes';

/**
 * Base class for Discord component wrappers.
 *
 * @typeParam TComponent - The Discord.js component type being wrapped
 *
 * @internal
 */
abstract class BaseComponent<TComponent> {
    private readonly _component: TComponent;

    protected constructor(ComponentClass: new () => TComponent) {
        this._component = new ComponentClass();
    }

    /**
     * Returns the live builder, ready to send in a Discord message or nest in another component.
     *
     * Configure it through `this.instance`. Reading this can apply the bot color (see
     * {@link BuilderComponent}), so it has a side effect.
     * @example new SomeComponent().component
     */
    public abstract get component(): InstantiatedBuilder<BuilderType> | InstantiatedActionRow<RowType>;

    /**
     * The wrapped builder, for calling Discord.js methods like setTitle() and setDescription() inside a subclass.
     *
     * @example this.instance.setTitle('My Modal')
     */
    protected get instance(): TComponent {
        return this._component;
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
    private colorApplied = false;

    protected constructor(public readonly type: BuilderKey) {
        const ComponentClass = BuilderTypes[type] as unknown;
        super(ComponentClass as new () => InstantiatedBuilder<BuilderKey>);

        if (this.instance instanceof SlashCommandBuilder || this.instance instanceof ContextMenuCommandBuilder) {
            this.instance.setContexts(InteractionContextType.Guild);
        }
    }

    get component(): InstantiatedBuilder<BuilderKey> {
        this.applyBotColor();
        return this.instance;
    }

    // Resolving in the constructor would capture the default for a component built before setBotColor()
    // ran. The unset check keeps a color the subclass set for itself.
    private applyBotColor(): void {
        if (this.colorApplied) return;
        this.colorApplied = true;

        const color = getBotColor();
        if (this.instance instanceof EmbedBuilder) {
            if (this.instance.data.color === undefined) this.instance.setColor(resolveColor(color));
        } else if (this.instance instanceof ContainerBuilder) {
            const accent = this.instance.data.accent_color;
            if (accent === null || accent === undefined) {
                this.instance.setAccentColor(color === 'Default' ? undefined : resolveColor(color));
            }
        }
    }
}

/**
 * Base class for Discord action row components
 *
 * Wraps Discord.js action row builder with Seedcord-specific defaults and helper methods.
 *
 * @typeParam RowKey - The Discord.js action row type being wrapped
 */
export abstract class RowComponent<RowKey extends RowType> extends BaseComponent<InstantiatedActionRow<RowKey>> {
    protected constructor(public readonly type: RowKey) {
        const ComponentClass = RowTypes[type] as unknown;
        super(ComponentClass as new () => InstantiatedActionRow<RowKey>);
    }

    get component(): InstantiatedActionRow<RowKey> {
        return this.instance;
    }
}
