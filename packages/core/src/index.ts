import 'reflect-metadata';

export type * from '@registries/ContextMenuRegistry';
export type * from '@registries/SlashOptionRegistry';

export { RegisterCommand } from '@decorators/Command';

export type { CoreBase } from '@interfaces/CoreBase';

export { BuilderComponent, RowComponent } from '@components/Component';
export { type RowType, type BuilderType } from '@components/builderTypes';

export { Notice } from '@stops/Notice';
export { Fault } from '@stops/Fault';
export { Silence } from '@stops/Silence';

export { CustomId } from '@customId/CustomId';

export { paginate } from '@pagination/paginate';
export { type PageView } from '@pagination/PageView';

/** Package version */
export const version = process.env.PACKAGE_VERSION ?? '0.0.0';
