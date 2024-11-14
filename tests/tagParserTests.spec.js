import chai from 'chai'
const assert = chai.assert
import { beforeAll, describe, afterAll, it } from '@jest/globals'

import ParsedHedTag from '../parser/parsedHedTag'
import { shouldRun } from './testUtilities'
import { parsedHedTagTests } from './testData/tagParserTests.data'
import { SchemaSpec, SchemasSpec } from '../schema/specs'
import path from 'path'
import { buildSchemas } from '../schema/init'
import { SchemaTag, SchemaValueTag } from '../schema/entries'
import { TagSpec } from '../parser/tokenizer'
import TagConverter from '../parser/tagConverter'
import { BidsTsvFile } from '../bids'

// Ability to select individual tests to run
const skipMap = new Map()
const runAll = true
const runMap = new Map([['valid-tags', ['valid-numeric-scientific-value']]])

describe('TagSpec converter tests using JSON tests', () => {
  const schemaMap = new Map([
    ['8.2.0', undefined],
    ['8.3.0', undefined],
  ])

  beforeAll(async () => {
    const spec2 = new SchemaSpec('', '8.2.0', '', path.join(__dirname, '../tests/data/HED8.2.0.xml'))
    const specs2 = new SchemasSpec().addSchemaSpec(spec2)
    const schemas2 = await buildSchemas(specs2)
    const spec3 = new SchemaSpec('', '8.3.0', '', path.join(__dirname, '../tests/data/HED8.3.0.xml'))
    const specs3 = new SchemasSpec().addSchemaSpec(spec3)
    const schemas3 = await buildSchemas(specs3)
    schemaMap.set('8.2.0', schemas2)
    schemaMap.set('8.3.0', schemas3)
  })

  afterAll(() => {})

  describe('BIDS experiments', () => {
    it('should be able to convert', () => {
      const thisSchema = schemaMap.get('8.3.0')
      assert.isDefined(thisSchema, 'yes')
      const hTsv = `HED\nRed\n`
      let stringIssues = []
      try {
        const bidsTsv = new BidsTsvFile(`events`, hTsv, { relativePath: 'string test tsv' }, [], {})
        stringIssues = bidsTsv.validate(thisSchema)
        console.log(stringIssues)
      } catch (e) {
        console.log(stringIssues)
      }
    })
  })

  // TODO: Remove after refactoring of validation complete
  describe.skip('TagConverter experiments', () => {
    it('should be able to convert', () => {
      const thisSchema = schemaMap.get('8.3.0')
      assert.isDefined(thisSchema, 'yes')

      // const spec = new TagSpec('Length/5 m', 0, 10, '')
      // const pTag = new ParsedHedTag(spec, thisSchema, 'Length/5 m')

      const spec = new TagSpec('Def/Apple/5', 0, 11, '')
      const pTag = new ParsedHedTag(spec, thisSchema, 'Def/Apple/5')
      assert.instanceOf(pTag, ParsedHedTag)
      const valueAttributeNames = pTag._schemaTag.valueAttributeNames
      const valueClassNames = valueAttributeNames.get('valueClass', [])
      console.log(pTag)
      assert.instanceOf(pTag, ParsedHedTag)
      console.log(valueAttributeNames)
      console.log(valueClassNames)
      const valueClasses = pTag.schema.entries.valueClasses
      console.log(valueClasses)
      const vClass = valueClasses.hasEntry('numericClass')
      console.log(vClass)
      const tClass = valueClasses.getEntry('numericClass')
      console.log(tClass)
      const okay = tClass.validateValue('3')
      console.log(okay)
      const notOkay = tClass.validateValue('ab')
      console.log(notOkay)
      // const spec = new TagSpec('Length/5 m', 0, 10, '')
      // const myCon = new TagConverter(spec, thisSchema)
      // const [tag, remainder] = myCon.convert();
      // assert.instanceOf(tag, SchemaTag, 'A schema tag comes back')
      // //assert.instanceOf(remainder, String, 'A string comes back')
      // const unitClasses = tag.unitClasses
      // let actualUnit = null
      // let actualValue = null
      // for (let i = 0; i < unitClasses.length; i++) {
      //   [actualUnit, actualValue] = unitClasses[i].extractUnits(remainder)
      //   if (actualUnit !== null || actualValue !== null) {
      //     break
      //   }
      // }
      // console.log(`actualUnit = ${actualUnit?.name} actualValue = ${actualValue}`)
    })
  })

  describe.each(parsedHedTagTests)('$name : $description', ({ name, tests }) => {
    const hedTagTest = function (test) {
      const status = test.error !== null ? 'Expect fail' : 'Expect pass'
      const header = `\n[${test.testname}](${status}): ${test.explanation}`

      const thisSchema = schemaMap.get(test.schemaVersion)
      assert.isDefined(thisSchema, `${header}: ${test.schemaVersion} is not available in test ${test.name}`)

      let issue = null
      let tag = null
      try {
        tag = new ParsedHedTag(test.tagSpec, thisSchema, test.fullString)
      } catch (error) {
        issue = error.issue
      }
      assert.deepEqual(issue, test.error, `${header}: wrong issue`)
      assert.strictEqual(tag?.format(false), test.tagShort, `${header}: wrong short version`)
      assert.strictEqual(tag?.format(true), test.tagLong, `${header}: wrong long version`)
      assert.strictEqual(tag?.formattedTag, test.formattedTag, `${header}: wrong formatted version`)
      assert.strictEqual(tag?.canonicalTag, test.canonicalTag, `${header}: wrong canonical version`)
      if (test.error) {
        return
      }
      if (test.takesValue) {
        assert.instanceOf(tag._schemaTag, SchemaValueTag, `${header}: tag should be a takes value tag`)
      } else {
        assert.notInstanceOf(tag._schemaTag, SchemaValueTag, `${header}: tag should be a takes value tag`)
      }
    }

    beforeAll(async () => {})

    afterAll(() => {})

    if (tests && tests.length > 0) {
      test.each(tests)('$testname: $explanation', (test) => {
        if (shouldRun(name, test.testname, runAll, runMap, skipMap)) {
          hedTagTest(test)
        } else {
          console.log(`----Skipping tagParserTest ${name}: ${test.testname}`)
        }
      })
    }
  })
})
