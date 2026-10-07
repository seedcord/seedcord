export interface Steps<Label extends string> {
    step<Result>(label: Label, task: () => Promise<Result>, note?: (result: Result) => string): Promise<Result>;
    detail(key: string, value: string): void;
}
