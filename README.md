# Gluecrawl n8n workflow templates

Ready-to-import [n8n](https://n8n.io) workflows built on
**[Gluecrawl](https://www.gluecrawl.ai)** — point it at a URL, describe what you want in plain
English, and get structured rows back.

Gluecrawl's mapper agents work out the selectors and pagination **once**. Every later run replays
that configuration deterministically, so a scheduled scrape costs no LLM work and returns the same
columns every time. These templates are the shapes that model is good at.

Maintained by the team that builds the node — every template here is first-party, tested against a
real instance, and validated in CI.

## Templates

<!-- BEGIN TEMPLATES -->

### AI

| Template                                                                                              | What it does                                                                                                                                                                                  | Uses                                                                                             |
| ----------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| [Weekly AI news digest from multiple sites](templates/weekly-ai-news-digest-from-multiple-sites.json) | Reruns one Gluecrawl job per news site every Monday, keeps every article it has ever seen in an n8n data table, and asks an LLM to write a digest of only the stories that are new this week. | Chain Llm, Code, Data Table, Gluecrawl, Lm Chat Open Ai, Manual Trigger, Merge, Schedule Trigger |

### Lead Generation

| Template                                                                                                                | What it does                                                                                                                                                                                                                                     | Uses                                                                                                                |
| ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------- |
| [Weekly local business leads scored by web presence](templates/weekly-local-business-leads-scored-by-web-presence.json) | Picks a fresh business-type and city each week with an LLM, mints a Gluecrawl job for that search, and scores every business it finds on how weak its web presence is — so the list that lands is ranked by who needs help, not just who exists. | Chain Llm, Code, Data Table, Gluecrawl, Lm Chat Open Ai, Manual Trigger, Output Parser Structured, Schedule Trigger |

### Real Estate

| Template                                                                                              | What it does                                                                                                                                                                                                                               | Uses                                                                                                                 |
| ----------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------- |
| [Weekly property market report with charts](templates/weekly-property-market-report-with-charts.json) | Reruns one Gluecrawl job per listing portal every Monday, folds all three into one view of a single city, and produces a charted market report — medians by ZIP code, the city trend week over week, and every listing that cut its price. | Chain Llm, Code, Data Table, Gluecrawl, Limit, Lm Chat Open Ai, Manual Trigger, Merge, Quick Chart, Schedule Trigger |

<!-- END TEMPLATES -->

## Using a template

1. **Install the node.** In n8n, go to **Settings → Community nodes → Install** and enter
   `@gluecrawl/n8n-nodes-gluecrawl`. See the
   [node repository](https://github.com/deep-soup-labs/gluecrawl-n8n) for the full reference.
2. **Get an API key.** Create one in the [Gluecrawl dashboard](https://www.gluecrawl.ai). API keys
   are available on every paid plan.
3. **Import the workflow.** Download the template's `.json`, then in n8n use **Workflows → Import
   from File**. Or paste the file's contents into an empty canvas.
4. **Connect the credential.** Open the Gluecrawl node, select **Create new credential**, and paste
   your API key. Templates ship with credentials unset by design.
5. **Read the sticky notes.** Each template documents its own setup on the canvas — what to change
   before the first run is written next to the nodes that need it.

> [!NOTE]
> Templates never arrive active. Review what a workflow does before you publish it — a scrape
> spends credits.

## Contributing

Issues and pull requests are welcome, especially new template ideas grounded in a real automation
you wanted to build.

- [docs/authoring.md](docs/authoring.md) — the local environment, and how to build and export a
  template
- [docs/submitting.md](docs/submitting.md) — the rules every template must satisfy, and how these
  reach the n8n template library

Before opening a pull request, run:

```bash
npm run check
```

That validates every workflow file, verifies the index above is current, and checks formatting —
the same three gates CI runs.

## Resources

- [Gluecrawl](https://www.gluecrawl.ai) — product, pricing and dashboard
- [`@gluecrawl/n8n-nodes-gluecrawl`](https://github.com/deep-soup-labs/gluecrawl-n8n) — the node
  package these templates depend on
- [n8n community nodes documentation](https://docs.n8n.io/integrations/community-nodes/)

## License

[MIT](LICENSE)
