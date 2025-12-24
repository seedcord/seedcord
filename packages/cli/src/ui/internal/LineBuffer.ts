export class LineBuffer {
    private carry = '';

    public push(chunk: string): string[] {
        const combined = this.carry + chunk;

        const parts = combined.split(/\r?\n/);
        const last = parts.pop();

        this.carry = last ?? '';
        return parts;
    }

    public flush(): string[] {
        if (!this.carry) return [];
        const out = this.carry;
        this.carry = '';
        return [out];
    }
}
