export interface Choice<Value extends string> {
    readonly value: Value;
    readonly label: string;
    readonly hint?: string;
}
