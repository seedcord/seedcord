const START_TAB = 'start';

// every tab except Start is a folder under content/docs
export function tabPillFor(filePath: string): string {
    const [folder, ...rest] = filePath.split('/');
    return rest.length > 0 && folder !== undefined ? folder : START_TAB;
}
