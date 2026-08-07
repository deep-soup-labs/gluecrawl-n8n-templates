#!/usr/bin/env node
// Strips authoring-instance state out of a fresh export, in place.
//
// An export carries the identity of the machine it came from. None of it is
// secret, but all of it is meaningless — or actively wrong — on the instance
// that imports the template, so it is removed at export time rather than
// explained away later.
//
//   node scripts/clean.mjs templates/*.json

import { readFileSync, writeFileSync } from 'node:fs';

const files = process.argv.slice(2);
if (files.length === 0) {
	console.error('Usage: node scripts/clean.mjs <workflow.json>...');
	process.exit(1);
}

for (const file of files) {
	const workflow = JSON.parse(readFileSync(file, 'utf8'));
	const removed = [];

	for (const key of ['id', 'versionId']) {
		if (workflow[key] !== undefined) {
			delete workflow[key];
			removed.push(key);
		}
	}
	if (workflow.meta?.instanceId) {
		delete workflow.meta.instanceId;
		removed.push('meta.instanceId');
	}
	if (workflow.meta && Object.keys(workflow.meta).length === 0) delete workflow.meta;

	// Pinned data is a real run's output. It bloats the file and can carry
	// scraped content we have no right to redistribute.
	if (workflow.pinData && Object.keys(workflow.pinData).length > 0) {
		delete workflow.pinData;
		removed.push('pinData');
	}

	// A template must never import in a running state.
	if (workflow.active === true) {
		workflow.active = false;
		removed.push('active');
	}

	// The credential's name survives so the editor still shows which credential
	// each node wants; the id would point at a row in a database the importer
	// does not have.
	for (const node of workflow.nodes ?? []) {
		for (const cred of Object.values(node.credentials ?? {})) {
			if (cred?.id) {
				delete cred.id;
				removed.push(`${node.name}.credentials.id`);
			}
		}
	}

	writeFileSync(file, `${JSON.stringify(workflow, null, 2)}\n`);
	console.log(removed.length ? `${file}: removed ${removed.join(', ')}` : `${file}: already clean`);
}
