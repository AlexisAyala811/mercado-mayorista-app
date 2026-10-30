// Verifica que los enlaces relativos y las anclas de los Markdown existan.
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';

const IGNORED = new Set(['.git', 'node_modules', 'dist', 'backend']);

function markdownFiles(directory) {
  return readdirSync(directory).flatMap((name) => {
    if (IGNORED.has(name)) return [];
    const path = join(directory, name);
    if (statSync(path).isDirectory()) return markdownFiles(path);
    return name.endsWith('.md') ? [path] : [];
  });
}

const slug = (heading) =>
  heading
    .toLowerCase()
    .trim()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s/g, '-');

const headings = (file) =>
  [...readFileSync(file, 'utf8').matchAll(/^#+\s+(.*)$/gm)].map((match) => slug(match[1]));

const problems = [];
const files = markdownFiles('.');
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  for (const [, link] of text.matchAll(/\]\(([^)\s]+)\)/g)) {
    if (/^(https?:|mailto:)/.test(link)) continue;
    const [path, anchor] = link.split('#');
    const target = path ? resolve(dirname(file), decodeURI(path)) : resolve(file);
    if (!existsSync(target)) problems.push(`${file}: no existe ${link}`);
    else if (anchor && target.endsWith('.md') && !headings(target).includes(anchor))
      problems.push(`${file}: no existe el ancla ${link}`);
  }
}

console.log(`${files.length} documentos revisados`);
if (problems.length) {
  console.error(problems.join('\n'));
  process.exit(1);
}
