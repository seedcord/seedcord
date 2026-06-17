import { TextDisplayBuilder } from 'discord.js';

import { BuilderComponent } from '@components/Component';

/**
 * Built fresh inside a {@link Notice}'s `render` to back its ComponentsV2 reply. The title renders as
 * an h3 line with the description on the next line.
 */
export class NoticeCard extends BuilderComponent<'container'> {
    public constructor(description: string, title = 'Cannot Proceed') {
        super('container');
        this.instance.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}\n${description}`));
    }
}
