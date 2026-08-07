// Shared reading layer for the template corpus.
//
// Every fact the README and the validator need is derived from the workflow
// JSON itself — there is deliberately no sidecar metadata file. n8n's own
// submission guidance puts a template's documentation on the canvas as sticky
// notes, so the canvas is the only copy that reviewers, importers and this repo
// can all see; a second copy in YAML would drift from it silently.

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';
import { fileURLToPath } from 'node:url';

export const REPO_ROOT = fileURLToPath(new URL('../../', import.meta.url));
export const TEMPLATES_DIR = join(REPO_ROOT, 'templates');

export const GLUECRAWL_PACKAGE = '@gluecrawl/n8n-nodes-gluecrawl';
export const STICKY_TYPE = 'n8n-nodes-base.stickyNote';

/** Lowercase-hyphen form of a title. The filename convention derives from this. */
export function slugify(value) {
	return value
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '');
}

export function listTemplateFiles() {
	let entries;
	try {
		entries = readdirSync(TEMPLATES_DIR);
	} catch {
		return [];
	}
	return entries
		.filter((entry) => entry.endsWith('.json'))
		.sort()
		.map((entry) => join(TEMPLATES_DIR, entry));
}

export function readTemplate(path) {
	const raw = readFileSync(path, 'utf8');
	return { path, file: basename(path), raw, workflow: JSON.parse(raw) };
}

/**
 * The main sticky note carries the template's title and description.
 *
 * The convention is an h1 as the sticky's first line — that single marker is
 * what makes "the documentation reviewers read" and "the index this repo
 * publishes" the same text. Anything else on the canvas is a section sticky.
 */
export function findMainSticky(workflow) {
	const stickies = (workflow.nodes ?? []).filter((node) => node.type === STICKY_TYPE);
	return stickies.filter((node) => /^\s*#\s+\S/.test(node.parameters?.content ?? ''));
}

export function parseMainSticky(content) {
	const lines = content.split('\n');
	const headingIndex = lines.findIndex((line) => /^\s*#\s+\S/.test(line));
	const title = lines[headingIndex].replace(/^\s*#\s+/, '').trim();

	const description = [];
	for (const line of lines.slice(headingIndex + 1)) {
		const trimmed = line.trim();
		// The description is the first paragraph. A blank line ends it, and a
		// further heading means there was no prose between the two.
		if (trimmed.startsWith('#')) break;
		if (!trimmed) {
			if (description.length) break;
			continue;
		}
		description.push(trimmed);
	}

	return { title, description: description.join(' ') };
}

/** Human-readable service names, for the README's "uses" column. */
export function integrations(workflow) {
	const names = new Set();
	for (const node of workflow.nodes ?? []) {
		const type = node.type ?? '';
		if (type === STICKY_TYPE) continue;
		if (type.startsWith(`${GLUECRAWL_PACKAGE}.`)) {
			names.add('Gluecrawl');
			continue;
		}
		const bare = type.split('.').pop() ?? type;
		names.add(
			bare
				.replace(/^n8n-nodes-base\./, '')
				.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
				.replace(/^./, (char) => char.toUpperCase()),
		);
	}
	return [...names].sort();
}

export function tagNames(workflow) {
	return (workflow.tags ?? [])
		.map((tag) => (typeof tag === 'string' ? tag : tag?.name))
		.filter(Boolean);
}

/** Everything the README index renders, derived from one workflow file. */
export function describe(template) {
	const { workflow, file } = template;
	const sticky = findMainSticky(workflow)[0];
	const parsed = sticky
		? parseMainSticky(sticky.parameters.content)
		: { title: '', description: '' };
	return {
		file,
		title: parsed.title || workflow.name || file,
		description: parsed.description,
		tags: tagNames(workflow),
		integrations: integrations(workflow),
		nodeCount: (workflow.nodes ?? []).filter((node) => node.type !== STICKY_TYPE).length,
	};
}
