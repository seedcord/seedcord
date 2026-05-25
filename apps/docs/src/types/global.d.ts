// Side-effect imports for static assets. Required under TypeScript 6 strict
// module resolution, which no longer infers wildcard module shapes from
// .css / .scss / .module.css side-effect imports.

declare module '*.css';
declare module '*.scss';
declare module '*.svg';
