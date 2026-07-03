import { describe, expect, it, beforeEach } from 'vitest';

import { setBotColor } from '../../src/components/botColorHolder';
import { Colors } from '../../src/components/colors';
import { BuilderComponent } from '../../src/components/Component';
import { resolveColor } from '../../src/components/resolveColor';

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
        this.instance.setAccentColor(0xef_48_60);
    }
}

class PresetEmbed extends BuilderComponent<'embed'> {
    constructor() {
        super('embed');
        this.instance.setColor(0xef_48_60);
    }
}

describe('BuilderComponent bot color', () => {
    beforeEach(() => {
        setBotColor(undefined);
    });

    it('resolves a numeric color into a container accent', () => {
        setBotColor(0xfe_56_5a);
        expect(new TestContainer().component.data.accent_color).toBe(0xfe_56_5a);
    });

    it('resolves a named color into a container accent', () => {
        setBotColor('Red');
        expect(new TestContainer().component.data.accent_color).toBe(Colors.Red);
    });

    it('applies the bot color to an embed', () => {
        setBotColor('#123456');
        expect(new TestEmbed().component.data.color).toBe(0x12_34_56);
    });

    it('leaves the container accent unset when no bot color is configured', () => {
        expect(new TestContainer().component.data.accent_color).toBeUndefined();
    });

    it('does not overwrite a color the subclass set in its own constructor', () => {
        setBotColor(0xfe_56_5a);
        expect(new PresetContainer().component.data.accent_color).toBe(0xef_48_60);
    });

    it('applies the default color to an embed only when the subclass set none', () => {
        expect(new PresetEmbed().component.data.color).toBe(0xef_48_60);
        expect(new TestEmbed().component.data.color).toBe(resolveColor('Default'));
    });
});
