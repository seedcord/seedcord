- Write OOP code where it makes sense to. Favor inheritance and composition over functions. Use interfaces and abstract classes as needed. Although, don't overdo it. If a simple function makes more sense, use that instead. For functions, use function declarations instead of arrow functions unless absolutely necessary.

- classes should not be used like namespaces by relying on the static keyword. static should be used sparingly and only when it makes sense in context.

- DO NOT do any inline imports unless absolutely necessary. For example, `as import('some-package').SomeType`. BAD BAD BAD.

- Do NOT use "any" type unless it makes sense in context.

- DO NOT type cast 'as unknown as ...' if the type is already correct.

- DO NOT USE `as any` UNLESS ABSOLUTELY NECESSARY. TRY TO AVOID IT AT ALL COSTS. Use proper types instead.

- USE optional chaining and nullish coalescing instead of type casting.

- USE Utility Types from TypeScript or from @seedcord/types like TypedOmit, TypedPick, etc. to avoid type casting. type-fest is also installed if you need more utility types.

- Try to avoid type casting unless absolutely necessary.

- DO NOT cast types if the type is already correct.

- DO NOT try to lint or run scripts unless it's absolutely needed to complete the given task.

- DO NOT run `pnpm lint`. ALWAYS run `pnpm lint:fix` instead.

- After completing tasks, cd into the packages you've updated and run `pnpm tc` and `pnpm lint:fix` to ensure there are no type errors or linting issues.

- Remember to `pnpm tc` BEFORE you run code. Then run code to test changes. Then at the end you can run `pnpm tc` and `pnpm lint:fix` again to ensure everything is good.

- ALWAYS, I repeat, ALWAYS first cd into the package or app's directory, then run the command via pnpm. Note: If you've already cd'ed into the package or app's directory, you don't need to cd again. Just confirm what directory you're in IF needed on the "No such file or directory" error using `pwd`.

- If a terminal command is failing with the error saying 'No such file or directory', check to see if you're already in the correct directory. If not, cd into the correct directory first.

- For most eslint issues, after you make multiple file changes, just run lint:fix regularly instead of trying to fix each file individually. eslint will let you know if there are any remaining issues.

- If the linter it executes without finding any problems and you’re done with all tasks, just proceed to the summary section.

- Run only the commands available in the package or app's package.json scripts.

- At the end of your response, always include a summary of changes made in the files.

- The user is watching you change the files. If they see lint errors, they'll save the file which will auto-fix issues. In that case, just move on instead of getting stuck in a loop trying to fix errors that don't exist anymore.

- DO NOT edit AGENTS.md or TASKS.md unless explicitly told to do so.

- The user has tsx installed globally. so you can simply cd into the correct directory and run `tsx file.ts`

- Always follow DRY and SOLID principles.

- Moving and renaming files should be done with the `mv` command to ensure proper git tracking. It's also better than creating a new file and replacing contents.

- For files you plan to delete, simply change the file ext to `txt`. This way, git will track the change and you can always recover the file if needed.

- If files are large and cause a lint error because of that, consider breaking them down into smaller, more manageable files.

- Use ts paths if available instead of relative paths. (Check tsconfig.json)

- Import order eslint warnings and indentation and spacing eslint warnings can be fixed by running `pnpm lint:fix` after all changes are made.

- Don't directly add dependencies to package.jsons. use the `pnpm add` command so you pull the latest version instead.

- Make sure to check the declaration files for packages when using them to ensure usage of the latest and correct APIs.

- Check the closest package.json file to see if it has scripts you can use. For example a dev script. Don't hallucinate scripts.

- Make sure to build packages after making changes before using those changes in other packages or apps.

- After linting, the only acceptable result is 0 errors and 0 warnings.

- Make sure to run `pnpm test` in the relevant package or app after making changes to ensure nothing is broken.

- The "rg" command is available for searching through files. Make use of it to find usages of things across the codebase based on patterns.

- Don't use arrow functions unless a function can either be written in a single line (without {}), or if the function needs to be defined inside a class method or another function (to prevent incorrect use of "this").
