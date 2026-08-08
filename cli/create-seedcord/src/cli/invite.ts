const AUTHORIZE = 'https://discord.com/oauth2/authorize';
const SNOWFLAKE = /^\d{17,20}$/;

// the first token part is the application id in base64
export function inviteUrl(token: string): string | null {
    const [encoded] = token.split('.');
    if (encoded === undefined || encoded === '') return null;

    const applicationId = Buffer.from(encoded, 'base64').toString('utf8');
    if (!SNOWFLAKE.test(applicationId)) return null;

    // Discord reads the scopes and permissions off the app's Installation tab
    return `${AUTHORIZE}?client_id=${applicationId}`;
}
