# What a template must satisfy, and where it goes

`npm run validate` is the authoritative list of checks — it fails with the specific rule and the
JSON path. This page records why those rules exist, which the error messages cannot carry.

## Why there is a gate at all

No n8n workflow repository surveyed validates its own corpus, and n8n publishes no workflow JSON
schema. The checks here are written against the export shape and the Creator Hub submission
guidelines. Two of them are worth more than the rest:

**No literal credentials.** A published secret cannot be unpublished, and hardcoded tokens fail a
Creator Hub review outright. The scan skips `{{ }}` expressions, which are resolved at runtime and
carry no secret. `npm run clean` also drops credential _ids_ — not secret, but they point at rows
in a database the importer does not have.

**Nothing arrives active.** An imported workflow that starts itself spends the importer's credits
before they have read what it does. Templates export inactive, and pinned run data — real scraped
content — never ships with them.

The rest are cheaper failures caught cheaply: unique node names, because n8n addresses nodes by
name in `connections` and duplicates silently drop edges on import; no localhost or tunnel
hostnames, because those are authoring scaffolding that points at a machine which no longer
exists; a filename matching the workflow's own name, so renaming stays a deliberate act.

Every template must use the Gluecrawl node. That is the point of the repository.

## The main sticky note

Exactly one sticky must open with an `# h1`. It is simultaneously the documentation a Creator Hub
reviewer reads, the first thing someone sees on the canvas, and the source the README index is
generated from — which is why it is a validated convention rather than a suggestion. Format is in
[authoring.md](authoring.md).

## Publishing to the n8n template library

The repository is the source of truth; the n8n library is a distribution channel. Templates reach
it through the **Creator Hub** at [creators.n8n.io](https://creators.n8n.io), and there is no CLI
or public API for submission — the flow is a web form.

1. Register a Gluecrawl creator account.
2. **Share new template** → title, description, and the workflow JSON pasted in.
3. Confirm the guidelines. The compliance rule that matters is no hardcoded credentials or shared
   auth secrets anywhere in the JSON — already gated by `npm run validate`.
4. Review is by a human and takes hours to days, with revision requests. They are usually about
   sticky-note organisation and node naming, so spend the effort there before submitting.

Templates that use a community node surface on that node's integration page and in the in-app
template browser, which is what makes this the integration's top of funnel rather than a
documentation exercise.

Submit the file from `main`, unmodified. If a reviewer asks for a change, make it here, re-run
`npm run check`, and resubmit from the updated file — otherwise the published template and this
repository diverge with no way to tell which is current.
