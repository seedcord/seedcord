// local stub of chalk, enough for the rule tester to resolve the import
interface Chalk {
    (text: string): string;
    (parts: TemplateStringsArray, ...values: unknown[]): string;
    hex(color: string): Chalk;
    dim: Chalk;
    red: Chalk;
    cyan: Chalk;
    green: Chalk;
}

declare const chalk: Chalk;
export default chalk;
