import pluralize from 'pluralize'
pluralize.addUncountableRule('hertz')

import { IssueError } from '../issues/issues'
import Memoizer from '../utils/memoizer'

/**
 * SchemaEntries class
 */
export class SchemaEntries extends Memoizer {
  /**
   * The schema's properties.
   * @type {SchemaEntryManager<SchemaProperty>}
   */
  properties

  /**
   * The schema's attributes.
   * @type {SchemaEntryManager<SchemaAttribute>}
   */
  attributes

  /**
   * The schema's value classes.
   * @type {SchemaEntryManager<SchemaValueClass>}
   */
  valueClasses

  /**
   * The schema's unit classes.
   * @type {SchemaEntryManager<SchemaUnitClass>}
   */
  unitClasses

  /**
   * The schema's unit modifiers.
   * @type {SchemaEntryManager<SchemaUnitModifier>}
   */
  unitModifiers

  /**
   * The schema's tags.
   * @type {SchemaEntryManager<SchemaTag>}
   */
  tags

  /**
   * Constructor.
   * @param {SchemaParser} schemaParser A constructed schema parser.
   */
  constructor(schemaParser) {
    super()
    this.properties = new SchemaEntryManager(schemaParser.properties)
    this.attributes = new SchemaEntryManager(schemaParser.attributes)
    this.valueClasses = schemaParser.valueClasses
    this.unitClasses = schemaParser.unitClasses
    this.unitModifiers = schemaParser.unitModifiers
    this.tags = schemaParser.tags
  }
}

/**
 * A manager of {@link SchemaEntry} objects.
 *
 * @template T
 */
export class SchemaEntryManager extends Memoizer {
  /**
   * The definitions managed by this entry manager.
   * @type {Map<string, T>}
   */
  _definitions

  /**
   * Constructor.
   *
   * @param {Map<string, T>} definitions A map of schema entry definitions.
   */
  constructor(definitions) {
    super()
    this._definitions = definitions
  }

  /**
   * Iterator over the entry manager's entries.
   *
   * @template T
   * @returns {IterableIterator} - [string, T]
   */
  [Symbol.iterator]() {
    return this._definitions.entries()
  }

  /**
   * Iterator over the entry manager's keys.
   *
   * @returns {IterableIterator} - [string]
   */
  keys() {
    return this._definitions.keys()
  }

  /**
   * Iterator over the entry manager's keys.
   *
   * @returns {IterableIterator} - [T]
   */
  values() {
    return this._definitions.values()
  }

  /**
   * Determine whether the entry with the given name exists.
   *
   * @param {string} name The name of the entry.
   * @return {boolean} Whether the entry exists.
   */
  hasEntry(name) {
    return this._definitions.has(name)
  }

  /**
   * Get the entry with the given name.
   *
   * @param {string} name - The name of the entry to retrieve.
   * @returns {T} - The entry with that name.
   */
  getEntry(name) {
    return this._definitions.get(name)
  }

  /**
   * Get a collection of entries with the given boolean attribute.
   *
   * @param {string} booleanAttributeName - The name of boolean attribute to filter on.
   * @returns {Map} - string->T representing a  collection of entries with that attribute.
   */
  getEntriesWithBooleanAttribute(booleanAttributeName) {
    return this._memoize(booleanAttributeName, () => {
      return this.filter(([, v]) => {
        return v.hasBooleanAttribute(booleanAttributeName)
      })
    })
  }

  /**
   * Filter the map underlying this manager.
   *
   * @param {function} fn -  ([string, T]): boolean specifying the filtering function.
   * @returns {Map} - string->T representing a  collection of entries with that attribute.
   */
  filter(fn) {
    return SchemaEntryManager._filterDefinitionMap(this._definitions, fn)
  }

  /**
   * Filter a definition map.
   *
   * @template T
   * @param {Map<string, T>} definitionMap The definition map.
   * @param {function} fn -  ([string, T]):boolean specifying the filtering function.
   * @returns {Map} - string->T representing the filtered definitions.
   * @protected
   */
  static _filterDefinitionMap(definitionMap, fn) {
    const pairArray = Array.from(definitionMap.entries())
    return new Map(pairArray.filter((entry) => fn(entry)))
  }

  /**
   * The number of entries in this collection.
   *
   * @returns {number} The number of entries in this collection.
   */
  get length() {
    return this._definitions.size
  }
}

/**
 * SchemaEntry class
 */
export class SchemaEntry extends Memoizer {
  /**
   * The name of this schema entry.
   * @type {string}
   */
  _name

  constructor(name) {
    super()
    this._name = name
  }

  /**
   * The name of this schema entry.
   * @returns {string}
   */
  get name() {
    return this._name
  }

  /**
   * Whether this schema entry has this attribute (by name).
   *
   * This method is a stub to be overridden in {@link SchemaEntryWithAttributes}.
   *
   * @param {string} attributeName The attribute to check for.
   * @returns {boolean} Whether this schema entry has this attribute.
   */
  // eslint-disable-next-line no-unused-vars
  hasBooleanAttribute(attributeName) {
    return false
  }
}

// TODO: Switch back to class constant once upstream bug is fixed.
const categoryProperty = 'categoryProperty'
const typeProperty = 'typeProperty'
const roleProperty = 'roleProperty'

/**
 * A schema property.
 */
export class SchemaProperty extends SchemaEntry {
  /**
   * The type of the property.
   * @type {string}
   */
  _propertyType

  constructor(name, propertyType) {
    super(name)
    this._propertyType = propertyType
  }

  /**
   * Whether this property describes a schema category.
   * @returns {boolean}
   */
  get isCategoryProperty() {
    return this._propertyType === categoryProperty
  }

  /**
   * Whether this property describes a data type.
   * @returns {boolean}
   */
  get isTypeProperty() {
    return this._propertyType === typeProperty
  }

  /**
   * Whether this property describes a role.
   * @returns {boolean}
   */
  get isRoleProperty() {
    return this._propertyType === roleProperty
  }
}

// Pseudo-properties

// TODO: Switch back to class constant once upstream bug is fixed.
export const nodeProperty = new SchemaProperty('nodeProperty', categoryProperty)
export const schemaAttributeProperty = new SchemaProperty('schemaAttributeProperty', categoryProperty)
const stringProperty = new SchemaProperty('stringProperty', typeProperty)

/**
 * A schema attribute.
 */
export class SchemaAttribute extends SchemaEntry {
  /**
   * The categories of elements this schema attribute applies to.
   * @type {Set<SchemaProperty>}
   */
  _categoryProperties

  /**
   * The data type of this schema attribute.
   * @type {SchemaProperty}
   */
  _typeProperty

  /**
   * The set of role properties for this schema attribute.
   * @type {Set<SchemaProperty>}
   */
  _roleProperties

  /**
   * Constructor.
   *
   * @param {string} name The name of the schema attribute.
   * @param {SchemaProperty[]} properties The properties assigned to this schema attribute.
   */
  constructor(name, properties) {
    super(name, new Set(), new Map())

    // Parse properties
    const categoryProperties = properties.filter((property) => property?.isCategoryProperty)
    this._categoryProperties = categoryProperties.length === 0 ? new Set([nodeProperty]) : new Set(categoryProperties)
    const typeProperties = properties.filter((property) => property?.isTypeProperty)
    this._typeProperty = typeProperties.length === 0 ? stringProperty : typeProperties[0]
    this._roleProperties = new Set(properties.filter((property) => property?.isRoleProperty))
  }

  /**
   * The categories of elements this schema attribute applies to.
   * @returns {Set<SchemaProperty>|SchemaProperty|undefined}
   */
  get categoryProperty() {
    switch (this._categoryProperties.size) {
      case 0:
        return undefined
      case 1:
        return Array.from(this._categoryProperties)[0]
      default:
        return this._categoryProperties
    }
  }

  /**
   * The data type property of this schema attribute.
   * @returns {SchemaProperty}
   */
  get typeProperty() {
    return this._typeProperty
  }

  /**
   * The set of role properties for this schema attribute.
   * @returns {Set<SchemaProperty>}
   */
  get roleProperties() {
    return new Set(this._roleProperties)
  }
}

/**
 * SchemaEntryWithAttributes class
 */
export class SchemaEntryWithAttributes extends SchemaEntry {
  /**
   * The set of boolean attributes this schema entry has.
   * @type {Set<SchemaAttribute>}
   */
  booleanAttributes

  /**
   * The collection of value attributes this schema entry has.
   * @type {Map<SchemaAttribute, *>}
   */
  valueAttributes

  /**
   * The set of boolean attribute names this schema entry has.
   * @type {Set<string>}
   */
  booleanAttributeNames

  /**
   * The collection of value attribute names this schema entry has.
   * @type {Map<string, *>}
   */
  valueAttributeNames

  constructor(name, booleanAttributes, valueAttributes) {
    super(name)
    this.booleanAttributes = booleanAttributes
    this.valueAttributes = valueAttributes
    this._parseAttributeNames()
  }

  /**
   * Create aliases of the attribute collections keyed on their names.
   *
   * @private
   */
  _parseAttributeNames() {
    this.booleanAttributeNames = new Set()
    for (const attribute of this.booleanAttributes) {
      this.booleanAttributeNames.add(attribute.name)
    }
    this.valueAttributeNames = new Map()
    for (const [attributeName, value] of this.valueAttributes) {
      this.valueAttributeNames.set(attributeName.name, value)
    }
  }

  /**
   * Whether this schema entry has this attribute (by name).
   * @param {string} attributeName The attribute to check for.
   * @returns {boolean} Whether this schema entry has this attribute.
   */
  hasAttribute(attributeName) {
    return this.booleanAttributeNames.has(attributeName) || this.valueAttributeNames.has(attributeName)
  }

  /**
   * Whether this schema entry has this boolean attribute (by name).
   * @param {string} attributeName The attribute to check for.
   * @returns {boolean} Whether this schema entry has this attribute.
   */
  hasBooleanAttribute(attributeName) {
    return this.booleanAttributeNames.has(attributeName)
  }

  /**
   * Retrieve the value of a value attribute (by name) on this schema entry.
   * @param {string} attributeName The attribute whose value should be returned.
   * @param {boolean} alwaysReturnArray Whether to return a singleton array instead of a scalar value.
   * @returns {*} The value of the attribute.
   */
  getAttributeValue(attributeName, alwaysReturnArray = false) {
    return SchemaEntryWithAttributes._getMapArrayValue(this.valueAttributeNames, attributeName, alwaysReturnArray)
  }

  /**
   * Return a map value, with a scalar being returned in lieu of a singleton array if alwaysReturnArray is false.
   *
   * @template K,V
   * @param {Map<K,V>} map The map to search.
   * @param {K} key A key in the map.
   * @param {boolean} alwaysReturnArray Whether to return a singleton array instead of a scalar value.
   * @returns {V|V[]} The value for the key in the passed map.
   * @private
   */
  static _getMapArrayValue(map, key, alwaysReturnArray) {
    const value = map.get(key)
    if (!alwaysReturnArray && Array.isArray(value) && value.length === 1) {
      return value[0]
    } else {
      return value
    }
  }
}

/**
 * SchemaUnit class
 */
export class SchemaUnit extends SchemaEntryWithAttributes {
  /**
   * The legal derivatives of this unit.
   * @type {string[]}
   */
  _derivativeUnits

  /**
   * Constructor.
   *
   * @param {string} name The name of the unit.
   * @param {Set<SchemaAttribute>} booleanAttributes This unit's boolean attributes.
   * @param {Map<SchemaAttribute, *>} valueAttributes This unit's key-value attributes.
   * @param {SchemaEntryManager<SchemaUnitModifier>} unitModifiers The collection of unit modifiers.
   */
  constructor(name, booleanAttributes, valueAttributes, unitModifiers) {
    super(name, booleanAttributes, valueAttributes)

    this._derivativeUnits = [name]
    if (!this.isSIUnit) {
      this._pushPluralUnit()
      return
    }
    if (this.isUnitSymbol) {
      const SIUnitSymbolModifiers = unitModifiers.getEntriesWithBooleanAttribute('SIUnitSymbolModifier')
      for (const modifierName of SIUnitSymbolModifiers.keys()) {
        this._derivativeUnits.push(modifierName + name)
      }
    } else {
      const SIUnitModifiers = unitModifiers.getEntriesWithBooleanAttribute('SIUnitModifier')
      const pluralUnit = this._pushPluralUnit()
      for (const modifierName of SIUnitModifiers.keys()) {
        this._derivativeUnits.push(modifierName + name, modifierName + pluralUnit)
      }
    }
  }

  _pushPluralUnit() {
    if (!this.isUnitSymbol) {
      const pluralUnit = pluralize.plural(this._name)
      this._derivativeUnits.push(pluralUnit)
      return pluralUnit
    }
    return null
  }

  *derivativeUnits() {
    for (const unit of this._derivativeUnits) {
      yield unit
    }
  }

  get isPrefixUnit() {
    return this.hasAttribute('unitPrefix')
  }

  get isSIUnit() {
    return this.hasAttribute('SIUnit')
  }

  get isUnitSymbol() {
    return this.hasAttribute('unitSymbol')
  }

  /**
   * Determine if a value has this unit.
   *
   * @param {string} value -- either the whole value or the part after a blank (if not a prefix unit)
   * @returns {boolean} Whether the value has these units.
   */
  validateUnit(value) {
    if (value == null || value === '') {
      return false
    }
    if (this.isPrefixUnit) {
      return value.startsWith(this.name)
    }

    for (const dUnit of this.derivativeUnits()) {
      if (value === dUnit) {
        return true
      }
    }
    return false
  }
}

/**
 * SchemaUnitClass class
 */
export class SchemaUnitClass extends SchemaEntryWithAttributes {
  /**
   * The units for this unit class.
   * @type {Map<string, SchemaUnit>}
   */
  _units

  /**
   * Constructor.
   *
   * @param {string} name The name of this unit class.
   * @param {Set<SchemaAttribute>} booleanAttributes The boolean attributes for this unit class.
   * @param {Map<SchemaAttribute, *>} valueAttributes The value attributes for this unit class.
   * @param {Map<string, SchemaUnit>} units The units for this unit class.
   */
  constructor(name, booleanAttributes, valueAttributes, units) {
    super(name, booleanAttributes, valueAttributes)
    this._units = units
  }

  /**
   * Get the units for this unit class.
   * @returns {Map<string, SchemaUnit>}
   */
  get units() {
    return new Map(this._units)
  }

  /**
   * Get the default unit for this unit class.
   * @returns {SchemaUnit}
   */
  get defaultUnit() {
    return this._units.get(this.getAttributeValue('defaultUnits'))
  }

  /**
   * Extracts the Unit class and remainder
   * @returns {Array} [SchemaUnit, string, string] containing unit class, unit string, and value string
   */
  extractUnit(value) {
    let actualUnit = null // The Unit class of the value
    let actualValueString = null // The actual value part of the value
    let actualUnitString = null
    let lastPart = null
    let firstPart = null
    const index = value.indexOf(' ')
    if (index !== -1) {
      lastPart = value.slice(index + 1)
      firstPart = value.slice(0, index)
    } else {
      // no blank -- there are no units
      return [null, null, value]
    }
    actualValueString = firstPart
    actualUnitString = lastPart
    for (const unit of this._units.values()) {
      if (!unit.isPrefixUnit && unit.validateUnit(lastPart)) {
        // Checking if it is non-prefixed unit
        actualValueString = firstPart
        actualUnitString = lastPart
        actualUnit = unit
        break
      } else if (!unit.isPrefixUnit) {
        continue
      }
      if (unit.validateUnit(firstPart)) {
        actualUnit = unit
        actualValueString = value.substring(unit.name.length + 1)
        actualUnitString = unit.name
        break
      }
      // If it got here, can only be a prefix Unit
    }
    return [actualUnit, actualUnitString, actualValueString]
  }
}

/**
 * SchemaUnitModifier class
 */
export class SchemaUnitModifier extends SchemaEntryWithAttributes {
  constructor(name, booleanAttributes, valueAttributes) {
    super(name, booleanAttributes, valueAttributes)
  }
}

/**
 * SchemaValueClass class
 */
export class SchemaValueClass extends SchemaEntryWithAttributes {
  /**
   * The character class-based regular expression.
   * @type {RegExp}
   * @private
   */
  _charClassRegex
  /**
   * The "word form"-based regular expression.
   * @type {RegExp}
   * @private
   */
  _wordRegex

  /**
   * Constructor.
   *
   * @param {string} name The name of this value class.
   * @param {Set<SchemaAttribute>} booleanAttributes The boolean attributes for this value class.
   * @param {Map<SchemaAttribute, *>} valueAttributes The value attributes for this value class.
   * @param {RegExp} charClassRegex The character class-based regular expression for this value class.
   * @param {RegExp} wordRegex The "word form"-based regular expression for this value class.
   */

  constructor(name, booleanAttributes, valueAttributes, charClassRegex, wordRegex) {
    super(name, booleanAttributes, valueAttributes)
    this._charClassRegex = charClassRegex
    this._wordRegex = wordRegex
  }

  /**
   * Determine if a value is valid according to this value class.
   *
   * @param {string} value A HED value.
   * @returns {boolean} Whether the value conforms to this value class.
   */
  validateValue(value) {
    return this._wordRegex.test(value) && this._charClassRegex.test(value)
  }
}

/**
 * A tag in a HED schema.
 */
export class SchemaTag extends SchemaEntryWithAttributes {
  /**
   * This tag's parent tag.
   * @type {SchemaTag}
   * @private
   */
  _parent

  /**
   * This tag's unit classes.
   * @type {SchemaUnitClass[]}
   * @private
   */
  _unitClasses

  /**
   * This tag's value-classes
   * @type {SchemaValueClass[]}
   * @private
   */
  _valueClasses

  /**
   * This tag's value-taking child.
   * @type {SchemaValueTag}
   * @private
   */
  _valueTag

  /**
   * Constructor.
   *
   * @param {string} name The name of this tag.
   * @param {Set<SchemaAttribute>} booleanAttributes The boolean attributes for this tag.
   * @param {Map<SchemaAttribute, *>} valueAttributes The value attributes for this tag.
   * @param {SchemaUnitClass[]} unitClasses The unit classes for this tag.
   * @param {SchemaValueClass[]} valueClasses The value classes for this tag.
   */
  constructor(name, booleanAttributes, valueAttributes, unitClasses, valueClasses) {
    super(name, booleanAttributes, valueAttributes)
    this._unitClasses = unitClasses ?? []
    this._valueClasses = valueClasses ?? []
  }

  /**
   * This tag's unit classes.
   * @type {SchemaUnitClass[]}
   */
  get unitClasses() {
    return this._unitClasses.slice() // The slice prevents modification
  }

  /**
   * Whether this tag has any unit classes.
   * @returns {boolean}
   */
  get hasUnitClasses() {
    return this._unitClasses.length !== 0
  }

  /**
   * This tag's value classes.
   * @type {SchemaValueClass[]}
   */
  get valueClasses() {
    return this._valueClasses.slice()
  }

  /**
   * This tag's value-taking child tag.
   * @returns {SchemaValueTag}
   */
  get valueTag() {
    return this._valueTag
  }

  /**
   * Set the tag's value-taking child tag.
   * @param {SchemaValueTag} newValueTag The new value-taking child tag.
   */
  set valueTag(newValueTag) {
    if (!this._isPrivateFieldSet(this._valueTag, 'value tag')) {
      this._valueTag = newValueTag
    }
  }

  /**
   * This tag's parent tag.
   * @type {SchemaTag}
   */
  get parent() {
    return this._parent
  }

  /**
   * Set the tag's parent tag.
   * @param {SchemaTag} newParent The new parent tag.
   */
  set parent(newParent) {
    if (!this._isPrivateFieldSet(this._parent, 'parent')) {
      this._parent = newParent
    }
  }

  /**
   * Throw an error if a private field is already set.
   *
   * @param {*} field The field being set.
   * @param {string} fieldName The name of the field (for error reporting).
   * @return {boolean} Whether the field is set (never returns true).
   * @throws {IssueError} If the field is already set.
   * @private
   */
  _isPrivateFieldSet(field, fieldName) {
    if (field !== undefined) {
      IssueError.generateAndThrowInternalError(
        `Attempted to set ${fieldName} for schema tag ${this.longName} when it already has one.`,
      )
    }
    return false
  }

  /**
   * Return all of this tag's ancestors.
   * @returns {Array}
   */
  get ancestors() {
    return this._memoize('ancestors', () => {
      if (this.parent) {
        return [this.parent, ...this.parent.ancestors]
      }
      return []
    })
  }

  /**
   * This tag's long name.
   * @returns {string}
   */
  get longName() {
    const nameParts = this.ancestors.map((parentTag) => parentTag.name)
    nameParts.reverse().push(this.name)
    return nameParts.join('/')
  }

  /**
   * Extend this tag's short name.
   *
   * @param {string} extension The extension.
   * @returns {string} The extended short string.
   */
  extend(extension) {
    if (extension) {
      return this.name + '/' + extension
    } else {
      return this.name
    }
  }

  /**
   * Extend this tag's long name.
   *
   * @param {string} extension The extension.
   * @returns {string} The extended long string.
   */
  longExtend(extension) {
    if (extension) {
      return this.longName + '/' + extension
    } else {
      return this.longName
    }
  }
}

/**
 * A value-taking tag in a HED schema.
 */
export class SchemaValueTag extends SchemaTag {
  /**
   * This tag's long name.
   * @returns {string}
   */
  get longName() {
    const nameParts = this.ancestors.map((parentTag) => parentTag.name)
    nameParts.reverse().push('#')
    return nameParts.join('/')
  }

  /**
   * Extend this tag's short name.
   *
   * @param {string} extension The extension.
   * @returns {string} The extended short string.
   */
  extend(extension) {
    return this.parent.extend(extension)
  }

  /**
   * Extend this tag's long name.
   *
   * @param {string} extension The extension.
   * @returns {string} The extended long string.
   */
  longExtend(extension) {
    return this.parent.longExtend(extension)
  }
}
