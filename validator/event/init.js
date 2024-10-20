import { parseHedString } from '../../parser/parser'
import ParsedHedString from '../../parser/parsedHedString'
import { Schemas } from '../../common/schema/types'

import { HedValidator } from './validator'
import { Hed2Validator } from '../hed2/event/hed2Validator'
import { Hed3Validator } from './hed3'
import { Issue } from '../../common/issues/issues'

/**
 * Perform initial validation on a HED string and parse it so further validation can be performed.
 *
 * @param {string|ParsedHedString} hedString The HED string to validate.
 * @param {Schemas} hedSchemas The HED schemas to validate against.
 * @param {Object<string, boolean>} options Any validation options passed in.
 * @param {Map<string, ParsedHedGroup>?} definitions The definitions for this HED dataset.
 * @returns {[ParsedHedString, Issue[], HedValidator]} The parsed HED string, the actual HED schema collection to use, any issues found, and whether to perform semantic validation.
 */
const initiallyValidateHedString = function (hedString, hedSchemas, options, definitions = null) {
  const doSemanticValidation = hedSchemas instanceof Schemas
  if (!doSemanticValidation) {
    hedSchemas = new Schemas(null)
  }
  let parsedString, parsingIssues
  // Skip parsing if we're passed an already-parsed string.
  if (hedString instanceof ParsedHedString) {
    parsedString = hedString
    parsingIssues = { syntax: [], delimiter: [] }
  } else {
    ;[parsedString, parsingIssues] = parseHedString(hedString, hedSchemas)
  }
  if (parsedString === null) {
    return [null, [].concat(...Object.values(parsingIssues)), null]
  } else if (parsingIssues.syntax.length + parsingIssues.delimiter.length > 0) {
    hedSchemas = new Schemas(null)
  }
  let hedValidator
  switch (hedSchemas.generation) {
    case 0:
      hedValidator = new HedValidator(parsedString, hedSchemas, options)
      break
    case 2:
      hedValidator = new Hed2Validator(parsedString, hedSchemas, options)
      break
    case 3:
      hedValidator = new Hed3Validator(parsedString, hedSchemas, definitions, options)
  }
  const allParsingIssues = [].concat(...Object.values(parsingIssues))
  return [parsedString, allParsingIssues, hedValidator]
}

/**
 * Validate a HED string.
 *
 * @param {string|ParsedHedString} hedString The HED string to validate.
 * @param {Schemas} hedSchemas The HED schemas to validate against.
 * @param {boolean?} checkForWarnings Whether to check for warnings or only errors.
 * @param {boolean?} expectValuePlaceholderString Whether this string is expected to have a '#' placeholder representing a value.
 * @returns {[boolean, Issue[]]} Whether the HED string is valid and any issues found.
 * @deprecated
 */
export const validateHedString = function (hedString, hedSchemas, ...args) {
  let settings
  const settingsArg = args[0]
  if (settingsArg === Object(settingsArg)) {
    settings = {
      checkForWarnings: settingsArg.checkForWarnings ?? false,
      expectValuePlaceholderString: settingsArg.expectValuePlaceholderString ?? false,
      definitionsAllowed: settingsArg.definitionsAllowed ?? 'yes',
    }
  } else {
    settings = {
      checkForWarnings: args[0] ?? false,
      expectValuePlaceholderString: args[1] ?? false,
      definitionsAllowed: 'yes',
    }
  }
  const [parsedString, parsedStringIssues, hedValidator] = initiallyValidateHedString(hedString, hedSchemas, settings)
  if (parsedString === null) {
    return [false, parsedStringIssues]
  }

  hedValidator.validateStringLevel()
  const issues = [].concat(parsedStringIssues, hedValidator.issues)

  return Issue.issueListWithValidStatus(issues)
}

/**
 * Validate a HED event string.
 *
 * @param {string|ParsedHedString} hedString The HED event string to validate.
 * @param {Schemas} hedSchemas The HED schemas to validate against.
 * @param {boolean} checkForWarnings Whether to check for warnings or only errors.
 * @returns {[boolean, Issue[]]} Whether the HED string is valid and any issues found.
 * @deprecated
 */
export const validateHedEvent = function (hedString, hedSchemas, ...args) {
  let settings
  if (args[0] === Object(args[0])) {
    settings = {
      checkForWarnings: args[0].checkForWarnings ?? false,
    }
  } else {
    settings = {
      checkForWarnings: args[0] ?? false,
    }
  }
  const [parsedString, parsedStringIssues, hedValidator] = initiallyValidateHedString(hedString, hedSchemas, settings)
  if (parsedString === null) {
    return [false, parsedStringIssues]
  }

  hedValidator.validateEventLevel()
  const issues = [].concat(parsedStringIssues, hedValidator.issues)

  return Issue.issueListWithValidStatus(issues)
}

/**
 * Validate a HED event string.
 *
 * @param {string|ParsedHedString} hedString The HED event string to validate.
 * @param {Schemas} hedSchemas The HED schemas to validate against.
 * @param {Map<string, ParsedHedGroup>} definitions The dataset's parsed definitions.
 * @param {boolean} checkForWarnings Whether to check for warnings or only errors.
 * @returns {[boolean, Issue[]]} Whether the HED string is valid and any issues found.
 */
export const validateHedEventWithDefinitions = function (hedString, hedSchemas, definitions, ...args) {
  let settings
  if (args[0] === Object(args[0])) {
    settings = {
      checkForWarnings: args[0].checkForWarnings ?? false,
    }
  } else {
    settings = {
      checkForWarnings: args[0] ?? false,
    }
  }
  const [parsedString, parsedStringIssues, hedValidator] = initiallyValidateHedString(
    hedString,
    hedSchemas,
    settings,
    definitions,
  )
  if (parsedString === null) {
    return [false, parsedStringIssues]
  }

  hedValidator.validateEventLevel()
  const issues = [].concat(parsedStringIssues, hedValidator.issues)

  return Issue.issueListWithValidStatus(issues)
}
