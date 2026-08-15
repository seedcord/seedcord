import { TextDisplayBuilder } from '@discordjs/builders';

import { BuilderComponent } from '#components/Component';

// built fresh inside a Notice's render to back its ComponentsV2 reply
// discord renders the ### line as an h3 with the description below
export class NoticeCard extends BuilderComponent<'container'> {
    public constructor(description: string, title = 'Cannot Proceed') {
        super('container');
        this.instance.addTextDisplayComponents(new TextDisplayBuilder().setContent(`### ${title}\n${description}`));
    }
}
