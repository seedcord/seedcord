/**
 * Base class used to test inheritance documentation.
 */
export class BaseClass {
    /**
     * A property on the base class.
     */
    public baseProp = 'base';
}

/**
 * Represents a complex mock class for testing documentation generation.
 *
 * This class demonstrates various TypeScript features including modifiers,
 * generics, method overloading, and different property types.
 *
 * @typeParam TypeT - The generic type parameter T.
 * @typeParam TypeU - The generic type parameter U, constrained to number.
 *
 * @example
 * ```typescript
 * const instance = new MockClass<string, number>('hello', 42);
 * instance.publicMethod();
 * ```
 * @deprecated Use {@link NewMockClass} instead.
 * @see {@link MockEnum} for related enum.
 * @see {@link MockInterface} for interface examples.
 * @see {@link MockType} for type definitions.
 * @see {@link ReexportedForeign} for a symbol re-exported from another package.
 */
export class MockClass<TypeT, TypeU extends number> extends BaseClass {
    /**
     * A public readonly property.
     */
    public readonly publicReadonlyProp: TypeT;

    /**
     * A private static property.
     */
    private static readonly privateStaticProp = 'static';

    /**
     * A protected property with default value.
     */
    protected protectedProp: TypeU = 0 as TypeU;

    /**
     * A public optional property.
     * @public
     */
    public _optionalProp?: string | undefined;

    /**
     * Creates an instance of MockClass.
     *
     * @param publicReadonlyProp - The value for the public readonly property. {@link TypeT}
     * @param protectedProp - The initial value for the protected property.
     * @throws An {@link Error} If the protected prop is invalid.
     */
    constructor(publicReadonlyProp: TypeT, protectedProp: TypeU) {
        super();
        this.publicReadonlyProp = publicReadonlyProp;
        this.protectedProp = protectedProp;
    }

    /**
     * A public method with overloads.
     *
     * @param param - The parameter.
     * @returns The result.
     */
    public publicMethod(param1: TypeT, param2: TypeU): string;
    /**
     * @param param - The numeric parameter.
     * @returns The numeric result.
     */
    public publicMethod(param: TypeU): number;
    /**
     * @param param - The parameter of type TypeT or TypeU.
     * @returns The result.
     */
    public publicMethod(param: TypeT | TypeU, _param2?: TypeU): string | number {
        if (typeof param === 'number') {
            return param * 2;
        }
        void this.privateMethod(param);
        return MockClass.privateStaticProp; // eslint-disable-line @typescript-eslint/no-deprecated -- deprecated on purpose, the fixture tests deprecation rendering
    }

    /**
     * A private method.
     *
     * @param value - The value to process.
     * @returns The processed value.
     * @internal
     */
    private privateMethod(value: TypeT): TypeT {
        return value;
    }

    /**
     * A protected static method.
     *
     * @param input - The input value. {@default ''}
     * @returns The static result.
     * @internal
     */
    protected static protectedStaticMethod(input = ''): string {
        return input.toUpperCase();
    }

    /**
     * A getter for a computed property.
     *
     * @returns The computed value.
     */
    get computedProp(): string {
        return `${String(this.publicReadonlyProp)}-${String(this.protectedProp)}`;
    }

    /**
     * A setter for the optional property.
     *
     * @param value - The value to set.
     */
    set optionalProp(value: string | undefined) {
        this._optionalProp = value;
    }

    /**
     * A read-write accessor exposing both a getter and a setter.
     *
     * @returns The current label.
     * @throws An {@link Error} if the label was never initialized.
     */
    get label(): string {
        return this._optionalProp ?? '';
    }

    set label(value: string) {
        this._optionalProp = value;
    }

    /**
     * An async method.
     *
     * @param delay - The delay in milliseconds.
     * @returns A promise that resolves after the delay.
     */
    public async asyncMethod(delay: number): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, delay));
    }

    /**
     * A method with rest parameters.
     *
     * @param first - The first parameter.
     * @param rest - The rest of the parameters.
     * @returns The concatenated result.
     */
    public restMethod(first: string, ...rest: string[]): string {
        return [first, ...rest].join('-');
    }
}

// new fixtures go at the bottom. source-index.test.ts pins the line numbers above.

/**
 * A base class whose type parameter is constrained by an inline object type.
 *
 * @typeParam TypeM - The stored shape.
 */
export class InlineConstraintBase<TypeM extends { token: string }> {
    /**
     * The most recently stored value.
     */
    public stored: TypeM | null = null;
}

/**
 * A subclass that pins the base's type parameter with another inline object type.
 */
export class InlineConstraintChild extends InlineConstraintBase<{ token: string; revision: number }> {
    /**
     * A property the subclass declares itself.
     */
    public ownProp = 'child';
}

/**
 * A class whose own property shares its name with the constraint's key.
 */
export class InlineConstraintShadow<TypeM extends { token: string }> {
    /**
     * The token this instance stores.
     */
    public token: TypeM | null = null;
}

/**
 * A class whose constraint carries a call, a method, and a construct signature.
 */
export class InlineConstraintCallable<TypeM extends { (): void; run(): void; new (): object }> {
    /**
     * The value this instance holds.
     */
    public held: TypeM | null = null;
}

/**
 * A base class whose members a subclass overrides.
 */
export abstract class OverrideBase {
    /**
     * A tag the subclass narrows.
     */
    public tag = 'base';

    /**
     * A hook every subclass implements.
     *
     * @returns The hook result.
     */
    public abstract hook(): string;

    /**
     * Loads data in a subclass.
     *
     * @returns When loading finishes.
     */
    public abstract load(): Promise<void>;

    /**
     * A label the subclass replaces.
     */
    public label = 'base';

    /**
     * An event name that the word `readonly` contains.
     */
    public readonly on = 'ready';

    /**
     * The most instances a caller should build.
     */
    public static readonly LIMIT = 3;

    /**
     * Builds a label for a new instance.
     *
     * @returns The label.
     */
    public static create(): string {
        return 'base';
    }

    /**
     * Describes the instance.
     *
     * @returns The description.
     */
    public describe(): string {
        return this.tag;
    }
}

/**
 * A subclass with override members and an auto-accessor.
 */
export class OverrideChild extends OverrideBase {
    /**
     * Implements the base's abstract hook.
     *
     * @returns The hook result.
     */
    public hook(): string {
        return this.tag;
    }

    /**
     * Loads nothing.
     *
     * @returns When loading finishes.
     */
    public async load(): Promise<void> {
        await Promise.resolve();
    }

    /**
     * The subclass label.
     */
    public override label = 'child';

    /**
     * The subclass tag.
     */
    declare public tag: 'child';

    /**
     * A counter stored through an auto-accessor.
     */
    public accessor counter = 0;

    /**
     * Describes the subclass.
     *
     * @returns The description.
     */
    public override describe(): string {
        return `child:${this.tag}`;
    }

    /**
     * An instance method that shares its name with a static on the base.
     *
     * @returns The tag.
     */
    public create(): string {
        return this.tag;
    }
}
