// tsdown swaps this at build time only where `process` is the global
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
