/** Bundled HED schema configuration.
 * @module schema/config
 * */

// This list defines the base names of HED XML schema files
// that are considered "bundled" with the library.
// In browser builds (__IS_BROWSER__ === true) this list is empty so that
// all schemas are loaded from the remote GitHub repository via fetch().
// In Node.js builds the schemas are pre-loaded from the local data directory.

// @ts-ignore __IS_BROWSER__ is injected at build time by esbuild (browser build only)
const _isBrowser = typeof __IS_BROWSER__ !== 'undefined' && __IS_BROWSER__

export const localSchemaNames = _isBrowser
  ? []
  : [
      'HED8.0.0',
      'HED8.1.0',
      'HED8.2.0',
      'HED8.3.0',
      'HED8.4.0',
      'HED_lang_1.0.0',
      'HED_lang_1.1.0',
      'HED_score_1.2.0',
      'HED_score_2.0.0',
      'HED_score_2.1.0',
      // Add other bundled schema base names here if needed
    ]

let schemaMap

if (_isBrowser) {
  // In browser builds schemas load remotely; no local map needed.
  schemaMap = new Map()
} else {
  // For Node.js, pre-load the schemas from the bundled data directory.
  schemaMap = new Map(
    localSchemaNames.map((localSchema) => [localSchema, require(`../data/schemas/${localSchema}.xml`)]),
  )
}

export const localSchemaMap = schemaMap

export const getLocalSchemaVersions = function () {
  // Return a copy of the local schema names to avoid external modifications
  return localSchemaNames.map((name) => name.replace(/^HED_?/, ''))
}
