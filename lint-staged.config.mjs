const quoteFiles = (files) => files.map((file) => `"${file.replace(/"/g, '\\"')}"`).join(' ');

const runPrettier = (files) => {
  const fileList = quoteFiles(files);
  return fileList ? [`prettier --ignore-unknown --write ${fileList}`] : [];
};

const runEslint = (files) => {
  const fileList = quoteFiles(files);
  return fileList ? [`eslint --max-warnings=0 --fix ${fileList}`] : [];
};

/**
 * @type {import('lint-staged').Configuration}
 */
const config = {
  '*': runPrettier,
  '*.{ts,tsx,js,jsx,cjs,mjs}': runEslint
};

export default config;
