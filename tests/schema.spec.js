const assert = require('chai').assert
const { buildSchema, buildSchemas } = require('../validator/schema/init')
const schemaCommon = require('../common/schema')
const { SchemasSpec } = require('../common/schema/types')
const fallbackHedSchemaPath = schemaCommon.config.fallbackFilePath

describe('HED schemas', () => {
  describe('Schema loading', () => {
    describe('Remote HED schemas', () => {
      it('can be loaded from a central GitHub repository', () => {
        const remoteHedSchemaVersion = '8.0.0'
        const spec = new SchemasSpec().addRemoteStandardBaseSchema(remoteHedSchemaVersion)
        return buildSchemas(spec).then(([hedSchemas, issues]) => {
          const hedSchemaVersion = hedSchemas.baseSchema.version
          assert.strictEqual(hedSchemaVersion, remoteHedSchemaVersion)
        })
      })
    })

    describe('Local HED schemas', () => {
      it('can be loaded from a file', () => {
        const localHedSchemaFile = 'tests/data/HED7.1.1.xml'
        const localHedSchemaVersion = '7.1.1'
        const spec = new SchemasSpec().addLocalBaseSchema(localHedSchemaFile)
        return buildSchemas(spec).then(([hedSchemas, issues]) => {
          const hedSchemaVersion = hedSchemas.baseSchema.version
          assert.strictEqual(hedSchemaVersion, localHedSchemaVersion)
        })
      })
    })

    describe('Remote HED library schemas', () => {
      it('can be loaded from a central GitHub repository', () => {
        const remoteHedLibrarySchemaName = 'testlib'
        const remoteHedLibrarySchemaVersion = '1.0.2'
        const spec = new SchemasSpec().addRemoteLibrarySchema(
          remoteHedLibrarySchemaName,
          remoteHedLibrarySchemaName,
          remoteHedLibrarySchemaVersion,
        )
        return buildSchemas(spec).then(([hedSchemas, issues]) => {
          const hedSchema = hedSchemas.getSchema(remoteHedLibrarySchemaName)
          assert.strictEqual(hedSchema.library, remoteHedLibrarySchemaName)
          assert.strictEqual(hedSchema.version, remoteHedLibrarySchemaVersion)
        })
      })
    })

    describe('Local HED library schemas', () => {
      it('can be loaded from a file', () => {
        const localHedLibrarySchemaName = 'testlib'
        const localHedLibrarySchemaVersion = '1.0.2'
        const localHedLibrarySchemaFile = 'tests/data/HED_testlib_1.0.2.xml'
        const spec = new SchemasSpec().addLocalSchema(localHedLibrarySchemaName, localHedLibrarySchemaFile)
        return buildSchemas(spec).then(([hedSchemas, issues]) => {
          const hedSchema = hedSchemas.getSchema(localHedLibrarySchemaName)
          assert.strictEqual(hedSchema.library, localHedLibrarySchemaName)
          assert.strictEqual(hedSchema.version, localHedLibrarySchemaVersion)
        })
      })
    })

    describe('Fallback HED schemas', () => {
      it('loads the fallback schema if a remote schema cannot be found', () => {
        // Invalid base schema version
        const remoteHedSchemaVersion = '0.0.1'
        const spec = new SchemasSpec().addRemoteStandardBaseSchema(remoteHedSchemaVersion)
        const fallbackSpec = new SchemasSpec().addLocalBaseSchema(fallbackHedSchemaPath)
        return buildSchemas(spec)
          .then(([hedSchemas, issues]) => {
            return Promise.all([Promise.resolve(hedSchemas.baseSchema.version), buildSchemas(fallbackSpec)])
          })
          .then(([loadedVersion, [fallbackHedSchemas, issues]]) => {
            const fallbackHedSchemaVersion = fallbackHedSchemas.baseSchema.version
            assert.strictEqual(loadedVersion, fallbackHedSchemaVersion)
          })
      })

      it('loads the fallback schema if a local schema cannot be found', () => {
        // Invalid base schema path
        const localHedSchemaFile = 'tests/data/HEDNotFound.xml'
        const spec = new SchemasSpec().addLocalBaseSchema(localHedSchemaFile)
        const fallbackSpec = new SchemasSpec().addLocalBaseSchema(fallbackHedSchemaPath)
        return buildSchemas(spec)
          .then(([hedSchemas, issues]) => {
            return Promise.all([Promise.resolve(hedSchemas.baseSchema.version), buildSchemas(fallbackSpec)])
          })
          .then(([loadedVersion, [fallbackHedSchemas, issues]]) => {
            const fallbackHedSchemaVersion = fallbackHedSchemas.baseSchema.version
            assert.strictEqual(loadedVersion, fallbackHedSchemaVersion)
          })
      })
    })
  })

  describe('HED-2G schemas', () => {
    const localHedSchemaFile = 'tests/data/HED7.1.1.xml'
    let hedSchemaPromise

    beforeAll(() => {
      hedSchemaPromise = buildSchema({
        path: localHedSchemaFile,
      })
    })

    it('should have tag dictionaries for all required tag attributes', () => {
      const tagDictionaryKeys = [
        'default',
        'extensionAllowed',
        'isNumeric',
        'position',
        'predicateType',
        'recommended',
        'required',
        'requireChild',
        'takesValue',
        'unique',
      ]
      return hedSchemaPromise.then((hedSchemas) => {
        const dictionaries = hedSchemas.baseSchema.attributes.tagAttributes
        assert.hasAllKeys(dictionaries, tagDictionaryKeys)
      })
    })

    it('should have unit dictionaries for all required unit attributes', () => {
      const unitDictionaryKeys = ['SIUnit', 'unitSymbol']
      return hedSchemaPromise.then((hedSchemas) => {
        const dictionaries = hedSchemas.baseSchema.attributes.unitAttributes
        assert.hasAllKeys(dictionaries, unitDictionaryKeys)
      })
    })

    it('should contain all of the required tags', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const requiredTags = ['event/category', 'event/description', 'event/label']
        const dictionariesRequiredTags = hedSchemas.baseSchema.attributes.tagAttributes['required']
        assert.hasAllKeys(dictionariesRequiredTags, requiredTags)
      })
    })

    it('should contain all of the positioned tags', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const positionedTags = ['event/category', 'event/description', 'event/label', 'event/long name']
        const dictionariesPositionedTags = hedSchemas.baseSchema.attributes.tagAttributes['position']
        assert.hasAllKeys(dictionariesPositionedTags, positionedTags)
      })
    })

    it('should contain all of the unique tags', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const uniqueTags = ['event/description', 'event/label', 'event/long name']
        const dictionariesUniqueTags = hedSchemas.baseSchema.attributes.tagAttributes['unique']
        assert.hasAllKeys(dictionariesUniqueTags, uniqueTags)
      })
    })

    it('should contain all of the tags with default units', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const defaultUnitTags = {
          'attribute/blink/time shut/#': 's',
          'attribute/blink/duration/#': 's',
          'attribute/blink/pavr/#': 'centiseconds',
          'attribute/blink/navr/#': 'centiseconds',
        }
        const dictionariesDefaultUnitTags = hedSchemas.baseSchema.attributes.tagAttributes['default']
        assert.deepStrictEqual(dictionariesDefaultUnitTags, defaultUnitTags)
      })
    })

    it('should contain all of the unit classes with their units and default units', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const defaultUnits = {
          acceleration: 'm-per-s^2',
          currency: '$',
          angle: 'radian',
          frequency: 'Hz',
          intensity: 'dB',
          jerk: 'm-per-s^3',
          luminousIntensity: 'cd',
          memorySize: 'B',
          physicalLength: 'm',
          pixels: 'px',
          speed: 'm-per-s',
          time: 's',
          clockTime: 'hour:min',
          dateTime: 'YYYY-MM-DDThh:mm:ss',
          area: 'm^2',
          volume: 'm^3',
        }
        const allUnits = {
          acceleration: ['m-per-s^2'],
          currency: ['dollar', '$', 'point', 'fraction'],
          angle: ['radian', 'rad', 'degree'],
          frequency: ['hertz', 'Hz'],
          intensity: ['dB'],
          jerk: ['m-per-s^3'],
          luminousIntensity: ['candela', 'cd'],
          memorySize: ['byte', 'B'],
          physicalLength: ['metre', 'm', 'foot', 'mile'],
          pixels: ['pixel', 'px'],
          speed: ['m-per-s', 'mph', 'kph'],
          time: ['second', 's', 'day', 'minute', 'hour'],
          clockTime: ['hour:min', 'hour:min:sec'],
          dateTime: ['YYYY-MM-DDThh:mm:ss'],
          area: ['m^2', 'px^2', 'pixel^2'],
          volume: ['m^3'],
        }

        const dictionariesUnitAttributes = hedSchemas.baseSchema.attributes.unitClassAttributes
        const dictionariesAllUnits = hedSchemas.baseSchema.attributes.unitClasses
        for (const [unitClass, unitClassAttributes] of Object.entries(dictionariesUnitAttributes)) {
          const defaultUnit = unitClassAttributes.defaultUnits
          assert.deepStrictEqual(defaultUnit[0], defaultUnits[unitClass], `Default unit for unit class ${unitClass}`)
        }
        assert.deepStrictEqual(dictionariesAllUnits, allUnits, 'All units')
      })
    })

    it('should contain the correct (large) numbers of tags with certain attributes', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const expectedAttributeTagCount = {
          isNumeric: 80,
          predicateType: 20,
          recommended: 0,
          requireChild: 64,
          takesValue: 119,
        }

        const dictionaries = hedSchemas.baseSchema.attributes.tagAttributes
        for (const [attribute, count] of Object.entries(expectedAttributeTagCount)) {
          assert.lengthOf(Object.keys(dictionaries[attribute]), count, 'Mismatch on attribute ' + attribute)
        }

        const expectedTagCount = 1116 - 119 + 2
        const expectedUnitClassCount = 63
        assert.lengthOf(
          Object.keys(hedSchemas.baseSchema.attributes.tags),
          expectedTagCount,
          'Mismatch on overall tag count',
        )
        assert.lengthOf(
          Object.keys(hedSchemas.baseSchema.attributes.tagUnitClasses),
          expectedUnitClassCount,
          'Mismatch on unit class tag count',
        )
      })
    })

    it('should identify if a tag has a certain attribute', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const testStrings = {
          value: 'Attribute/Location/Reference frame/Relative to participant/Azimuth/#',
          valueParent: 'Attribute/Location/Reference frame/Relative to participant/Azimuth',
          extensionAllowed: 'Item/Object/Road sign',
        }
        const expectedResults = {
          value: {
            default: false,
            extensionAllowed: false,
            isNumeric: true,
            position: false,
            predicateType: false,
            recommended: false,
            required: false,
            requireChild: false,
            tags: false,
            takesValue: true,
            unique: false,
            unitClass: true,
          },
          valueParent: {
            default: false,
            extensionAllowed: true,
            isNumeric: false,
            position: false,
            predicateType: false,
            recommended: false,
            required: false,
            requireChild: true,
            tags: true,
            takesValue: false,
            unique: false,
            unitClass: false,
          },
          extensionAllowed: {
            default: false,
            extensionAllowed: true,
            isNumeric: false,
            position: false,
            predicateType: false,
            recommended: false,
            required: false,
            requireChild: false,
            tags: true,
            takesValue: false,
            unique: false,
            unitClass: false,
          },
        }

        for (const [testStringKey, testString] of Object.entries(testStrings)) {
          const testStringLowercase = testString.toLowerCase()
          const expected = expectedResults[testStringKey]
          for (const [expectedKey, expectedResult] of Object.entries(expected)) {
            if (expectedKey === 'tags') {
              assert.strictEqual(
                hedSchemas.baseSchema.attributes.tags.includes(testStringLowercase),
                expectedResult,
                `Test string: ${testString}. Attribute: ${expectedKey}`,
              )
            } else if (expectedKey === 'unitClass') {
              assert.strictEqual(
                testStringLowercase in hedSchemas.baseSchema.attributes.tagUnitClasses,
                expectedResult,
                `Test string: ${testString}. Attribute: ${expectedKey}`,
              )
            } else {
              assert.strictEqual(
                hedSchemas.baseSchema.attributes.tagHasAttribute(testStringLowercase, expectedKey),
                expectedResult,
                `Test string: ${testString}. Attribute: ${expectedKey}.`,
              )
            }
          }
        }
      })
    })
  })

  describe('HED-3G schemas', () => {
    const localHedSchemaFile = 'tests/data/HED8.0.0.xml'
    let hedSchemaPromise

    beforeAll(() => {
      hedSchemaPromise = buildSchema({
        path: localHedSchemaFile,
      })
    })

    it('should contain all of the tag group tags', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const tagGroupTags = ['property/organizational-property/def-expand']
        const schemaTagGroupTags = hedSchemas.baseSchema.entries.definitions
          .get('tags')
          .getEntriesWithBooleanAttribute('tagGroup')
        assert.hasAllKeys(schemaTagGroupTags, tagGroupTags)
      })
    })

    it('should contain all of the top-level tag group tags', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const tagGroupTags = [
          'property/organizational-property/definition',
          'property/organizational-property/event-context',
          'property/data-property/data-marker/temporal-marker/onset',
          'property/data-property/data-marker/temporal-marker/offset',
        ]
        const schemaTagGroupTags = hedSchemas.baseSchema.entries.definitions
          .get('tags')
          .getEntriesWithBooleanAttribute('topLevelTagGroup')
        assert.hasAllKeys(schemaTagGroupTags, tagGroupTags)
      })
    })

    it('should contain all of the unit classes with their units and default units', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const defaultUnits = {
          accelerationUnits: 'm-per-s^2',
          angleUnits: 'radian',
          areaUnits: 'm^2',
          currencyUnits: '$',
          frequencyUnits: 'Hz',
          intensityUnits: 'dB',
          jerkUnits: 'm-per-s^3',
          memorySizeUnits: 'B',
          physicalLengthUnits: 'm',
          speedUnits: 'm-per-s',
          timeUnits: 's',
          volumeUnits: 'm^3',
          weightUnits: 'g',
        }
        const allUnits = {
          accelerationUnits: ['m-per-s^2'],
          angleUnits: ['radian', 'rad', 'degree'],
          areaUnits: ['m^2'],
          currencyUnits: ['dollar', '$', 'point'],
          frequencyUnits: ['hertz', 'Hz'],
          intensityUnits: ['dB', 'candela', 'cd'],
          jerkUnits: ['m-per-s^3'],
          memorySizeUnits: ['byte', 'B'],
          physicalLengthUnits: ['metre', 'm', 'inch', 'foot', 'mile'],
          speedUnits: ['m-per-s', 'mph', 'kph'],
          timeUnits: ['second', 's', 'day', 'minute', 'hour'],
          volumeUnits: ['m^3'],
          weightUnits: ['g', 'gram', 'pound', 'lb'],
        }

        const schemaUnitClasses = hedSchemas.baseSchema.entries.definitions.get('unitClasses')
        for (const [unitClassName, unitClass] of schemaUnitClasses) {
          const defaultUnit = unitClass.defaultUnit
          assert.strictEqual(
            defaultUnit.name,
            defaultUnits[unitClassName],
            `Default unit for unit class '${unitClassName}'`,
          )
          assert.sameDeepMembers(
            Array.from(unitClass.units.values()).map((unit) => unit.name),
            allUnits[unitClassName],
            `All units for unit class '${unitClassName}'`,
          )
        }
      })
    })

    it('should contain the correct (large) numbers of tags with certain attributes', () => {
      return hedSchemaPromise.then((hedSchemas) => {
        const expectedAttributeTagCount = {
          requireChild: 7,
          takesValue: 88,
        }

        const schemaTags = hedSchemas.baseSchema.entries.definitions.get('tags')
        for (const [attribute, count] of Object.entries(expectedAttributeTagCount)) {
          assert.lengthOf(
            schemaTags.getEntriesWithBooleanAttribute(attribute),
            count,
            'Mismatch on attribute ' + attribute,
          )
        }

        const expectedTagCount = 1110
        assert.lengthOf(schemaTags.definitions, expectedTagCount, 'Mismatch on overall tag count')

        const expectedUnitClassCount = 27
        const schemaTagsWithUnitClasses = schemaTags.filter(([, tag]) => tag.hasUnitClasses)
        assert.lengthOf(schemaTagsWithUnitClasses, expectedUnitClassCount, 'Mismatch on unit class tag count')
      })
    })
  })
})
