#!/usr/bin/env node
// Regenerates the README's template index from the workflow files.
//
// Run with --check in CI: a hand-edited index is a second, silently drifting
// copy of what the canvas already says.

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { REPO_ROOT, describe, listTemplateFiles, readTemplate } from './lib/templates.mjs';

const README = join(REPO_ROOT, 'README.md');
const BEGIN = '<!-- BEGIN TEMPLATES -->';
const END = '<!-- END TEMPLATES -->';

function render(entries) {
	if (entries.length === 0) {
		return '_No templates published yet._\n\nThe first four are in progress — see [docs/authoring.md](docs/authoring.md).';
	}

	const groups = new Map();
	for (const entry of entries) {
		const group = entry.tags[0] ?? 'Uncategorised';
		if (!groups.has(group)) groups.set(group, []);
		groups.get(group).push(entry);
	}

	const sections = [];
	for (const group of [...groups.keys()].sort()) {
		const rows = groups
			.get(group)
			.map(
				(entry) =>
					`| [${entry.title}](templates/${entry.file}) | ${entry.description} | ${entry.integrations.join(', ')} |`,
			);
		sections.push(
			[
				`### ${group}`,
				'',
				'| Template | What it does | Uses |',
				'| --- | --- | --- |',
				...rows,
			].join('\n'),
		);
	}
	return sections.join('\n\n');
}

const entries = listTemplateFiles().map((path) => describe(readTemplate(path)));
const readme = readFileSync(README, 'utf8');

const begin = readme.indexOf(BEGIN);
const end = readme.indexOf(END);
if (begin === -1 || end === -1) {
	console.error(`README.md is missing the ${BEGIN} / ${END} markers.`);
	process.exit(1);
}

const updated =
	readme.slice(0, begin + BEGIN.length) + '\n\n' + render(entries) + '\n\n' + readme.slice(end);

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
