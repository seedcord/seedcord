// a sample helper that a bot may keep in a subfolder of its locales folder
// if prepareCommands ever imports this file, the throw runs and the test for skipping subfolders fails
throw new Error('prepareCommands imported nested/helper.ts');
