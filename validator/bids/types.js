const { ParsedHedString, ParsedHedGroup } = require('../parser/main')
const { sidecarValueHasHed } = require('../../utils/bids')
const { Issue } = require('../../common/issues/issues')

class BidsData {
  constructor() {
    /**
     * A mapping from unparsed HED strings to ParsedHedString objects.
     * @type {Map<string, ParsedHedString>}
     */
    this.parsedStringMapping = new Map()
    /**
     * A Mapping from definition names to their associated ParsedHedGroup objects.
     * @type {Map<string, ParsedHedGroup>}
     */
    this.definitions = new Map()
    /**
     * A list of HED validation issues.
     * This will be converted to BidsIssue objects later on.
     * @type {Issue[]}
     */
    this.hedIssues = []
  }
}

class BidsFile extends BidsData {
  constructor(name, file) {
    super()
    /**
     * The file object representing this file data.
     * This is used to generate BidsIssue objects.
     * @type {object}
     */
    this.file = file
  }
}

class BidsJsonFile extends BidsFile {
  constructor(name, jsonData, file) {
    super(name, file)
    /**
     * This file's JSON data.
     * @type {object}
     */
    this.jsonData = jsonData
  }
}

class BidsTsvFile extends BidsFile {
  constructor(name, parsedTsv, file) {
    super(name, file)
    /**
     * This file's parsed TSV data.
     * @type {object}
     */
    this.parsedTsv = parsedTsv
    this.parseHedColumn()
  }

  parseHedColumn() {
    const hedColumnIndex = this.parsedTsv.headers.indexOf('HED')
    if (hedColumnIndex === -1) {
      this.hedColumnHedStrings = []
    } else {
      this.hedColumnHedStrings = this.parsedTsv.rows
        .slice(1)
        .map((rowCells) => rowCells[hedColumnIndex])
        .map((hedCell) => (hedCell && hedCell !== 'n/a' ? hedCell : ''))
    }
  }
}

class BidsEventFile extends BidsTsvFile {
  constructor(name, potentialSidecars, mergedDictionary, parsedTsv, file) {
    super(name, parsedTsv, file)
    /**
     * The potential JSON sidecar data.
     * @type {string[]}
     */
    this.potentialSidecars = potentialSidecars

    this.mergedSidecar = new BidsSidecar(name, mergedDictionary, null)
    this.sidecarHedData = this.mergedSidecar.hedData
  }
}

class BidsSidecar extends BidsJsonFile {
  constructor(name, sidecarData = {}, file) {
    super(name, sidecarData, file)

    this.filterHedStrings()
    this.categorizeHedStrings()
  }

  filterHedStrings() {
    const sidecarHedTags = Object.entries(this.jsonData)
      .map(([sidecarKey, sidecarValue]) => {
        if (sidecarValueHasHed(sidecarValue)) {
          return [sidecarKey, sidecarValue.HED]
        } else {
          return []
        }
      })
      .filter((x) => x.length > 0)
    this.hedData = new Map(sidecarHedTags)
  }

  categorizeHedStrings() {
    this.hedValueStrings = []
    this.hedCategoricalStrings = []
    for (const sidecarValue of this.hedData.values()) {
      if (typeof sidecarValue === 'string') {
        this.hedValueStrings.push(sidecarValue)
      } else {
        this.hedCategoricalStrings.push(...Object.values(sidecarValue))
      }
    }
  }

  get hedStrings() {
    return this.hedValueStrings.concat(this.hedCategoricalStrings)
  }

  get sidecarData() {
    return this.jsonData
  }
}

// TODO: Remove in v4.0.0.
const fallbackDatasetDescription = new BidsJsonFile('./dataset_description.json', null)

class BidsDataset extends BidsData {
  constructor(eventData, sidecarData, datasetDescription = fallbackDatasetDescription, datasetRootDirectory = null) {
    super()
    this.eventData = eventData
    this.sidecarData = sidecarData
    this.datasetDescription = datasetDescription
    this.datasetRootDirectory = datasetRootDirectory
  }
}

const bidsHedErrorCodes = new Set([104, 106, 107])

class BidsIssue {
  constructor(issueCode, file, evidence) {
    this.code = issueCode
    this.file = file
    this.evidence = evidence
  }

  isError() {
    return bidsHedErrorCodes.has(this.code)
  }
}

class BidsHedIssue extends BidsIssue {
  constructor(hedIssue, file) {
    super(hedIssue.level === 'warning' ? 105 : 104, file, hedIssue.message)
    /**
     * The HED Issue object corresponding to this object.
     * @type {Issue}
     */
    this.hedIssue = hedIssue
  }
}

module.exports = {
  BidsDataset,
  BidsEventFile,
  BidsHedIssue,
  BidsIssue,
  BidsJsonFile,
  BidsSidecar,
}
