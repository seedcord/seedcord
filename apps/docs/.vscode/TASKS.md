[ ] 50. The panel dropdowns for the constructor, or props, or methods for example in member pages, are missing a hover effect. Add a subtle background color change on hover. If you think there is one right now already, some thing is overriding it because I don't see it.

[ ] 51. Settings clear doesn't have feedback on click. Maybe make a timed feedback button component.

[ ] 54. public abstract abstract public logger: Logger; - double abstract keyword in signature

[ ] 57. Update pre-rendering to not load the documentation jsons during build time, but instead load them on-demand at runtime with caching.

[ ] 58. Make hyperlinking in code signatures case-sensitive IF a ref isn't found in internal documentation.

[ ] 60. For interfaces that have nested objects in them but those nested objects aren't documented entities, render those nested objects correctly instead of "files: {…}". That is, expand them to show their properties. Because "…" is not helpful. Same for some variables. Like "const BuilderTypes: {…}". You can check what the actual json reflection is in the debugging/generated folder at root.

[ ] 42. Render @throws comment similar to Inherits from and See also sections. This is mostly done because we have a bunch of code and the types etc to handle it, but I don't see it rendered on the website. Also, please check kind-function-haspermstoassign.txt. You can see that it has an array for throws. Use the type from docs-engine package that's exported and access this array instead of looking for `@throws` tags.

[ ] 37. In type param rendered comments on entity pages, the type param comment duplicates itself above and below the signature.

[ ] 38. The param and typeparam section in methods below signature and above example can be a dropdown like examples. closed by default.

[ ] 44. In tsdoc comments, if there are bullet points or numbered lists, (-, •, 1., 2., etc.), render them as actual lists in the rendered comments. Not just plain text with those characters.

[ ] 45. If a text is specifically a string (inside "" or '') in the signature of any entity, don't attempt to hyperlink it. Because right now for example, `type LifecycleAction = "start" | "complete" | "error"`, the "error" is hyperlinked to the mdn Error page.

[ ] 48. Rendering for `@virtual` and `@remarks`.

[ ] 49. Render markdown in comments. Lists, bold, and italics.
