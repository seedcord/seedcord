import { Colors } from 'discord.js';
import { describe, it, expect, beforeEach } from 'vitest';

import { BuilderComponent } from '../../src/interfaces/Components';
import { setBotColor } from '../../src/miscellaneous/botColorHolder';

class TestEmbed extends BuilderComponent<'embed'> {
    constructor() {
        super('embed');
    }
}

class TestContainer extends BuilderComponent<'container'> {
    constructor() {
        super('container');
    }
}

class PresetContainer extends BuilderComponent<'container'> {
    constructor() {
        super('container');
        this.instance.setAccentColor(0xef4860);
    }
}

describe('BuilderComponent bot color', () => {
    beforeEach(() => {
        setBotColor(undefined);
    });

    it('resolves a numeric ColorResolvable into a container accent', () => {
        setBotColor(0xfe565a);
        expect(new TestContainer().component.data.accent_color).toBe(0xfe565a);
    });

    it('resolves a named ColorResolvable into a container accent', () => {
        setBotColor('Red');
        expect(new TestContainer().component.data.accent_color).toBe(Colors.Red);
    });

    it('applies the bot color to an embed', () => {
        setBotColor('#123456');
        expect(new TestEmbed().component.data.color).toBe(0x123456);
    });

    it('leaves the container accent unset when no bot color is configured', () => {
        expect(new TestContainer().component.data.accent_color).toBeUndefined();
    });

    it('does not overwrite a color the subclass set in its own constructor', () => {
        setBotColor(0xfe565a);
        expect(new PresetContainer().component.data.accent_color).toBe(0xef4860);
    });
});
