const SNOWFLAKE = /^\d{17,20}$/;

export function isSnowflake(value: string): boolean {
    return SNOWFLAKE.test(value);
}
