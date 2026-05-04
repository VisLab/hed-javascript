/** Browser-compatible replacements for file-reading utilities.
 * Local file reading is not supported in browsers; remote reading uses fetch().
 * @module utils/files.browser
 */
import { IssueError } from '../issues/issues'

/**
 * Read a local file (browser version — not supported).
 *
 * @param {string} fileName The file path.
 * @returns {Promise<string>} Never resolves; always throws.
 * @throws {IssueError} Always throws since local file reading is not supported in browsers.
 */
export async function readFile(fileName) {
  IssueError.generateAndThrow('fileReadError', {
    fileName: fileName,
    message: 'Local file reading is not supported in browser environment',
  })
}

/**
 * Read a remote file using HTTPS.
 *
 * @param {string} url The remote URL.
 * @returns {Promise<string>} A promise with the file contents.
 * @throws {IssueError} If the network read failed.
 */
export async function readHTTPSFile(url) {
  const response = await fetch(url)
  if (!response.ok) {
    IssueError.generateAndThrow('networkReadError', {
      url: url,
      statusCode: response.status,
      statusText: response.statusText,
    })
  }
  return response.text()
}
