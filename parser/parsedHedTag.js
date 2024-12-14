import { IssueError } from '../common/issues/issues'
import ParsedHedSubstring from './parsedHedSubstring'
import { SchemaTag, SchemaValueTag, SchemaUnit } from '../schema/entries'
import TagConverter from './tagConverter'
import { SpecialChecker } from './special'

const allowedRegEx = /^[^{}\,]*$/

/**
 * A parsed HED tag.
 */
export default class ParsedHedTag extends ParsedHedSubstring {
  /**
   * The formatted canonical version of the HED tag.
   * @type {string}
   */
  formattedTag
  /**
   * The canonical form of the HED tag.
   * @type {string}
   */
  canonicalTag
  /**
   * The HED schema this tag belongs to.
   * @type {Schema}
   */
  schema
  /**
   * The schema's representation of this tag.
   *
   * @type {SchemaTag}
   * @private
   */
  _schemaTag

  /**
   * The extension part if it has an extension rather than a value
   *
   * @type {string}
   * @private
   */
  _extension

  /**
   * The remaining part of the tag after the portion actually in the schema.
   *
   * @type {string}
   * @private
   */
  _remainder

  /**
   * The value if any
   *
   * @type {string}
   * @private
   */
  _value

  /**
   * If definition this is the second value if
   *
   * @type {string}
   * @private
   */
  _splitValue

  /**
   * The units if any
   *
   * @type {string}
   * @private
   */
  _units

  /**
   * Constructor.
   *
   * @param {TagSpec} tagSpec The token for this tag.
   * @param {Schemas} hedSchemas The collection of HED schemas.
   * @param {string} hedString The original HED string.
   * @throws {IssueError} If tag conversion or parsing fails.
   */
  constructor(tagSpec, hedSchemas, hedString) {
    super(tagSpec.tag, tagSpec.bounds) // Sets originalTag and originalBounds
    this._convertTag(hedSchemas, hedString, tagSpec)
    this._normalized = this.format(false) // Sets various forms of the tag.
    this._validUnits = null
  }

  /**
   * Convert this tag to its various forms
   *
   * @param {Schemas} hedSchemas The collection of HED schemas.
   * @param {string} hedString The original HED string.
   * @param {TagSpec} tagSpec The token for this tag.
   * @throws {IssueError} If tag conversion or parsing fails.
   */
  _convertTag(hedSchemas, hedString, tagSpec) {
    const schemaName = tagSpec.library
    this.schema = hedSchemas.getSchema(schemaName)
    if (this.schema === undefined) {
      if (schemaName !== '') {
        IssueError.generateAndThrow('unmatchedLibrarySchema', {
          tag: this.originalTag,
          library: schemaName,
        })
      } else {
        IssueError.generateAndThrow('unmatchedBaseSchema', {
          tag: this.originalTag,
        })
      }
    }

    const [schemaTag, remainder] = new TagConverter(tagSpec, hedSchemas).convert()
    this._schemaTag = schemaTag
    this._remainder = remainder
    this.canonicalTag = this._schemaTag.longExtend(remainder)
    this.formattedTag = this.canonicalTag.toLowerCase()
    this._handleRemainder(schemaTag, remainder)
  }

  /**
   * Handle the remainder portion for value tag (converter handles others)
   *
   * @param {SchemaTag} schemaTag - The part of the tag that is in the schema
   * @param {string} remainder - the leftover part
   * @throws {IssueError} If parsing the remainder section fails.
   */
  _handleRemainder(schemaTag, remainder) {
    if (!(schemaTag instanceof SchemaValueTag)) {
      return
    }
    // Check that there is a value if required
    const special = SpecialChecker.getInstance()
    if (
      (schemaTag.hasAttributeName('requireChild') || special.requireValueTags.has(schemaTag.name)) &&
      remainder === ''
    ) {
      IssueError.generateAndThrow('valueRequired', { tag: this.originalTag })
    }
    // Check if this could have a two-level value
    const [value, rest] = this._getSplitValue(remainder, special)
    this._splitValue = rest

    // Resolve the units and check
    const [actualUnit, actualUnitString, actualValueString] = this._separateUnits(schemaTag, value)
    this._units = actualUnit
    this._value = actualValueString

    if (actualUnit === null && actualUnitString !== null) {
      IssueError.generateAndThrow('unitClassInvalidUnit', { tag: this.originalTag })
    }
    if (!this.checkValue(actualValueString)) {
      IssueError.generateAndThrow('invalidValue', { tag: this.originalTag })
    }
  }

  /**
   * Separate the remainder of the tag into three parts:
   *
   * @param {SchemaTag} schemaTag - The part of the tag that is in the schema
   * @param {string} remainder - the leftover part
   * @returns {[Unit, string, string]} - The actual Unit, the unit string and the value string.
   * @throws {IssueError} If parsing the remainder section fails.
   */
  _separateUnits(schemaTag, remainder) {
    const unitClasses = schemaTag.unitClasses
    let actualUnit = null
    let actualUnitString = null
    let actualValueString = remainder // If no unit class, the remainder is the value
    for (let i = 0; i < unitClasses.length; i++) {
      ;[actualUnit, actualUnitString, actualValueString] = unitClasses[i].extractUnit(remainder)
      if (actualUnit !== null) {
        break // found the unit
      }
    }
    return [actualUnit, actualUnitString, actualValueString]
  }

  /**
   * Handle special three-level tags
   * @param {string} remainder - the remainder of the tag string after schema tag
   * @param {SpecialChecker} special - the special checker for checking the special tag properties
   */
  _getSplitValue(remainder, special) {
    if (!special.allowTwoLevelValueTags.has(this.schemaTag.name)) {
      return [remainder, null]
    }
    const [first, ...rest] = remainder.split('/')
    return [first, rest.join('/')]
  }

  /**
   * Nicely format this tag.
   *
   * @param {boolean} long Whether the tags should be in long form.
   * @returns {string} The nicely formatted version of this tag.
   */
  format(long = true) {
    let tagName
    if (long) {
      tagName = this._schemaTag?.longExtend(this._remainder)
    } else {
      tagName = this._schemaTag?.extend(this._remainder)
    }
    if (tagName === undefined) {
      tagName = this.originalTag
    }
    if (this.schema?.prefix) {
      return this.schema.prefix + ':' + tagName
    } else {
      return tagName
    }
  }

  get normalized() {
    return this._normalized
  }

  /**
   * Override of {@link Object.prototype.toString}.
   *
   * @returns {string} The original form of this HED tag.
   */
  toString() {
    if (this.schema?.prefix) {
      return this.schema.prefix + ':' + this.originalTag
    } else {
      return this.originalTag
    }
  }

  /**
   * Determine whether this tag has a given attribute.
   *
   * @param {string} attribute An attribute name.
   * @returns {boolean} Whether this tag has the named attribute.
   */
  hasAttribute(attribute) {
    return this.schema?.tagHasAttribute(this.formattedTag, attribute)
  }

  /**
   * Determine whether this tag's parent tag has a given attribute.
   *
   * @param {string} attribute An attribute name.
   * @returns {boolean} Whether this tag's parent tag has the named attribute.
   */
  parentHasAttribute(attribute) {
    return this.schema?.tagHasAttribute(this.parentFormattedTag, attribute)
  }

  /**
   * Get the last part of a HED tag.
   *
   * @param {string} tagString A HED tag.
   * @returns {string} The last part of the tag using the given separator.
   */
  static getTagName(tagString) {
    const lastSlashIndex = tagString.lastIndexOf('/')
    if (lastSlashIndex === -1) {
      return tagString
    } else {
      return tagString.substring(lastSlashIndex + 1)
    }
  }

  /**
   * The trailing portion of {@link originalTag}.
   *
   * @returns {string} The "name" portion of the original tag.
   */
  get originalTagName() {
    return ParsedHedTag.getTagName(this.originalTag)
  }

  /**
   * Get the HED tag prefix (up to the last slash).
   *
   * @param {string} tagString A HED tag.
   * @returns {string} The portion of the tag up to the last slash.
   */
  static getParentTag(tagString) {
    const lastSlashIndex = tagString.lastIndexOf('/')
    if (lastSlashIndex === -1) {
      return tagString
    } else {
      return tagString.substring(0, lastSlashIndex)
    }
  }

  /**
   * The parent portion of {@link formattedTag}.
   *
   * @returns {string} The "parent" portion of the formatted tag.
   */
  get parentFormattedTag() {
    return ParsedHedTag.getParentTag(this.formattedTag)
  }

  /**
   * Iterate through a tag's ancestor tag strings.
   *
   * @param {string} tagString A tag string.
   * @yields {string} The tag's ancestor tags.
   */
  static *ancestorIterator(tagString) {
    while (tagString.lastIndexOf('/') >= 0) {
      yield tagString
      tagString = ParsedHedTag.getParentTag(tagString)
    }
    yield tagString
  }
  /*

  /!**
   * Determine whether this tag is a descendant of another tag.
   *
   * @param {ParsedHedTag|string} parent The possible parent tag.
   * @returns {boolean} Whether {@link parent} is the parent tag of this tag.
   *!/
  isDescendantOf(parent) {
    if (parent instanceof ParsedHedTag) {
      if (this.schema !== parent.schema) {
        return false
      }
      parent = parent.formattedTag
    }
    for (const ancestor of ParsedHedTag.ancestorIterator(this.formattedTag)) {
      if (ancestor === parent) {
        return true
      }
    }
    return false
  }
*/

  /**
   * Determine if this HED tag is equivalent to another HED tag.
   *
   * HED tags are deemed equivalent if they have the same schema and formatted tag string.
   *
   * @param {ParsedHedTag} other A HED tag.
   * @returns {boolean} Whether {@link other} is equivalent to this HED tag.
   */
  equivalent(other) {
    return other instanceof ParsedHedTag && this.formattedTag === other.formattedTag && this.schema === other.schema
  }

  /**
   * Get the schema tag object for this tag.
   *
   * @returns {SchemaTag} The schema tag object for this tag.
   */
  get schemaTag() {
    if (this._schemaTag instanceof SchemaValueTag) {
      return this._schemaTag.parent
    } else {
      return this._schemaTag
    }
  }

  /**
   * Get the schema tag object for this tag's value-taking form.
   *
   * @returns {SchemaValueTag} The schema tag object for this tag's value-taking form.
   */
  get takesValueTag() {
    if (this._schemaTag instanceof SchemaValueTag) {
      return this._schemaTag
    }
    return undefined
  }

  /**
   * Checks if this HED tag has the {@code takesValue} attribute.
   *
   * @returns {boolean} Whether this HED tag has the {@code takesValue} attribute.
   */
  get takesValue() {
    return this.takesValueTag !== undefined
  }

  /**
   * Checks if this HED tag has the {@code unitClass} attribute.
   *
   * @returns {boolean} Whether this HED tag has the {@code unitClass} attribute.
   */
  get hasUnitClass() {
    if (!this.takesValueTag) {
      return false
    }
    return this.takesValueTag.hasUnitClasses
  }

  /**
   * Get the unit classes for this HED tag.
   *
   * @returns {SchemaUnitClass[]} The unit classes for this HED tag.
   */
  get unitClasses() {
    if (this.hasUnitClass) {
      return this.takesValueTag.unitClasses
    }
    return []
  }

  /**
   * Get the legal units for this HED tag.
   *
   * @returns {Set<SchemaUnit>} The legal units for this HED tag.
   */
  get validUnits() {
    if (this._validUnits) {
      return this._validUnits
    }
    const tagUnitClasses = this.unitClasses
    this._validUnits = new Set()
    for (const unitClass of tagUnitClasses) {
      const unitClassUnits = this.schema?.entries.unitClasses.getEntry(unitClass.name).units
      for (const unit of unitClassUnits.values()) {
        this._validUnits.add(unit)
      }
    }
    return this._validUnits
  }

  /**
   * Check if value is a valid value for this tag.
   *
   * @param {string} value - The value to be checked.
   * @returns {boolean} The result of check -- false if not a valid value.
   */
  checkValue(value) {
    if (!this.takesValue) {
      return false
    }
    if (value === '#') {
      // Placeholders work
      return true
    }
    const valueAttributeNames = this._schemaTag.valueAttributeNames
    const valueClassNames = valueAttributeNames?.get('valueClass')
    if (!valueClassNames) {
      // No specified value classes
      return allowedRegEx.test(value)
    }
    const entryManager = this.schema.entries.valueClasses
    for (let i = 0; i < valueClassNames.length; i++) {
      if (entryManager.getEntry(valueClassNames[i]).validateValue(value)) return true
    }
    return false
  }
}
