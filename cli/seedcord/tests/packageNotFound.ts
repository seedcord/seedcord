// node's wording, with the importing file at the end
export function packageNotFound(name: string, importer: string): Error {
    return Object.assign(new Error(`Cannot find package '${name}' imported from ${importer}`), {
        code: 'ERR_MODULE_NOT_FOUND'
    });
}
