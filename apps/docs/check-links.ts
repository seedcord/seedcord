import { LinkChecker } from '#lib/export/LinkChecker';

const EXPORT_DIR = 'dist/docs';

const broken = await new LinkChecker(EXPORT_DIR).broken();

for (const { href, page, status } of broken) process.stderr.write(`${String(status)}  ${href}  (from ${page})\n`);
process.stdout.write(`${String(broken.length)} broken docs links in ${EXPORT_DIR}\n`);

if (broken.length > 0) process.exitCode = 1;
