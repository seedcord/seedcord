export type * from './registries/ContextMenuRegistry';
export type * from './registries/SlashOptionRegistry';

export { BuilderComponent, RowComponent } from './components/Component';
export { type RowType, type BuilderType } from './components/builderTypes';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
