#!/usr/bin/env node
// Structural gate for every published template.
//
// Each rule below is a failure mode that costs a Creator Hub review round-trip
// or ships something we cannot take back. n8n publishes no workflow JSON schema
// and no surveyed template repo validates its corpus at all, so this is written
// against the export shape and the submission guidelines rather than adapted
// from an upstream tool.

import { relative } from 'node:path';
import {
	GLUECRAWL_PACKAGE,
	REPO_ROOT,
	STICKY_TYPE,
	findMainSticky,
	listTemplateFiles,
	readTemplate,
	slugify,
	tagNames,
} from './lib/templates.mjs';

// Literal credentials fail a submission outright, and a published secret cannot
// be unpublished. Patterns are anchored on the issuer prefix rather than on
// entropy, which keeps the check quiet enough that nobody learns to ignore it.
const SECRET_PATTERNS = [
	[/\bsk-[A-Za-z0-9_-]{16,}/, 'OpenAI-style secret key'],
	[/\bgc_[A-Za-z0-9]{16,}/, 'Gluecrawl API key'],
	[/\bgh[pousr]_[A-Za-z0-9]{20,}/, 'GitHub token'],
	[/\bxox[baprs]-[A-Za-z0-9-]{10,}/, 'Slack token'],
	[/\bAIza[A-Za-z0-9_-]{20,}/, 'Google API key'],
	[/\bBearer\s+[A-Za-z0-9._-]{20,}/, 'hardcoded bearer token'],
];

// A tunnel hostname or a localhost port is authoring scaffolding. Left in a
// template it points a stranger's workflow at a machine that no longer exists.
const LOCAL_URL_PATTERN = /(localhost|127\.0\.0\.1|\.trycloudflare\.com|\.ngrok[.-])/i;

/** Every string in the document, with a JSON path, so findings are actionable. */
function* strings(value, path = '$') {
	if (typeof value === 'string') {
		yield [path, value];
	} else if (Array.isArray(value)) {
		for (const [index, item] of value.entries()) yield* strings(item, `${path}[${index}]`);
	} else if (value && typeof value === 'object') {
		for (const [key, item] of Object.entries(value)) yield* strings(item, `${path}.${key}`);
	}
}

function validate(template) {
	const errors = [];
	const warnings = [];
	const { workflow, file } = template;
	const fail = (message) => errors.push(message);

	if (typeof workflow !== 'object' || workflow === null || Array.isArray(workflow)) {
		return { errors: ['not a JSON object — expected an n8n workflow export'], warnings };
	}

	if (typeof workflow.name !== 'string' || !workflow.name.trim()) {
		fail('`name` is missing or empty');
	}
	if (!Array.isArray(workflow.nodes) || workflow.nodes.length === 0) {
		fail('`nodes` is missing or empty');
	}
	if (typeof workflow.connections !== 'object' || workflow.connections === null) {
		fail('`connections` is missing');
	}

	const nodes = Array.isArray(workflow.nodes) ? workflow.nodes : [];

	// The filename is the template's stable address — in the README index, in
	// links we hand out, and in any future submission tracking. Deriving it from
	// the workflow name keeps renaming a single deliberate act.
	if (typeof workflow.name === 'string' && workflow.name.trim()) {
		const expected = `${slugify(workflow.name)}.json`;
		if (file !== expected) {
			fail(`filename should be \`${expected}\` to match the workflow name "${workflow.name}"`);
		}
	}

	const seen = new Set();
	for (const [index, node] of nodes.entries()) {
		const label = node?.name ? `node "${node.name}"` : `node #${index}`;
		for (const key of ['id', 'name', 'type', 'position', 'parameters']) {
			if (node?.[key] === undefined) fail(`${label} is missing \`${key}\``);
		}
		// n8n addresses nodes by name in `connections`; duplicates silently drop
		// edges on import rather than erroring.
		if (typeof node?.name === 'string') {
			if (seen.has(node.name)) fail(`duplicate node name "${node.name}"`);
			seen.add(node.name);
		}
		if (node?.credentials && typeof node.credentials === 'object') {
			for (const cred of Object.values(node.credentials)) {
				if (cred?.id) {
					warnings.push(
						`${label} carries a credential id (\`${cred.id}\`) from the authoring instance`,
					);
				}
			}
		}
	}

	if (!nodes.some((node) => (node?.type ?? '').startsWith(`${GLUECRAWL_PACKAGE}.`))) {
		fail(`no Gluecrawl node — every template here must use \`${GLUECRAWL_PACKAGE}\``);
	}

	// Reviewers bounce submissions over canvas documentation more than over
	// logic, and the README index is generated from this same sticky.
	const mainStickies = findMainSticky(workflow);
	if (mainStickies.length === 0) {
		const stickies = nodes.filter((node) => node?.type === STICKY_TYPE).length;
		fail(
			stickies === 0
				? 'no sticky notes — a main sticky starting with an `# h1` is required'
				: 'no main sticky note — exactly one sticky must start with an `# h1`',
		);
	} else if (mainStickies.length > 1) {
		fail(`${mainStickies.length} stickies start with an \`# h1\` — exactly one must`);
	}

	if (tagNames(workflow).length === 0) {
		fail('no `tags` — the README index groups templates by their first tag');
	}

	if (workflow.pinData && Object.keys(workflow.pinData).length > 0) {
		fail('`pinData` is not empty — pinned runs embed real scraped data in the export');
	}

	// Templates must never arrive live. An imported workflow that starts itself
	// can bill against the importer's account before they have read it.
	if (workflow.active === true) {
		fail('`active` is true — templates must be exported inactive');
	}

	for (const [path, value] of strings(workflow)) {
		// `={{ ... }}` is an n8n expression resolved at runtime, not a literal.
		if (value.includes('{{')) continue;
		for (const [pattern, label] of SECRET_PATTERNS) {
			if (pattern.test(value)) fail(`possible ${label} at \`${path}\``);
		}
		if (LOCAL_URL_PATTERN.test(value)) {
			fail(`local or tunnel address at \`${path}\` — "${value.slice(0, 60)}"`);
		}
	}

	for (const key of ['id', 'versionId']) {
		if (workflow[key]) warnings.push(`\`${key}\` is instance-specific and can be dropped`);
	}
	if (workflow.meta?.instanceId) {
		warnings.push('`meta.instanceId` identifies the authoring instance and can be dropped');
	}

	return { errors, warnings };
}

const files = listTemplateFiles();
if (files.length === 0) {
	console.log('No templates yet — nothing to validate.');
	process.exit(0);
}

let failed = 0;
for (const path of files) {
	const shown = relative(REPO_ROOT, path);
	let result;
	try {
		result = validate(readTemplate(path));
	} catch (error) {
		result = { errors: [`could not be parsed: ${error.message}`], warnings: [] };
	}

	for (const warning of result.warnings) console.log(`  warn  ${shown}: ${warning}`);
	for (const error of result.errors) console.error(`  FAIL  ${shown}: ${error}`);
	if (result.errors.length === 0) console.log(`  ok    ${shown}`);
	else failed += 1;
}

console.log(`\n${files.length} template(s), ${failed} failing.`);
process.exit(failed > 0 ? 1 : 0);
