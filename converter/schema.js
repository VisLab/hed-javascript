import { Schemas } from '../common/schema/types'
import { buildSchema as validatorBuildSchema } from '../validator/schema/init'

import { Mapping, TagEntry } from './types'
import { getTagName } from '../utils/hedStrings'
import { generateIssue, IssueError } from '../common/issues/issues'

/**
 * Build a short-long mapping object from schema XML data.
 *
 * @param {SchemaEntries} entries The schema XML data.
 * @returns {Mapping} The mapping object.
 */
export const buildMappingObject = function (entries) {
  /**
   * @type {Map<string, TagEntry>}
   */
  const shortTagData = new Map()
  /**
   * @type {Map<string, TagEntry>}
   */
  const longTagData = new Map()
  /**
   * @type {Set<string>}
   */
  const takesValueTags = new Set()
  /**
   * @type {SchemaEntryManager<SchemaTag>}
   */
  const schemaTags = entries.definitions.get('tags')
  for (const tag of schemaTags.values()) {
    const shortTag = getTagName(tag.name)
    const lowercaseShortTag = shortTag.toLowerCase()
    if (shortTag === '#') {
      takesValueTags.add(getTagName(tag.parent.name).toLowerCase())
      continue
    }
    const tagObject = new TagEntry(shortTag, tag.name)
    longTagData.set(tag.name, tagObject)
    if (!shortTagData.has(lowercaseShortTag)) {
      shortTagData.set(lowercaseShortTag, tagObject)
    } else {
      throw new IssueError(generateIssue('duplicateTagsInSchema', {}))
    }
  }
  for (const tag of takesValueTags) {
    shortTagData.get(tag).takesValue = true
  }
  return new Mapping(shortTagData, longTagData)
}

/**
 * Build a schema container object containing a short-long mapping from a base schema version or path description.
 *
 * @param {{path: string?, version: string?}} schemaDef The description of which schema to use.
 * @returns {Promise<never>|Promise<Schemas>} The schema container object or an error.
 * @deprecated
 */
export const buildSchema = (schemaDef) => validatorBuildSchema(schemaDef)
