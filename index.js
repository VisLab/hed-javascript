/**
 * @module
 * @description This module is the entry point for the HED JavaScript library.
 */
export {
  BidsDataset,
  BidsTsvFile,
  BidsJsonFile,
  BidsSidecar,
  BidsHedIssue,
  buildBidsSchemas,
  BidsFileAccessor,
  BidsDirectoryAccessor,
} from './src/bids'

export { IssueError } from './src/issues/issues'
