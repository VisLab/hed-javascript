import { IssueError } from '../common/issues/issues'
import { getTagSlashIndices } from '../utils/hedStrings'
import { SchemaValueTag } from '../validator/schema/types'

/**
 * Converter from a tag specification to a schema-based tag object.
 */
export default class TagConverter {
  /**
   * A parsed tag token.
   * @type {TagSpec}
   */
  tagSpec
  /**
   * The tag string to convert.
   * @type {string}
   */
  tagString
  /**
   * The tag string split by slashes.
   * @type {string[]}
   */
  tagLevels
  /**
   * The indices of the tag string's slashes.
   * @type {number[]}
   */
  tagSlashes
  /**
   * A HED schema collection.
   * @type {Schemas}
   */
  hedSchemas
  /**
   * The entry manager for the tags in the active schema.
   * @type {SchemaTagManager}
   */
  tagMapping
  /**
   * The converted tag in the schema.
   * @type {SchemaTag}
   */
  schemaTag
  /**
   * The remainder of the tag string.
   * @type {string}
   */
  remainder

  /**
   * Constructor.
   *
   * @param {TagSpec} tagSpec The tag specification to convert.
   * @param {Schemas} hedSchemas The HED schema collection.
   */
  constructor(tagSpec, hedSchemas) {
    this.hedSchemas = hedSchemas
    this.tagMapping = hedSchemas.getSchema(tagSpec.library).entries.tags
    this.tagSpec = tagSpec
    this.tagString = tagSpec.tag
    this.tagLevels = this.tagString.split('/')
    this.tagSlashes = getTagSlashIndices(this.tagString)
  }

  /**
   * Retrieve the {@link SchemaTag} object for a tag specification.
   *
   * @returns {[SchemaTag, string]} The schema's corresponding tag object and the remainder of the tag string.
   */
  convert() {
    let parentTag = undefined
    for (let i = 0; i < this.tagLevels.length; i++) {
      if (parentTag?.valueTag) {
        this._setSchemaTag(parentTag.valueTag, i)
        break
      }
      const childTag = this._validateChildTag(parentTag, i)
      if (childTag === undefined) {
        this._setSchemaTag(parentTag, i)
      }
      parentTag = childTag
    }
    this._setSchemaTag(parentTag, this.tagLevels.length + 1)
    return [this.schemaTag, this.remainder]
  }

  _validateChildTag(parentTag, i) {
    const childTag = this._getSchemaTag(i)
    if (this.schemaTag instanceof SchemaValueTag) {
      IssueError.generateAndThrow('internalConsistencyError', {
        message: 'Child tag is a value tag which should have been handled earlier.',
      })
    }
    if (childTag === undefined && i === 0) {
      IssueError.generateAndThrow('invalidTag', { tag: this.tagString })
    }
    if (childTag === undefined && parentTag && !parentTag.hasAttributeName('extensionAllowed')) {
      IssueError.generateAndThrow('invalidExtension', {
        tag: this.tagLevels[i],
        parentTag: parentTag.longName,
      })
    }
    if (childTag !== undefined && i > 0 && (childTag.parent === undefined || childTag.parent !== parentTag)) {
      IssueError.generateAndThrow('invalidParentNode', {
        tag: this.tagLevels[i],
        parentTag: childTag.longName,
      })
    }
    return childTag
  }

  _getSchemaTag(i) {
    let tagLevel = this.tagLevels[i].toLowerCase()
    if (i === 0) {
      tagLevel = tagLevel.trimLeft()
    }
    if (tagLevel === '' || tagLevel !== tagLevel.trim()) {
      IssueError.generateAndThrow('invalidTag', { tag: this.tagString })
    }
    return this.tagMapping.getEntry(tagLevel)
  }

  _setSchemaTag(schemaTag, i) {
    if (this.schemaTag !== undefined) {
      return
    }
    this.schemaTag = schemaTag
    this.remainder = this.tagLevels.slice(i).join('/')
    if (this.schemaTag?.hasAttributeName('requireChild') && !this.remainder) {
      IssueError.generateAndThrow('childRequired', { tag: this.tagString })
    }
  }
}
