import { ChangelogFile } from '#src/release/ChangelogFile';
import { ChangelogSections } from '#src/release/ChangelogSections';

// the prune matches entries by their regrouped text
export function tidyChangelog(text: string): string {
    const regrouped = new ChangelogSections(text).regrouped().contents;

    return new ChangelogFile(regrouped).withoutSupersededPrereleases().contents;
}
