/**
 * Pull past.dev's published OpenAPI contract and keep the memory endpoints this
 * guide documents. Run with `npm run openapi:sync`; it rewrites `openapi.json`.
 *
 * The operations are copied unchanged so the reference never drifts from what
 * past.dev publishes. Only the path list is narrowed, and the server-side
 * webhook receiver and organization-management routes are left out.
 */
import { writeFile } from 'node:fs/promises'

const SOURCE = 'https://past.dev/openapi.json'

const KEEP: Record<string, ReadonlyArray<string>> = {
  '/api/v1/ingest': ['post'],
  '/api/v1/ingest/batch': ['post'],
  '/api/v1/ingest/{ingestionId}': ['get', 'delete'],
  '/api/v1/recall': ['post'],
  '/api/v1/identities': ['get'],
  '/api/v1/identities/{identity}': ['put', 'patch', 'get', 'delete'],
  '/api/v1/audiences': ['get'],
  '/api/v1/audiences/{slug}': ['get', 'put', 'delete'],
  '/api/v1/audiences/{slug}/recompute': ['post'],
  '/api/v1/usage': ['get'],
}

interface OpenApiDocument {
  openapi: string
  info: { title: string; version: string; description?: string }
  paths: Record<string, Record<string, unknown>>
  [key: string]: unknown
}

async function main() {
  const res = await fetch(SOURCE)
  if (!res.ok) throw new Error(`GET ${SOURCE} returned ${res.status}`)
  const spec = (await res.json()) as OpenApiDocument
  if (!spec?.paths || !spec.info) throw new Error(`${SOURCE} did not return an OpenAPI document.`)

  const paths: OpenApiDocument['paths'] = {}
  for (const [path, methods] of Object.entries(KEEP)) {
    const item = spec.paths[path]
    if (!item) throw new Error(`${SOURCE} no longer has ${path}. Update KEEP in this script.`)
    const kept: Record<string, unknown> = {}
    // Path-level parameters apply to every method, so they travel with the path.
    if (item.parameters) kept.parameters = item.parameters
    for (const method of methods) {
      if (!item[method]) throw new Error(`${SOURCE} no longer has ${method.toUpperCase()} ${path}.`)
      kept[method] = item[method]
    }
    paths[path] = kept
  }

  const out: OpenApiDocument = {
    ...spec,
    info: {
      ...spec.info,
      description:
        `The memory endpoints of the past.dev API, copied from ${SOURCE}. ` +
        'This is an unofficial guide; the source of truth is past.dev/docs.',
    },
    paths,
  }
  await writeFile('openapi.json', JSON.stringify(out, null, 2) + '\n')
  const count = Object.values(KEEP).reduce((n, m) => n + m.length, 0)
  console.log(`openapi.json: ${count} operations from ${SOURCE} (version ${spec.info.version})`)
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error)
  process.exit(1)
})
