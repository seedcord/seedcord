// compile-only. tc fails on any unused @ts-expect-error below.
import { MountedPath } from '#src/MountedPath';

declare const baseUrl: URL;

function takesAPathRelativeToTheBot(): void {
    void new MountedPath(baseUrl, 'oauth/callback');
    // @ts-expect-error a path that starts with a slash replaces the bot's own path
    void new MountedPath(baseUrl, '/oauth/callback');
}

void takesAPathRelativeToTheBot;
