import { assertDeclaredRuntime } from '#node/assertRuntimeVersion';

// the edge bundle never reaches this entry
assertDeclaredRuntime();

export * from '#node/Lifecycle';
export * from '#node/HealthCheck';
export { HealthResponder } from '#node/HealthResponder';
export { settleWithin } from '#src/lifecycle/withTimeout';
export { CommandRegistry } from '#node/commands/CommandRegistry';
export { shutdownOf } from '#node/ServerHost';
