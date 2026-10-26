# Thally Starter

A production-ready documentation site built with the open-source Thally runtime.
Use this repository as a GitHub template or clone it directly, then replace the
starter content with documentation for your product.

Thally is the product knowledge layer for software teams. This starter is its
portable publishing foundation: your content stays in Git, and the same source
can serve people, search engines, and AI tools.

This is the canonical complete template consumed by Thally Cloud, the CLI, and
the MCP server. Runtime code is authored once in
[`thallylabs/thally`](https://github.com/thallylabs/thally), then generated into
this repository as a pinned, byte-identical snapshot. Do not manually repeat a
runtime fix in both repositories.

This README covers the portable starter, not the full managed platform. The
sole production architecture authority is
[`thally-cloud/ARCHITECTURE.md`](https://github.com/thallylabs/thally-cloud/blob/main/ARCHITECTURE.md),
available to maintainers with access to the private repository. The CLI, MCP,
and Cloud creation flows consume an exact promoted scaffold release rather
than treating the mutable `main` branch as a release identity.

## Run locally

```bash
npm install
npm run dev
```

Node.js 22.14+ or 24+ is recommended; Node.js 20.19+ is also supported.
The checked-in npm lockfile makes `npm ci` the
reproducible installation command. You can also use `pnpm install` or
`yarn install`; use one package manager per project and commit its lockfile.

If installation is interrupted, keep your content and configuration. Remove
only `node_modules`, then run `npm ci` again (or your selected package manager's
install command). This repairs incomplete packages such as Shiki without
recreating the site or deleting the dependency lockfile.

Open [http://localhost:3040](http://localhost:3040). If that port is occupied,
choose another with `npm run dev -- --port 3041`.

The default project runs Next.js directly and does not install the Thally CLI.
Use `npm run check` to validate documentation and `npm run starter:update` to
preview framework updates. These commands explicitly invoke the current official
`@thallylabs/cli` package, so a frozen local CLI cannot block a newer scaffold.
Pass update options after `--`, for example `npm run starter:update -- --apply`
after reviewing the dry run. For other commands, run
`npx --yes --package=@thallylabs/cli@latest thally --help`.

## Make it yours

- Edit pages in `src/content/`.
- Organize navigation and features in `docs.json`.
- Set the product name, links, and versioned brand defaults in `src/data/site.ts`.
- Replace `openapi.yaml` with your API specification.
- Add logos or favicons in `public/` and reference them from your site settings.

`starter-release.json` records the immutable starter and runtime version used
to create the site. Keep it in the repository so `npm run starter:update` can
plan framework updates without overwriting your content or portable settings.

`npm run starter:update` performs a three-way comparison between the recorded
previous scaffold, the promoted target scaffold, and your current project. It
updates unchanged framework-owned files, preserves user-owned files, and stops
for manual review when those contracts overlap. The command is a dry run until
you pass `--apply`.

Maintainers update the generated runtime snapshot through the **Sync Thally
runtime** workflow. CI rejects a changed pin without matching files, changed
files without a matching pin, missing files, and stale runtime files.

Content icons are neutral by default. Set `appearance.contentIcons` to `accent`
in `docs.json`, or add `iconColor="accent"` to an individual card or tile.
Public page URLs ending in `.md` are disabled by default; enable them explicitly
with `markdown.enabled` when that distribution surface fits your access model.

## Validate changes

```bash
npm run check
npm run typecheck
npm run build
```

CI runs the same content check with the pinned workflow tooling:
`npm ci --ignore-scripts --prefix .github/thally-tooling`, then
`.github/thally-tooling/node_modules/.bin/thally check --ci .`.

## Deploy

The site is a standard Next.js application. Deploy it through Thally Cloud or
any compatible Next.js host. Cloudflare Workers configuration is included in
`open-next.config.ts` and `wrangler.jsonc`. Provider deployment packages and
Thally’s internal test suites are excluded from the default installation.
Thally Cloud supplies its own pinned deployment tooling. For self-hosted
Cloudflare builds, install the optional provider profile explicitly:

```bash
npm run setup:cloudflare
npm run build:cloudflare
```

The setup command records exact OpenNext and Wrangler versions in your project.
Other Next.js hosts need only the default installation.

Thally Cloud publishes an immutable managed site release and activates it by
moving the site's production pointer only after validation. Direct hosts use
their own release and rollback mechanisms; publishing a package or synchronizing
this starter does not move an existing site's pointer.

On Vercel, the site URL used for canonical and agent links is detected
automatically. On other hosts, for a custom domain, or on Cloudflare Workers,
set `THALLY_SITE_URL` in your host's environment.

Copy `.env.example` to `.env.local` only when you need optional services. Never
commit real credentials.

## License

[MIT](LICENSE)
