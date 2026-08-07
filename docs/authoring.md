# Authoring a template

## The local instance

```bash
cp .env.example .env
npm install
npm run n8n:up          # http://localhost:5678
```

First run only: create the owner account the editor asks for, then install the node at
**Settings → Community nodes → Install** with the package name `@gluecrawl/n8n-nodes-gluecrawl`.

Install the **published** package rather than a local build. A template has to import onto a
stranger's instance, and the only version that exists there is the one on npm.

`npm run n8n:down` stops it; the named volume keeps your account and workflows between runs.
`npm run n8n:logs` follows the container.

> Docker rather than `npx n8n start`: n8n 3.0, scheduled for October 2026, drops npm-installed
> self-hosted n8n. Building this environment on npm would mean rebuilding it within months.

## The Gluecrawl Trigger needs a public URL

The Gluecrawl API rejects webhook targets that are not **https** on a **public** IP, so a trigger
cannot register while n8n believes it lives on localhost — `422 invalid_webhook_url`. This
includes **Test workflow**, which calls the same registration hook.

`n8n start --tunnel` does not solve it. n8n 2.0 removed the flag and now **ignores it silently**,
leaving the webhook base URL on localhost. Run your own tunnel and hand n8n its address:

```bash
npm run n8n:tunnel                       # prints https://<name>.trycloudflare.com
# put that hostname in .env as N8N_WEBHOOK_URL, then
npm run n8n:down && npm run n8n:up
```

Quick tunnels get a fresh hostname on every restart, so expect to re-register the trigger. Only
trigger-based templates need this — the action node works fine on plain localhost.

## Documenting on the canvas

A template's documentation lives in its **sticky notes**, not in a file beside it. That is n8n's
own submission guidance, and it is the copy that reviewers and importers actually see — so this
repo generates its README index from those same stickies rather than keeping a second one.

Exactly one sticky note must start with an `# h1`. That is the **main sticky**, and its shape is
load-bearing:

```markdown
# Scrape a product listing to Google Sheets on a schedule

Refreshes a Gluecrawl job every morning and appends new rows to a spreadsheet, deduplicated on
product URL. For anyone tracking a competitor's catalogue without writing selectors.

## Setup

1. ...

## Notes

- ...
```

The `# h1` becomes the template's title in the index; the paragraph under it becomes the
description. Everything below is for the person on the canvas.

Add further stickies to group related nodes, and give every node a name that says what it does —
reviewers bounce submissions over sticky-note organisation and node naming more than over logic.

## Exporting

In the editor: **⋯ → Download**. Then, from the repo root:

```bash
mv ~/Downloads/<file>.json templates/<slug>.json
npm run clean -- templates/<slug>.json
npm run validate
npm run index
```

- `clean` strips the authoring instance out of the file: `id`, `versionId`, `meta.instanceId`,
  `pinData`, credential ids, and a live `active` flag.
- `validate` is the gate — see [submitting.md](submitting.md) for what it enforces and why.
- `index` regenerates the README table. Never edit that table by hand; CI checks it.

The filename must be the slug of the workflow's own name (`validate` tells you the expected one).

`npm run check` runs all three gates together, which is exactly what CI runs.

## Scripted export and import

`@n8n/cli` is a client that talks to a running instance over its REST API — different from the
`n8n export:workflow` server CLI, which needs direct database access. Create an API key at
**Settings → n8n API** and put it in `.env`, then:

```bash
npx @n8n/cli workflow list
npx @n8n/cli workflow get <id> --format=json > templates/<slug>.json
cat templates/<slug>.json | npx @n8n/cli workflow create --stdin
```

It is at `0.13.0` and marked beta, so it stays an authoring convenience. Nothing in `npm run
check` depends on it, and CI never installs it.

## Building workflows with an agent

[`n8n-mcp`](https://github.com/czlonkowski/n8n-mcp) ships an offline database of every node's
schema. `search_nodes`, `get_node` and `validate_workflow` work with no instance running; the
`n8n_*` tools additionally drive the local editor once `N8N_API_URL` and `N8N_API_KEY` are
exported. Its author also publishes [`n8n-skills`](https://github.com/czlonkowski/n8n-skills),
a skill pack that teaches an agent the expression syntax and validation habits the raw tools do
not, and that is worth installing alongside it.

Write the server config yourself, at `.mcp.json` in the repo root:

```json
{
  "mcpServers": {
    "n8n": {
      "type": "stdio",
      "command": "npx",
      "args": ["-y", "n8n-mcp"],
      "env": {
        "MCP_MODE": "stdio",
        "N8N_API_URL": "${N8N_API_URL}",
        "N8N_API_KEY": "${N8N_API_KEY}"
      }
    }
  }
}
```

That file is gitignored on purpose and the snippet above is the only copy. A checked-in `.mcp.json`
would make every clone of a public repo offer to launch a server on open, so the choice stays with
whoever cloned it.

The server knows nothing about the Gluecrawl node — that is a community package outside its bundled
database. Read the [node repository](https://github.com/deep-soup-labs/gluecrawl-n8n) for the
operations, parameters and error behaviour, and let the MCP server handle everything the template
connects Gluecrawl _to_.
