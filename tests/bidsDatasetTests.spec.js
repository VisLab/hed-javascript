import chai from 'chai'
const assert = chai.assert
const difference = require('lodash/difference')
import { beforeAll, describe, afterAll } from '@jest/globals'
import path from 'path'

import { buildSchemas } from '../validator/schema/init'
import { SchemaSpec, SchemasSpec } from '../common/schema/types'
import { TsvValidator, BidsSidecar, BidsTsvFile } from '../bids'
import parseTSV from '../bids/tsvParser'

import { bidsTestData } from './testData/bidsTests.data'
import { shouldRun, extractHedCodes } from './testUtilities'

const fs = require('fs')

//const displayLog = process.env.DISPLAY_LOG === 'true'
const displayLog = true

// Ability to select individual tests to run
const runAll = true
let onlyRun = new Map()
if (!runAll) {
  onlyRun = new Map([['invalid-tag-tests', ['invalid-bad-tag-in-JSON']]])
}

describe('BIDS validation', () => {
  const schemaMap = new Map([
    ['8.2.0', undefined],
    ['8.3.0', undefined],
  ])

  const badLog = []
  let totalTests
  let wrongErrors
  let missingErrors

  beforeAll(async () => {
    const spec2 = new SchemaSpec('', '8.2.0', '', path.join(__dirname, '../tests/data/HED8.2.0.xml'))
    const specs2 = new SchemasSpec().addSchemaSpec(spec2)
    const schemas2 = await buildSchemas(specs2)
    const spec3 = new SchemaSpec('', '8.3.0', '', path.join(__dirname, '../tests/data/HED8.3.0.xml'))
    const specs3 = new SchemasSpec().addSchemaSpec(spec3)
    const schemas3 = await buildSchemas(specs3)
    schemaMap.set('8.2.0', schemas2)
    schemaMap.set('8.3.0', schemas3)
    totalTests = 0
    wrongErrors = 0
    missingErrors = 0
  })

  afterAll(() => {
    const outBad = path.join(__dirname, 'runLog.txt')
    const summary = `Total tests:${totalTests} Wrong errors:${wrongErrors} MissingErrors:${missingErrors}\n`
    if (displayLog) {
      fs.writeFileSync(outBad, summary + badLog.join('\n'), 'utf8')
    }
  })

  describe.each(bidsTestData)('$name : $description', ({ name, tests }) => {
    let itemLog

    const assertErrors = function (test, type, expectedErrors, issues, iLog) {
      const status = expectedErrors.length > 0 ? 'Expect fail' : 'Expect pass'
      const header = `[${name}:${test.testname}][${type}](${status})`
      const log = []
      totalTests += 1

      const errors = extractHedCodes(issues)
      const errorString = errors.join(',')
      if (errors.length > 0) {
        log.push(`---has errors [${errorString}]`)
      }
      if (expectedErrors.length === 0 && errorString.length > 0) {
        const hasErrors = `---expected no errors but got errors [${errorString}]`
        log.push(hasErrors)
        log.push(`Received issues: ${JSON.stringify(issues)}`)
        iLog.push(header + '\n' + log.join('\n'))
        wrongErrors += 1
        assert.isEmpty(errorString, `${header}${hasErrors}]`)
      } else {
        const expectedErrorCodes = extractHedCodes(expectedErrors)
        const wrong = difference(errors, expectedErrorCodes)
        const missing = difference(expectedErrorCodes, errors)
        let errorMessage = ''
        if (wrong.length > 0) {
          errorMessage = `---received unexpected errors ${wrong.join(',')}\n`
          wrongErrors += 1
        }
        if (missing.length > 0) {
          errorMessage = errorMessage + `---did not receive expected errors ${missing.join(',')}`
          missingErrors += 1
        }

        if (errorMessage.length > 0) {
          log.push(errorMessage)
          log.push(`Expected issues:\n${JSON.stringify(expectedErrors)}`)
          log.push(`Received issues:\n${JSON.stringify(issues)}`)
          iLog.push(header + '\n' + log.join('\n'))
        } else {
          iLog.push(header)
        }
        assert.sameDeepMembers(issues, expectedErrors, header)
      }
    }

    const validate = function (test, iLog) {
      // Make sure that the schema is available
      const header = `[${test.testname} (Expect pass)]`
      iLog.push(header)
      const thisSchema = schemaMap.get(test.schemaVersion)
      assert.isDefined(thisSchema, `${test.schemaVersion} is not available in test ${test.name}`)

      //Validate the sidecar by itself
      const sidecarName = test.testname + '.json'
      const bidsSidecar = new BidsSidecar('thisOne', test.sidecar, { relativePath: sidecarName, path: sidecarName })
      assert.instanceOf(bidsSidecar, BidsSidecar, 'Test')
      const sidecarIssues = bidsSidecar.validate(thisSchema)
      assertErrors(test, 'Sidecar only', test.sidecarOnlyErrors, sidecarIssues, iLog)

      // Parse the events file
      const eventName = test.testname + '.tsv'
      const parsedTsv = parseTSV(test.eventsString)
      assert.instanceOf(parsedTsv, Map, `${eventName} cannot be parsed`)

      // Validate the events file with the sidecar
      const bidsTsvSide = new BidsTsvFile(
        test.testname,
        parsedTsv,
        { relativePath: eventName, path: eventName },
        [],
        test.sidecar,
      )
      const validatorWithSide = new TsvValidator(bidsTsvSide, thisSchema)
      validatorWithSide.validate()
      assertErrors(test, 'Events+side', test.comboErrors, validatorWithSide.issues, iLog)
    }

    beforeAll(async () => {
      itemLog = []
    })

    afterAll(() => {
      badLog.push(itemLog.join('\n'))
    })

    if (tests && tests.length > 0) {
      test.each(tests)('$testname: $explanation ', (test) => {
        if (shouldRun(name, test.testname, onlyRun)) {
          validate(test, itemLog)
        } else {
          itemLog.push(`----Skipping ${name}: ${test.testname}`)
        }
      })
    }
  })
})
