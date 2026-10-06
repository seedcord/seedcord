import echo from './Echo.json' with { type: 'json' };

console.log(`fixture:json ${echo.twin}`);
console.log(`fixture:filename ${import.meta.filename}`);
console.log(`fixture:url ${import.meta.url}`);
