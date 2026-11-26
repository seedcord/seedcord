import { ChangelogFile } from '#src/release/ChangelogFile';
import { ChangelogSections } from '#src/release/ChangelogSections';

// regroups last so it merges the bumps that the prune copies from each prerelease
export function tidyChangelog(text: string): string {
    const pruned = new ChangelogFile(text).withoutSupersededPrereleases().contents;

    return new ChangelogSections(pruned).regrouped().contents;
}
