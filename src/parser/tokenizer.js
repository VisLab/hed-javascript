import { unicodeName } from 'unicode-name'

import { generateIssue } from '../issues/issues'

const CHARACTERS = {
  BLANK: ' ',
  OPENING_GROUP: '(',
  CLOSING_GROUP: ')',
  OPENING_COLUMN: '{',
  CLOSING_COLUMN: '}',
  COMMA: ',',
  COLON: ':',
  SLASH: '/',
  PLACEHOLDER: '#',
}

function getTrimmedBounds(originalString) {
  const start = originalString.search(/\S/)

  if (start === -1) {
    // The string contains only whitespace
    return null
  }
  const end = originalString.search(/\S\s*$/)
  return [start, end + 1]
}

const invalidCharacters = new Set(['[', ']', '~', '"'])
// Add control codes to invalidCharacters
for (let i = 0x00; i <= 0x1f; i++) {
  invalidCharacters.add(String.fromCodePoint(i))
}
for (let i = 0x7f; i <= 0x9f; i++) {
  invalidCharacters.add(String.fromCodePoint(i))
}

/**
 * A specification for a tokenized substring.
 */
export class SubstringSpec {
  /**
   * The starting and ending bounds of the substring.
   * @type {number[]}
   */
  bounds

  constructor(start, end) {
    this.bounds = [start, end]
  }
}

/**
 * A specification for a tokenized tag.
 */
export class TagSpec extends SubstringSpec {
  /**
   * The tag this spec represents.
   * @type {string}
   */
  tag

  /**
   * The schema prefix for this tag, if any.
   * @type {string}
   */
  library

  constructor(tag, start, end, librarySchema) {
    super(start, end)

    this.tag = tag.trim()
    this.library = librarySchema
  }
}

/**
 * A specification for a tokenized tag group.
 */
export class GroupSpec extends SubstringSpec {
  /**
   * The child group specifications.
   * @type {GroupSpec[]}
   */
  children

  constructor(start, end, children) {
    super(start, end)

    this.children = children
  }
}

/**
 * A specification for a tokenized column splice template.
 */
export class ColumnSpliceSpec extends SubstringSpec {
  /**
   * The column name this spec refers to.
   * @type {string}
   */
  columnName

  constructor(name, start, end) {
    super(start, end)

    this.columnName = name.trim()
  }
}

/**
 * A class representing the current state of the HED string tokenizer.
 *
 * @internal
 */
export class TokenizerState {
  constructor() {
    this.currentToken = '' // Characters in the token currently being parsed
    this.groupDepth = 0
    this.startingIndex = 0 // Starting index of this token
    this.lastDelimiter = [undefined, -1] // Type and position of the last delimiter
    this.librarySchema = ''
    this.lastSlash = -1 // Position of the last slash in current token
    this.currentGroupStack = [[]]
    this.parenthesesStack = []
  }
}

/**
 * Class for tokenizing HED strings.
 */
export class HedStringTokenizer {
  /**
   * The HED string being tokenized.
   * @type {string}
   */
  hedString
  /**
   * The issues found during tokenization.
   * @type {Issue[]}
   */
  issues
  /**
   * The current state of the tokenizer.
   * @type {TokenizerState}
   * @internal
   */
  state

  /**
   * Constructor.
   * @param {string} hedString The HED string to tokenize.
   */
  constructor(hedString) {
    this.hedString = hedString
    this.issues = []
    this.state = null
  }

  /**
   * Split the HED string into delimiters and tags.
   *
   * @returns {Array} - [TagSpec[], GroupSpec, Issue[]] representing the tag specifications, group bounds, and any issues found.
   */
  tokenize() {
    this.initializeTokenizer()
    // Empty strings cannot be tokenized
    if (this.hedString.trim().length === 0) {
      this.pushIssue('emptyTagFound', 0)
      return [[], null, this.issues]
    }
    for (let i = 0; i < this.hedString.length; i++) {
      const character = this.hedString.charAt(i)
      this.handleCharacter(i, character)
      if (this.issues.length > 0) {
        return [[], null, this.issues]
      }
    }
    this.finalizeTokenizer()
    if (this.issues.length > 0) {
      return [[], null, this.issues]
    } else {
      return [this.state.currentGroupStack.pop(), this.state.parenthesesStack.pop(), []]
    }
  }

  /**
   * Reset the current token.
   * @param {number} i The current index in the HED string.
   * @internal
   */
  resetToken(i) {
    this.state.startingIndex = i + 1
    this.state.currentToken = ''
    this.state.librarySchema = ''
    this.state.lastSlash = '-1'
  }

  /**
   * Finalize the tokenization process.
   * @internal
   */
  finalizeTokenizer() {
    if (this.state.lastDelimiter[0] === CHARACTERS.OPENING_COLUMN) {
      // Extra opening brace
      this.pushIssue('unclosedCurlyBrace', this.state.lastDelimiter[1])
    } else if (this.state.lastDelimiter[0] === CHARACTERS.OPENING_GROUP) {
      // Extra opening parenthesis
      this.pushIssue('unclosedParentheses', this.state.lastDelimiter[1])
    } else if (
      this.state.lastDelimiter[0] === CHARACTERS.COMMA &&
      this.hedString.slice(this.state.lastDelimiter[1] + 1).trim().length === 0
    ) {
      this.pushIssue('emptyTagFound', this.state.lastDelimiter[1]) // Extra comma
    } else if (this.state.lastSlash >= 0 && this.hedString.slice(this.state.lastSlash + 1).trim().length === 0) {
      this.pushIssue('extraSlash', this.state.lastSlash) // Extra slash
    }
    if (
      this.state.currentToken.trim().length > 0 &&
      ![undefined, CHARACTERS.COMMA].includes(this.state.lastDelimiter[0])
    ) {
      // Missing comma
      this.pushIssue('commaMissing', this.state.lastDelimiter[1] + 1)
    } else {
      if (this.state.currentToken.trim().length > 0) {
        this.pushTag(this.hedString.length)
      }
      this.unwindGroupStack()
    }
  }

  /**
   * Initialize the tokenizer.
   * @internal
   */
  initializeTokenizer() {
    this.issues = []
    this.state = new TokenizerState()
    this.state.parenthesesStack = [new GroupSpec(0, this.hedString.length, [])]
  }

  /**
   * Handle a single character during tokenization.
   * @param {number} i The index of the character.
   * @param {string} character The character to handle.
   * @internal
   */
  handleCharacter(i, character) {
    const characterHandler = {
      [CHARACTERS.OPENING_GROUP]: () => this.handleOpeningGroup(i),
      [CHARACTERS.CLOSING_GROUP]: () => this.handleClosingGroup(i),
      [CHARACTERS.OPENING_COLUMN]: () => this.handleOpeningColumn(i),
      [CHARACTERS.CLOSING_COLUMN]: () => this.handleClosingColumn(i),
      [CHARACTERS.COMMA]: () => this.handleComma(i),
      [CHARACTERS.COLON]: () => this.handleColon(i),
      [CHARACTERS.SLASH]: () => this.handleSlash(i),
    }[character] // Selects the character handler based on the value of character

    if (characterHandler) {
      characterHandler()
    } else if (invalidCharacters.has(character)) {
      this.pushInvalidCharacterIssue(character, i)
    } else {
      this.state.currentToken += character
    }
  }

  /**
   * Handle a comma character.
   * @param {number} i The index of the comma.
   * @internal
   */
  handleComma(i) {
    const trimmed = this.hedString.slice(this.state.lastDelimiter[1] + 1, i).trim()
    if (
      [CHARACTERS.OPENING_GROUP, CHARACTERS.COMMA, undefined].includes(this.state.lastDelimiter[0]) &&
      trimmed.length === 0
    ) {
      this.pushIssue('emptyTagFound', i) // Empty tag Ex: ",x" or "(, x" or "y, ,x"
    } else if (this.state.lastDelimiter[0] === CHARACTERS.OPENING_COLUMN) {
      this.pushIssue('unclosedCurlyBrace', this.state.lastDelimiter[1]) // Unclosed curly brace Ex: "{ x,"
    }
    if (
      [CHARACTERS.CLOSING_GROUP, CHARACTERS.CLOSING_COLUMN].includes(this.state.lastDelimiter[0]) &&
      trimmed.length > 0
    ) {
      // A tag followed a group or column with no comma Ex:  (x) yz
      this.pushIssue('invalidTag', i, trimmed)
    } else if (trimmed.length > 0) {
      this.pushTag(i) // Tag has just finished
    } else {
      this.resetToken(i) // After a group or column
    }
    this.state.lastDelimiter = [CHARACTERS.COMMA, i]
  }

  /**
   * Handle a slash character.
   * @param {number} i The index of the slash.
   * @internal
   */
  handleSlash(i) {
    if (this.state.currentToken.trim().length === 0) {
      // Slash at beginning of tag.
      this.pushIssue('extraSlash', i) // Slash at beginning of tag.
    } else if (this.state.lastSlash >= 0 && this.hedString.slice(this.state.lastSlash + 1, i).trim().length === 0) {
      this.pushIssue('extraSlash', i) // Slashes with only blanks between
    } else if (i > 0 && this.hedString.charAt(i - 1) === CHARACTERS.BLANK) {
      this.pushIssue('extraBlank', i - 1) // Blank before slash such as slash in value
    } else if (i < this.hedString.length - 1 && this.hedString.charAt(i + 1) === CHARACTERS.BLANK) {
      this.pushIssue('extraBlank', i + 1) //Blank after a slash
    } else if (this.hedString.slice(i).trim().length === 0) {
      this.pushIssue('extraSlash', this.state.startingIndex) // Extra slash at the end
    } else {
      this.state.currentToken += CHARACTERS.SLASH
      this.state.lastSlash = i
    }
  }

  /**
   * Handle an opening group character.
   * @param {number} i The index of the opening group character.
   * @internal
   */
  handleOpeningGroup(i) {
    if (this.state.lastDelimiter[0] === CHARACTERS.OPENING_COLUMN) {
      this.pushIssue('unclosedCurlyBrace', this.state.lastDelimiter[1]) // After open curly brace Ex: "{  ("
    } else if (this.state.lastDelimiter[0] === CHARACTERS.CLOSING_COLUMN) {
      this.pushIssue('commaMissing', this.state.lastDelimiter[1]) // After close curly brace Ex: "} ("
    } else if (this.state.lastDelimiter[0] === CHARACTERS.CLOSING_GROUP) {
      this.pushIssue('commaMissing', this.state.lastDelimiter[1] + 1) // After close group Ex: ") ("
    } else if (this.state.currentToken.trim().length > 0) {
      this.pushInvalidTag('commaMissing', i, this.state.currentToken.trim()) // After tag Ex: "x ("
    } else {
      this.state.currentGroupStack.push([])
      this.state.parenthesesStack.push(new GroupSpec(i, undefined, []))
      this.resetToken(i)
      this.state.groupDepth++
      this.state.lastDelimiter = [CHARACTERS.OPENING_GROUP, i]
    }
  }

  /**
   * Handle a closing group character.
   * @param {number} i The index of the closing group character.
   * @internal
   */
  handleClosingGroup(i) {
    if (this.state.groupDepth <= 0) {
      this.pushIssue('unopenedParenthesis', i) // No corresponding opening group
    } else if (this.state.lastDelimiter[0] === CHARACTERS.OPENING_COLUMN) {
      this.pushIssue('unclosedCurlyBrace', this.state.lastDelimiter[1]) // After open curly brace Ex: "{ )"
    } else {
      if ([CHARACTERS.OPENING_GROUP, CHARACTERS.COMMA].includes(this.state.lastDelimiter[0])) {
        // Should be a tag here
        this.pushTag(i)
      }
      this.closeGroup(i) // Close the group by updating its bounds and moving it to the parent group.
      this.state.lastDelimiter = [CHARACTERS.CLOSING_GROUP, i]
    }
  }

  /**
   * Handle an opening column character.
   * @param {number} i The index of the opening column character.
   * @internal
   */
  handleOpeningColumn(i) {
    if (this.state.currentToken.trim().length > 0) {
      this.pushInvalidCharacterIssue(CHARACTERS.OPENING_COLUMN, i) // Middle of a token Ex: "x {"
    } else if (this.state.lastDelimiter[0] === CHARACTERS.OPENING_COLUMN) {
      this.pushIssue('nestedCurlyBrace', i) // After open curly brace   Ex: "{x{"
    } else {
      this.state.lastDelimiter = [CHARACTERS.OPENING_COLUMN, i]
    }
  }

  /**
   * Handle a closing column character.
   * @param {number} i The index of the closing column character.
   * @internal
   */
  handleClosingColumn(i) {
    if (this.state.lastDelimiter[0] !== CHARACTERS.OPENING_COLUMN) {
      this.pushIssue('unopenedCurlyBrace', i) // No matching open brace Ex: " x}"
    } else if (!this.state.currentToken.trim()) {
      this.pushIssue('emptyCurlyBrace', i) // Column slice cannot be empty Ex: "{  }"
    } else {
      // Close column by updating bounds and moving it to the parent group, push a column splice on the stack.
      this.state.currentGroupStack[this.state.groupDepth].push(
        new ColumnSpliceSpec(this.state.currentToken.trim(), this.state.lastDelimiter[1], i),
      )
      this.resetToken(i)
      this.state.lastDelimiter = [CHARACTERS.CLOSING_COLUMN, i]
    }
  }

  /**
   * Handle a colon character.
   * @param {number} i The index of the colon.
   * @internal
   */
  handleColon(i) {
    const trimmed = this.state.currentToken.trim()
    if (this.state.librarySchema || trimmed.includes(CHARACTERS.BLANK) || trimmed.includes(CHARACTERS.SLASH)) {
      this.state.currentToken += CHARACTERS.COLON // If colon has been seen or is part of a value.
    } else if (/[^A-Za-z]/.test(trimmed)) {
      this.pushIssue('invalidTagPrefix', i) // Prefix not alphabetic Ex:  "1a:xxx"
    } else {
      const lib = this.state.currentToken.trimStart()
      this.resetToken(i)
      this.state.librarySchema = lib
    }
  }

  /**
   * Unwind the group stack to handle unclosed groups.
   * @internal
   */
  unwindGroupStack() {
    while (this.state.groupDepth > 0) {
      this.pushIssue(
        'unclosedParenthesis',
        this.state.parenthesesStack[this.state.parenthesesStack.length - 1].bounds[0],
      )
      this.closeGroup(this.hedString.length)
    }
  }

  /**
   * Push a tag to the current group stack.
   * @param {number} i The current index in the HED string.
   * @internal
   */
  pushTag(i) {
    if (this.state.currentToken.trim().length === 0) {
      this.pushIssue('emptyTagFound', i)
    } else if (this.checkForBadPlaceholderIssues(i)) {
      this.pushInvalidTag('invalidPlaceholder', i, this.state.currentToken)
    } else {
      const bounds = getTrimmedBounds(this.state.currentToken)
      this.state.currentGroupStack[this.state.groupDepth].push(
        new TagSpec(
          this.state.currentToken.trim(),
          this.state.startingIndex + bounds[0],
          this.state.startingIndex + bounds[1],
          this.state.librarySchema,
        ),
      )
      this.resetToken(i)
    }
  }

  /**
   * Check for issues related to placeholders in the current token.
   * @returns {boolean} Whether any placeholder issues were found.
   * @internal
   */
  checkForBadPlaceholderIssues() {
    const tokenSplit = this.state.currentToken.split(CHARACTERS.PLACEHOLDER)
    if (tokenSplit.length === 1) {
      // No placeholders to worry about for this tag
      return false
    }
    return (
      tokenSplit.length > 2 ||
      !tokenSplit[0].endsWith(CHARACTERS.SLASH) || // A placeholder must be after a slash
      (tokenSplit[1].trim().length > 0 && tokenSplit[1][0] !== CHARACTERS.BLANK)
    )
  }

  /**
   * Close the current group.
   * @param {number} i The current index in the HED string.
   * @internal
   */
  closeGroup(i) {
    const groupSpec = this.state.parenthesesStack.pop()
    groupSpec.bounds[1] = i + 1
    if (this.hedString.slice(groupSpec.bounds[0] + 1, i).trim().length === 0) {
      this.pushIssue('emptyTagFound', i) //The group is empty
    }
    this.state.parenthesesStack[this.state.groupDepth - 1].children.push(groupSpec)
    this.state.currentGroupStack[this.state.groupDepth - 1].push(this.state.currentGroupStack.pop())
    this.state.groupDepth--
  }

  /**
   * Push an issue to the issue list.
   * @param {string} issueCode The issue code.
   * @param {number} index The index of the issue.
   * @internal
   */
  pushIssue(issueCode, index) {
    this.issues.push(generateIssue(issueCode, { index, string: this.hedString }))
  }

  /**
   * Push an invalid tag issue to the issue list.
   * @param {string} issueCode The issue code.
   * @param {number} index The index of the issue.
   * @param {string} tag The invalid tag.
   * @internal
   */
  pushInvalidTag(issueCode, index, tag) {
    this.issues.push(generateIssue(issueCode, { index, tag: tag, string: this.hedString }))
  }

  /**
   * Push an invalid character issue to the issue list.
   * @param {string} character The invalid character.
   * @param {number} index The index of the character.
   * @internal
   */
  pushInvalidCharacterIssue(character, index) {
    this.issues.push(
      generateIssue('invalidCharacter', { character: unicodeName(character), index, string: this.hedString }),
    )
  }
}
