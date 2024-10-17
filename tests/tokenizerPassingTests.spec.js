import chai from 'chai'
const assert = chai.assert
import { beforeAll, describe, afterAll } from '@jest/globals'

import * as hed from '../validator/event'
import { BidsHedIssue } from '../bids/types/issues'
import path from 'path'
import { HedStringTokenizer } from '../parser/tokenizer'
import { TagSpec, GroupSpec, ColumnSpliceSpec, HedStringTokenizerNew } from '../parser/tokenizerNew'
import { generateIssue, IssueError } from '../common/issues/issues'
import { passingTests } from './tokenizerPassingData'
const fs = require('fs')

const displayLog = process.env.DISPLAY_LOG === 'true'

const skippedErrors = {}

describe('HED tokenizer validation - validData', () => {
  const badLog = []
  let totalTests = 0
  let unexpectedErrors = 0

  beforeAll(async () => {})

  afterAll(() => {
    const outBad = path.join(__dirname, 'runLog.txt')
    const summary = `Total tests:${totalTests} Unexpected errors:${unexpectedErrors}\n`
    if (displayLog) {
      fs.writeFileSync(outBad, summary + badLog.join('\n'), 'utf8')
    }
  })

  describe.each(passingTests)('$name : $description', ({ tests }) => {
    let itemLog

    const assertErrors = function (header, issues, iLog) {
      iLog.push(`${header}\n`)
      totalTests += 1

      let errors = []
      if (issues.length > 0) {
        errors = issues.map((dict) => dict.hedCode) // list of hedCodes in the issues
      }
      const errorString = errors.join(',')
      if (errors.length > 0) {
        iLog.push(`---expected no errors but got errors [${errorString}]\n`)
        unexpectedErrors += 1
        assert(errors.length === 0, `${header}---expected no errors but got errors [${errorString}]`)
      }
    }

    const stringTokenizer = function (eName, tokenizer, tSpecs, gSpec, explanation, iLog) {
      const status = 'Expect pass'
      const tokType = tokenizer instanceof HedStringTokenizer ? 'Original-tokenizer' : 'New tokenizer'
      const header = `\n[${tokType}](${status})\tSTRING: "${tokenizer.hedString}"`
      const [tagSpecs, groupSpec, tokenizingIssues] = tokenizer.tokenize()
      // Test for no errors
      const issues = Object.values(tokenizingIssues).flat()
      assertErrors(header, issues, iLog)
      assert.sameDeepMembers(tagSpecs, tSpecs, explanation)
      assert.deepEqual(groupSpec, gSpec, explanation)
      //assert.sameDeepMembers(groupSpec, gSpec, explanation)
    }

    beforeAll(async () => {
      itemLog = []
    })

    afterAll(() => {
      badLog.push(itemLog.join('\n'))
    })

    if (tests && tests.length > 0) {
      test.each(tests)('NewTokenizer: Invalid string: %s ', (ex) => {
        //console.log(ex)
        stringTokenizer(
          ex.name,
          new HedStringTokenizerNew(ex.string),
          ex.tagSpecs,
          ex.groupSpec,
          ex.explanation,
          itemLog,
        )
      })

      test.each(tests)('Original tokenizer: Invalid string: %s ', (ex) => {
        stringTokenizer(ex.name, new HedStringTokenizer(ex.string), ex.tagSpecs, ex.groupSpec, ex.explanation, itemLog)
      })
    }
  })
})
