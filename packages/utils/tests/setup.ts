import { clearBuiltFiles } from './builtFilesSlot';

// vi.resetModules doesn't reset globalThis
clearBuiltFiles();
