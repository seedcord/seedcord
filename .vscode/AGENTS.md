- DO NOT do any inline imports unless absolutely necessary. For example, `as import('some-package').SomeType`. BAD BAD BAD.

- Do NOT use "any" type unless it makes sense in context.

- DO NOT type cast 'as unknown as ...' if the type is already correct.

- USE optional chaining and nullish coalescing instead of type casting.

- USE Utility Types from TypeScript or from @seedcord/types like TypedOmit, TypedPick, etc. to avoid type casting.

- Try to avoid type casting unless absolutely necessary.

- DO NOT cast types if the type is already correct.

- DO NOT try to lint or run scripts unless it's absolutely needed to complete the given task.

- DO NOT run `pnpm lint`. ALWAYS run `pnpm lint:fix` instead.

- ALWAYS, I repeat, ALWAYS first cd into the package or app's directory, then run the command via pnpm.

- For most eslint issues, after you make multiple file changes, just run lint:fix regularly instead of trying to fix each file individually. eslint will let you know if there are any remaining issues.

- If the linter it executes without finding any problems and you’re done with all tasks, just proceed to the summary section.

- Run only the commands available in the package or app's package.json scripts.

- At the end of your response, always include a summary of changes made in the files.

- The user is watching you change the files. If they see lint errors, they'll save the file which will auto-fix issues. In that case, just move on instead of getting stuck in a loop trying to fix errors that don't exist anymore.

- DO NOT edit AGENTS.md or TASKS.md unless explicitly told to do so.

- The user has tsx installed globally. so you can simply cd into the correct directory and run `tsx file.ts`

- Always follow DRY and SOLID principles.

- Moving and renaming files should be done with the `mv` command to ensure proper git tracking. It's also better than creating a new file and replacing contents.

- For files you plan to delete, simply comment out all the code in it, and update the file name using the `mv` command to append `.deprecated` to the file name. This way, git will track the change and you can always recover the file if needed.

- If files are large and cause a lint error because of that, consider breaking them down into smaller, more manageable files.

- Use ts paths if available instead of relative paths. (Check tsconfig.json)

- Import order eslint warnings and indentation and spacing eslint warnings can be fixed by running `pnpm lint:fix` after all changes are made.
