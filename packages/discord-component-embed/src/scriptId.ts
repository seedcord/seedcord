// discord reads only a script with this exact id
export const SCRIPT_ID = 'discord:component-embed';

export const EMBED_TYPE = 'application/vnd.discord.component-embed+json';

// discord's crawler skips a <script> or <link> without one of these types
export const EMBED_TYPES: readonly string[] = [EMBED_TYPE, 'application/json'];
