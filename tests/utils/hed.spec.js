import chai from 'chai'
const assert = chai.assert
import { beforeAll, describe, it } from '@jest/globals'

import * as hed from '../../src/utils/hedStrings'
import { SchemaSpec, SchemasSpec } from '../../src/schema/specs'
import { buildSchemas } from '../../src/schema/init'

describe('HED tag string utility functions', () => {
  describe('Syntactic utility functions', () => {
    /**
     * Test-validate a list of strings.
     *
     * @template T
     * @param {Object<string, string>} testStrings The strings to test.
     * @param {Object<string, T>} expectedResults The expected results.
     * @param {function (string): T} testFunction The testing function.
     */
    const validator = function (testStrings, expectedResults, testFunction) {
      for (const [testStringKey, testString] of Object.entries(testStrings)) {
        assert.property(expectedResults, testStringKey, testStringKey + ' is not in expectedResults')
        const testResult = testFunction(testString)
        assert.deepStrictEqual(testResult, expectedResults[testStringKey], testString)
      }
    }

    it('should properly replace tag values with the pound character', () => {
      const testStrings = {
        slash: 'Event/Duration/4 ms',
        noSlash: 'Something',
      }
      const expectedResults = {
        slash: 'Event/Duration/#',
        noSlash: '#',
      }
      validator(testStrings, expectedResults, (string) => {
        return hed.replaceTagNameWithPound(string)
      })
    })

    it('should detect the locations of slashes in a tag', () => {
      const testStrings = {
        description: 'Event/Description/Something',
        direction: 'Attribute/Direction/Left',
        noSlash: 'Something',
      }
      const expectedResults = {
        description: [5, 17],
        direction: [9, 19],
        noSlash: [],
      }
      validator(testStrings, expectedResults, (string) => {
        return hed.getTagSlashIndices(string)
      })
    })

    it('should extract the last part of a tag', () => {
      const testStrings = {
        description: 'Event/Description/Something',
        direction: 'Attribute/Direction/Left',
        noSlash: 'Participant',
      }
      const expectedResults = {
        description: 'Something',
        direction: 'Left',
        noSlash: 'Participant',
      }
      validator(testStrings, expectedResults, (string) => {
        return hed.getTagName(string)
      })
    })

    it('should extract the parent part of a tag', () => {
      const testStrings = {
        description: 'Event/Description/Something',
        direction: 'Attribute/Direction/Left',
        noSlash: 'Participant',
      }
      const expectedResults = {
        description: 'Event/Description',
        direction: 'Attribute/Direction',
        noSlash: 'Participant',
      }
      validator(testStrings, expectedResults, (string) => {
        return hed.getParentTag(string)
      })
    })

    it('must be surrounded by parentheses', () => {
      const testStrings = {
        group: '(/Attribute/Object side/Left,/Participant/Effect/Body part/Arm)',
        nonGroup: '/Attribute/Object side/Left,/Participant/Effect/Body part/Arm',
      }
      const expectedResults = {
        group: true,
        nonGroup: false,
      }
      validator(testStrings, expectedResults, (string) => {
        return hed.hedStringIsAGroup(string)
      })
    })

    it('can have its parentheses removed', () => {
      const testStrings = {
        group: '(/Attribute/Object side/Left,/Participant/Effect/Body part/Arm)',
      }
      const expectedResults = {
        group: '/Attribute/Object side/Left,/Participant/Effect/Body part/Arm',
      }
      validator(testStrings, expectedResults, (string) => {
        return hed.removeGroupParentheses(string)
      })
    })

    it.skip('should properly determine valid values', () => {
      const testStrings = {
        integer: '4',
        decimal: '21.2',
        scientific: '3.4e2',
        negative: '-9.5e-1',
        placeholder: '#',
        time: '22:45',
        name: 'abc',
        word: 'one',
        space: 'spaced out',
      }
      const expectedResultsHed2 = {
        integer: true,
        decimal: true,
        scientific: true,
        negative: true,
        placeholder: true,
        time: true,
        name: true,
        word: true,
        space: true,
      }
      const expectedResultsHed2Numeric = {
        integer: true,
        decimal: true,
        scientific: true,
        negative: true,
        placeholder: true,
        time: false,
        name: false,
        word: false,
        space: false,
      }
      const expectedResultsHed3 = {
        integer: true,
        decimal: true,
        scientific: true,
        negative: true,
        placeholder: true,
        time: false,
        name: true,
        word: true,
        space: true,
      }
      const expectedResultsHed3Numeric = {
        integer: true,
        decimal: true,
        scientific: true,
        negative: true,
        placeholder: true,
        time: false,
        name: false,
        word: false,
        space: false,
      }
      validator(testStrings, expectedResultsHed2, (string) => {
        return hed.validateValue(string, false, false)
      })
      validator(testStrings, expectedResultsHed2Numeric, (string) => {
        return hed.validateValue(string, true, false)
      })
      validator(testStrings, expectedResultsHed3, (string) => {
        return hed.validateValue(string, false, true)
      })
      validator(testStrings, expectedResultsHed3Numeric, (string) => {
        return hed.validateValue(string, true, true)
      })
    })
  })

  describe('HED tag schema-based utility functions', () => {
    const localHedSchemaFile = 'tests/data/HED7.1.1.xml'
    let hedSchemas

    beforeAll(async () => {
      const spec1 = new SchemaSpec('', '7.1.1', '', localHedSchemaFile)
      const specs = new SchemasSpec().addSchemaSpec(spec1)
      hedSchemas = await buildSchemas(specs)
    })

    it.skip('should strip valid units from a value', () => {
      const dollarsString = '$25.99'
      const volumeString = '100 m^3'
      const prefixedVolumeString = '100 cm^3'
      const invalidVolumeString = '200 cm'
      const currencyUnits = ['dollars', '$', 'points', 'fraction']
      const volumeUnits = ['m^3']
      const strippedDollarsString = hed.validateUnits(dollarsString, currencyUnits, hedSchemas.baseSchema.attributes)
      const strippedVolumeString = hed.validateUnits(volumeString, volumeUnits, hedSchemas.baseSchema.attributes)
      const strippedPrefixedVolumeString = hed.validateUnits(
        prefixedVolumeString,
        volumeUnits,
        hedSchemas.baseSchema.attributes,
      )
      const strippedInvalidVolumeString = hed.validateUnits(
        invalidVolumeString,
        volumeUnits,
        hedSchemas.baseSchema.attributes,
      )
      assert.sameOrderedMembers(strippedDollarsString, [true, true, '25.99'])
      assert.sameOrderedMembers(strippedVolumeString, [true, true, '100'])
      assert.sameOrderedMembers(strippedPrefixedVolumeString, [true, true, '100'])
      assert.sameOrderedMembers(strippedInvalidVolumeString, [true, false, '200'])
    })
  })
})
