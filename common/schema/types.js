/** HED schema classes */

import { getGenerationForSchemaVersion } from '../../utils/hedData'

/**
 * An imported HED schema object.
 */
export class Schema {
  /**
   * The schema XML data.
   * @type {Object}
   */
  xmlData
  /**
   * The HED schema version.
   * @type {string}
   */
  version
  /**
   * The HED generation of this schema.
   * @type {Number}
   */
  generation
  /**
   * The HED library schema name.
   * @type {string}
   */
  library

  /**
   * Constructor.
   * @param {object} xmlData The schema XML data.
   */
  constructor(xmlData) {
    this.xmlData = xmlData
    const rootElement = xmlData.HED
    this.version = rootElement.$.version
    this.library = rootElement.$.library ?? ''

    if (this.library) {
      this.generation = 3
    } else {
      this.generation = getGenerationForSchemaVersion(this.version)
    }
  }

  /**
   * Determine if a HED tag has a particular attribute in this schema.
   *
   * @param {string} tag The HED tag to check.
   * @param {string} tagAttribute The attribute to check for.
   * @return {boolean} Whether this tag has this attribute.
   * @abstract
   */
  // eslint-disable-next-line no-unused-vars
  tagHasAttribute(tag, tagAttribute) {}
}

export class Hed2Schema extends Schema {
  /**
   * The description of tag attributes.
   * @type {SchemaAttributes}
   */
  attributes

  /**
   * Constructor.
   * @param {object} xmlData The schema XML data.
   * @param {SchemaAttributes} attributes A description of tag attributes.
   */
  constructor(xmlData, attributes) {
    super(xmlData)

    this.attributes = attributes
  }

  /**
   * Determine if a HED tag has a particular attribute in this schema.
   *
   * @param {string} tag The HED tag to check.
   * @param {string} tagAttribute The attribute to check for.
   * @return {boolean} Whether this tag has this attribute.
   */
  tagHasAttribute(tag, tagAttribute) {
    return this.attributes.tagHasAttribute(tag, tagAttribute)
  }
}

export class Hed3Schema extends Schema {
  /**
   * The collection of schema entries.
   * @type {SchemaEntries}
   */
  entries
  /**
   * The mapping between short and long tags.
   * @type {Mapping}
   */
  mapping

  /**
   * Constructor.
   * @param {object} xmlData The schema XML data.
   * @param {SchemaEntries} entries A collection of schema entries.
   * @param {Mapping} mapping A mapping between short and long tags.
   */
  constructor(xmlData, entries, mapping) {
    super(xmlData)

    this.entries = entries
    this.mapping = mapping
  }

  /**
   * Determine if a HED tag has a particular attribute in this schema.
   *
   * @param {string} tag The HED tag to check.
   * @param {string} tagAttribute The attribute to check for.
   * @return {boolean} Whether this tag has this attribute.
   */
  tagHasAttribute(tag, tagAttribute) {
    return this.entries.tagHasAttribute(tag, tagAttribute)
  }
}

/**
 * The collection of active HED schemas.
 */
export class Schemas {
  /**
   * The imported HED schemas.
   *
   * The empty string key ("") corresponds to the schema with no nickname,
   * while other keys correspond to the respective nicknames.
   *
   * This field is null for syntax-only validation.
   *
   * @type {Map<string, Schema>|null}
   */
  schemas

  /**
   * Constructor.
   * @param {Schema|Map<string, Schema>|null} schemas The imported HED schemas.
   */
  constructor(schemas) {
    if (schemas === null || schemas instanceof Map) {
      this.schemas = schemas
    } else if (schemas instanceof Schema) {
      this.schemas = new Map([['', schemas]])
    } else {
      throw new Error('Invalid type passed to Schemas constructor')
    }
  }

  /**
   * Return the schema with the given nickname.
   *
   * @param {string} schemaName A nickname in the schema set.
   * @returns {Schema} The schema object corresponding to that nickname.
   */
  getSchema(schemaName) {
    return this.schemas?.get(schemaName)
  }

  /**
   * The base schema, i.e. the schema with no nickname, if one is defined.
   *
   * @returns {Schema}
   */
  get baseSchema() {
    return this.getSchema('')
  }

  /**
   * The standard schema, i.e. primary schema implementing the HED standard, if one is defined.
   *
   * @returns {Schema}
   */
  get standardSchema() {
    for (const schema of this.schemas.values()) {
      if (schema.library === '') {
        return schema
      }
    }
    return undefined
  }

  /**
   * The library schemas, i.e. the schema with nicknames, if any are defined.
   *
   * @returns {Map<string, Schema>|null}
   */
  get librarySchemas() {
    if (this.schemas !== null) {
      const schemasCopy = new Map(this.schemas)
      schemasCopy.delete('')
      return schemasCopy
    } else {
      return null
    }
  }

  /**
   * The HED generation of this schema.
   *
   * If baseSchema is null, generation is set to 0.
   * @type {Number}
   */
  get generation() {
    if (this.schemas === null || this.schemas.size === 0) {
      return 0
    } else if (this.librarySchemas.size > 0) {
      return 3
    } else if (this.baseSchema) {
      return this.baseSchema.generation
    } else {
      return 0
    }
  }

  /**
   * Whether this schema collection is for syntactic validation only.
   * @return {boolean}
   */
  get isSyntaxOnly() {
    return this.generation === 0
  }

  /**
   * Whether this schema collection comprises HED 3 schemas.
   * @return {boolean}
   */
  get isHed3() {
    return this.generation === 3
  }
}

/**
 * A schema version specification.
 */
export class SchemaSpec {
  /**
   * The nickname of this schema.
   * @type {string}
   */
  nickname
  /**
   * The version of this schema.
   * @type {string}
   */
  version
  /**
   * The library name of this schema.
   * @type {string}
   */
  library
  /**
   * The local path for this schema.
   * @type {string}
   */
  localPath

  /**
   * Constructor.
   *
   * @param {string} nickname The nickname of this schema.
   * @param {string} version The version of this schema.
   * @param {string?} library The library name of this schema.
   * @param {string?} localPath The local path for this schema.
   */
  constructor(nickname, version, library = '', localPath = '') {
    this.nickname = nickname
    this.version = version
    this.library = library
    this.localPath = localPath
  }

  /**
   * Compute the name for the bundled copy of this schema.
   *
   * @returns {string}
   */
  get localName() {
    if (!this.library) {
      return 'HED' + this.version
    } else {
      return 'HED_' + this.library + '_' + this.version
    }
  }

  /**
   * Alias to old name of localPath.
   *
   * @todo Replace with localPath in 4.0.0.
   *
   * @returns {string} The local path for this schema.
   */
  get path() {
    return this.localPath
  }
}

/**
 * A specification mapping schema nicknames to SchemaSpec objects.
 */
export class SchemasSpec {
  /**
   * The specification mapping data.
   * @type {Map<string, SchemaSpec>}
   */
  data

  /**
   * Constructor.
   */
  constructor() {
    this.data = new Map()
  }

  /**
   * Add a schema to this specification.
   *
   * @param {SchemaSpec} schemaSpec A schema specification.
   * @returns {SchemasSpec| map} This object.
   */
  addSchemaSpec(schemaSpec) {
    this.data.set(schemaSpec.nickname, schemaSpec)
    return this
  }

  /**
   * Determine whether this specification already has a schema with the given nickname.
   *
   * @param {SchemaSpec} schemaSpec A schema specification with a nickname.
   * @returns {boolean} Whether the nickname exists in this specification.
   */
  isDuplicate(schemaSpec) {
    return this.data.has(schemaSpec.nickname)
  }
}
