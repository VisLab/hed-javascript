import { validateHedDatasetWithContext } from '../validator/dataset'
import { validateHedString } from '../validator/event'
import { BidsDataset, BidsEventFile, BidsHedIssue, BidsIssue } from './types'
import { buildBidsSchemas } from './schema'
import { generateIssue, Issue, IssueError } from '../common/issues/issues'
import ParsedHedString from '../validator/parser/parsedHedString'

/**
 * Validate a BIDS dataset.
 *
 * @param {BidsDataset} dataset The BIDS dataset.
 * @param {object} schemaDefinition The version spec for the schema to be loaded.
 * @returns {Promise<BidsIssue[]>} Any issues found.
 */
export function validateBidsDataset(dataset, schemaDefinition) {
  return buildBidsSchemas(dataset, schemaDefinition).then(
    ([hedSchemas, schemaLoadIssues]) => {
      return new BidsHedValidator(dataset, hedSchemas)
        .validateFullDataset()
        .catch(BidsIssue.generateInternalErrorPromise)
        .then((issues) =>
          issues.concat(convertHedIssuesToBidsIssues(schemaLoadIssues, dataset.datasetDescription.file)),
        )
    },
    (issues) => convertHedIssuesToBidsIssues(issues, dataset.datasetDescription.file),
  )
}

/**
 * A validator for HED content in a BIDS dataset.
 */
class BidsHedValidator {
  /**
   * The BIDS dataset being validated.
   * @type {BidsDataset}
   */
  dataset
  /**
   * The HED schema collection being validated against.
   * @type {Schemas}
   */
  hedSchemas
  /**
   * The issues found during validation.
   * @type {BidsHedIssue[]}
   */
  issues

  /**
   * Constructor.
   *
   * @param {BidsDataset} dataset The BIDS dataset being validated.
   * @param {Schemas} hedSchemas The HED schema collection being validated against.
   */
  constructor(dataset, hedSchemas) {
    this.dataset = dataset
    this.hedSchemas = hedSchemas
    this.issues = []
  }

  /**
   * Validate a full BIDS dataset using a HED schema collection.
   *
   * @returns {Promise<BidsIssue[]>|Promise<never>} Any issues found.
   */
  validateFullDataset() {
    try {
      const sidecarErrorsFound = this.validateSidecars()
      const hedColumnErrorsFound = this.validateHedColumn()
      if (sidecarErrorsFound || hedColumnErrorsFound) {
        return Promise.resolve(this.issues)
      }
      for (const eventFileData of this.dataset.eventData) {
        this.validateBidsTsvFile(eventFileData)
      }
      return Promise.resolve(this.issues)
    } catch (e) {
      return Promise.reject(e)
    }
  }

  /**
   * Validate a collection of BIDS sidecars.
   *
   * @returns {boolean} Whether errors (as opposed to warnings) were founds.
   */
  validateSidecars() {
    const issues = []
    // validate the HED strings in the json sidecars
    for (const sidecar of this.dataset.sidecarData) {
      issues.push(...convertHedIssuesToBidsIssues(sidecar.parseHedStrings(this.hedSchemas), sidecar.file))
      const sidecarIssues = this.validateSidecar(sidecar)
      issues.push(...sidecarIssues)
    }
    this.issues.push(...issues)
    return issues.some((issue) => issue.isError())
  }

  /**
   * Validate an individual BIDS sidecar.
   *
   * @param {BidsSidecar} sidecar A BIDS sidecar.
   * @returns {BidsHedIssue[]} All issues found.
   */
  validateSidecar(sidecar) {
    const issues = []
    for (const [sidecarKey, hedData] of sidecar.parsedHedData) {
      if (hedData instanceof ParsedHedString) {
        const options = {
          checkForWarnings: true,
          expectValuePlaceholderString: true,
          definitionsAllowed: 'no',
        }
        issues.push(...this._validateSidecarString(sidecarKey, hedData, sidecar, options))
      } else if (hedData instanceof Map) {
        for (const valueString of hedData.values()) {
          const options = {
            checkForWarnings: true,
            expectValuePlaceholderString: false,
            definitionsAllowed: 'exclusive',
          }
          issues.push(...this._validateSidecarString(sidecarKey, valueString, sidecar, options))
        }
      } else {
        throw new Error('Unexpected type found in sidecar parsedHedData map.')
      }
    }
    return issues
  }

  /**
   * Validate an individual BIDS sidecar string.
   *
   * @param {string} sidecarKey The sidecar key this string belongs to.
   * @param {ParsedHedString} sidecarString The parsed sidecar HED string.
   * @param {BidsSidecar} sidecar The BIDS sidecar.
   * @param {Object} options Options specific to this validation run to pass to {@link validateHedString}.
   * @returns {BidsHedIssue[]} All issues found.
   * @private
   */
  _validateSidecarString(sidecarKey, sidecarString, sidecar, options) {
    const [, hedIssues] = validateHedString(sidecarString, this.hedSchemas, options)
    return convertHedIssuesToBidsIssues(hedIssues, sidecar.file, { sidecarKey })
  }

  /**
   * Validate the HED columns of a collection of BIDS event TSV files.
   *
   * @returns {boolean} Whether errors (as opposed to warnings) were founds.
   */
  validateHedColumn() {
    const issues = this.dataset.eventData.flatMap((eventFileData) => {
      return this._validateStrings(eventFileData.hedColumnHedStrings, eventFileData.file, {
        expectValuePlaceholderString: false,
        definitionsAllowed: 'no',
      })
    })
    this.issues.push(...issues)
    return issues.some((issue) => issue.isError())
  }

  /**
   * Validate a BIDS TSV file.
   *
   * @param {BidsTsvFile} tsvFileData A BIDS TSV file.
   */
  validateBidsTsvFile(tsvFileData) {
    const hedStrings = this.parseTsvHed(tsvFileData)
    if (hedStrings.length > 0) {
      this.validateCombinedDataset(hedStrings, tsvFileData)
    }
  }

  /**
   * Combine the BIDS sidecar HED data into a BIDS TSV file's HED data.
   *
   * @param {BidsTsvFile} tsvFileData A BIDS TSV file.
   * @returns {string[]} The combined HED string collection for this BIDS TSV file.
   */
  parseTsvHed(tsvFileData) {
    const hedStrings = []
    const sidecarHedColumnIndices = {}
    for (const sidecarHedColumn of tsvFileData.sidecarHedData.keys()) {
      const sidecarHedColumnHeader = tsvFileData.parsedTsv.headers.indexOf(sidecarHedColumn)
      if (sidecarHedColumnHeader > -1) {
        sidecarHedColumnIndices[sidecarHedColumn] = sidecarHedColumnHeader
      }
    }
    if (tsvFileData.hedColumnHedStrings.length + sidecarHedColumnIndices.length === 0) {
      return []
    }

    tsvFileData.parsedTsv.rows.slice(1).forEach((rowCells, rowIndex) => {
      // get the 'HED' field
      const hedStringParts = []
      if (tsvFileData.hedColumnHedStrings[rowIndex]) {
        hedStringParts.push(tsvFileData.hedColumnHedStrings[rowIndex])
      }
      for (const [sidecarHedColumn, sidecarHedIndex] of Object.entries(sidecarHedColumnIndices)) {
        const sidecarHedData = tsvFileData.sidecarHedData.get(sidecarHedColumn)
        const rowCell = rowCells[sidecarHedIndex]
        if (rowCell && rowCell !== 'n/a') {
          let sidecarHedString
          if (!sidecarHedData) {
            continue
          }
          if (typeof sidecarHedData === 'string') {
            sidecarHedString = sidecarHedData.replace('#', rowCell)
          } else {
            sidecarHedString = sidecarHedData[rowCell]
          }
          if (sidecarHedString !== undefined) {
            hedStringParts.push(sidecarHedString)
          } else {
            this.issues.push(
              new BidsHedIssue(
                generateIssue('sidecarKeyMissing', {
                  key: rowCell,
                  column: sidecarHedColumn,
                  file: tsvFileData.file.relativePath,
                }),
                tsvFileData.file,
              ),
            )
          }
        }
      }

      if (hedStringParts.length > 0) {
        hedStrings.push(hedStringParts.join(','))
      }
    })

    return hedStrings
  }

  /**
   * Validate the HED data in a combined event TSV file/sidecar BIDS data collection.
   *
   * @param {string[]} hedStrings The HED strings in the data collection.
   * @param {BidsTsvFile} tsvFileData The BIDS event TSV file being validated.
   */
  validateCombinedDataset(hedStrings, tsvFileData) {
    const [, hedIssues] = validateHedDatasetWithContext(
      hedStrings,
      tsvFileData.mergedSidecar.hedStrings,
      this.hedSchemas,
      {
        checkForWarnings: true,
        validateDatasetLevel: tsvFileData instanceof BidsEventFile,
      },
    )
    this.issues.push(...convertHedIssuesToBidsIssues(hedIssues, tsvFileData.file))
  }

  /**
   * Validate a set of HED strings.
   *
   * @param {string[]} hedStrings The HED strings to validate.
   * @param {Object} fileObject A BIDS-format file object used to generate {@link BidsHedIssue} objects.
   * @param {Object} settings Options to pass to {@link validateHedString}.
   * @returns {BidsHedIssue[]} Any issues found.
   * @private
   */
  _validateStrings(hedStrings, fileObject, settings) {
    const issues = []
    for (const hedString of hedStrings) {
      if (!hedString) {
        continue
      }
      const options = {
        checkForWarnings: true,
        ...settings,
      }
      const [, hedIssues] = validateHedString(hedString, this.hedSchemas, options)
      const convertedIssues = convertHedIssuesToBidsIssues(hedIssues, fileObject)
      issues.push(...convertedIssues)
    }
    return issues
  }
}

/**
 * Convert one or more HED issues into BIDS-compatible issues.
 *
 * @param {IssueError|Issue[]} hedIssues One or more HED-format issues.
 * @param {Object} file A BIDS-format file object used to generate {@link BidsHedIssue} objects.
 * @param {Object?} extraParameters Any extra parameters to inject into the {@link Issue} objects.
 * @returns {BidsHedIssue[]} The passed issue(s) in BIDS-compatible format.
 */
function convertHedIssuesToBidsIssues(hedIssues, file, extraParameters) {
  if (hedIssues instanceof IssueError) {
    return [convertHedIssueToBidsIssue(hedIssues.issue, file, extraParameters)]
  } else {
    return hedIssues.map((hedIssue) => convertHedIssueToBidsIssue(hedIssue, file, extraParameters))
  }
}

/**
 * Convert a single HED issue into a BIDS-compatible issue.
 *
 * @param {Issue} hedIssue One HED-format issue.
 * @param {Object} file A BIDS-format file object used to generate a {@link BidsHedIssue} object.
 * @param {Object?} extraParameters Any extra parameters to inject into the {@link Issue} object.
 * @returns {BidsHedIssue} The passed issue in BIDS-compatible format.
 */
function convertHedIssueToBidsIssue(hedIssue, file, extraParameters) {
  if (extraParameters) {
    Object.assign(hedIssue.parameters, extraParameters)
    hedIssue.generateMessage()
  }
  return new BidsHedIssue(hedIssue, file)
}
