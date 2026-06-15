import { BuilderComponent } from '@components/Component';

/**
 * Built fresh inside a {@link Denial}'s `render` to back the embed arm of its reply.
 */
export class DenialEmbed extends BuilderComponent<'embed'> {
    public constructor(description: string, title = 'Cannot Proceed') {
        super('embed');
        this.instance.setTitle(title).setDescription(description);
    }
}
