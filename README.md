Intended to make it easy to follow newly published articles across disciplines in Korea. The list is organized, machine-readable, and designed to be used with RSS readers or integrated into automation workflows (e.g., GitHub Actions) for updates and notifications.

**Why this exists** 
Discoverability of Korean journals’ RSS feeds is fragmented; a centralized list simplifies tracking new publications across fields and publishers.

Having feeds in a consistent format lets researchers plug them into readers, dashboards, or CI workflows that update summaries automatically.

**What’s inside**
Curated RSS/Atom feed links grouped by domain (e.g., medicine, engineering, social sciences), including canonical titles and homepage links where available.

Optional automation examples for turning feeds into daily or weekly digests in README or separate files using GitHub Actions-compatible tooling.

**Quick start**
Use with any RSS reader: import selected feed URLs into a preferred reader (e.g., Inoreader, Feedly, FreshRSS) to receive new-article alerts as they’re published.

Programmatic use: point scripts or workflows to the feed list (CSV/JSON/Markdown) and process items to generate newsletters, Slack notifications, or README sections.


**Validation and health checks**
Run a feed validation script to ensure URLs resolve (HTTP 200), are in RSS/Atom format, and return recent items; optionally mark dead or redirected feeds with status.




**Guidelines**
Prefer official journal feeds over third-party scrapers; confirm that the feed updates reliably and uses HTTPS where available.

For journals without feeds, include a “no official feed” note and, if permitted, a queryable TOC page that could be monitored by external tools (not included here).

Roadmap
Add OPML exports to make it easy to bulk-import sets (by discipline) into readers, and publish a combined OPML for “ALL Korean journals”.

Optional: add examples for piping feed items to Slack/Discord/Email using simple Actions workflows and templated messages.

Related work
Large collections of academic feeds (international) can serve as references for structure and categorization; these projects show how to scale and maintain big lists over time.

GitHub Actions recipes that turn RSS into README sections or files are well-established and easy to adapt to journal feeds and custom templates.

