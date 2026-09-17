import { siteLinks } from './agents';

import type { SeedcordSite } from './agents';
import type { ReactElement } from 'react';

export interface AgentLinksProps {
    site: SeedcordSite;
}

/** The discovery relations as html, for a crawler that reads the page and never the headers. */
export function AgentLinks({ site }: AgentLinksProps): ReactElement {
    return (
        <>
            {siteLinks(site).map(({ rel, href, type }) => (
                <link key={rel} rel={rel} href={href} type={type} />
            ))}
        </>
    );
}
