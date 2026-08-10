#!/usr/bin/env node
// Regenerates the README's template index from the workflow files.
//
// Run with --check in CI: a hand-edited index is a second, silently drifting
// copy of what the canvas already says.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { format, resolveConfig } from 'prettier';
import { REPO_ROOT, describe, listTemplateFiles, readTemplate } from './lib/templates.mjs';

const README = join(REPO_ROOT, 'README.md');
const BEGIN = '<!-- BEGIN TEMPLATES -->';
const END = '<!-- END TEMPLATES -->';

function render(entries) {
	if (entries.length === 0) {
		return '_No templates published yet._';
	}

	const rows = entries
		.slice()
		.sort((a, b) => a.title.localeCompare(b.title))
		.map(
			(entry) =>
				`| [${entry.title}](templates/${entry.file}) | ${entry.description} | ${entry.integrations.join(', ')} |`,
		);
	return ['| Template | What it does | Uses |', '| --- | --- | --- |', ...rows].join('\n');
}

const entries = listTemplateFiles().map((path) => describe(readTemplate(path)));
const readme = readFileSync(README, 'utf8');

const begin = readme.indexOf(BEGIN);
const end = readme.indexOf(END);
if (begin === -1 || end === -1) {
	console.error(`README.md is missing the ${BEGIN} / ${END} markers.`);
	process.exit(1);
}

// Hand the spliced result through Prettier before writing or comparing. The
// index is a Markdown table whose column widths depend on the longest title
// and description, and `format:check` would otherwise repad every row this
// script emits — leaving the two gates permanently unable to agree.
const spliced =
	readme.slice(0, begin + BEGIN.length) + '\n\n' + render(entries) + '\n\n' + readme.slice(end);
const updated = await format(spliced, { ...(await resolveConfig(README)), filepath: README });

if (process.argv.includes('--check')) {
	if (updated !== readme) {
		console.error('README template index is out of date. Run `npm run index`.');
		process.exit(1);
	}
	console.log('README template index is up to date.');
} else {
	writeFileSync(README, updated);
	console.log(`Wrote ${entries.length} template(s) into the README index.`);
}
