/** Gives the default build's host a `fetch` the `workerd` build's host declares for itself. */
export class MockRuntimeBase {
    /** Answers one request through the base class. */
    public fetch(request: string): string {
        return request;
    }

    /** Closes the base host. */
    public close(): void {
        this.fetch('close');
    }
}

/** The default build's host. The `workerd` build exports its own class under this name. */
export class MockRuntimeHost extends MockRuntimeBase {
    /** Starts listening on a port. */
    public listen(port: number): number {
        return port;
    }

    // api extractor leaves an `@internal` class method out of the model
    /** @internal */
    public override close(): void {
        this.listen(0);
    }
}
