import { generateIssue } from '../../common/issues/issues'

export const parseTestData = [
  {
    name: 'valid-tags',
    description: 'Valid tags with/without extensions',
    tests: [
      {
        testname: 'single-tag-single-level',
        explanation: '"Event" is a single level tag"',
        schemaVersion: '8.3.0',
        stringIn: 'Event',
        stringLong: 'Event',
        stringShort: 'Event',
        errors: [],
        warnings: [],
      },
      {
        testname: 'single-tag-two-level',
        explanation: '"Event/Sensory-event" is a two-level tag',
        schemaVersion: '8.3.0',
        stringIn: 'Event/Sensory-event',
        stringLong: 'Event/Sensory-event',
        stringShort: 'Sensory-event',
        errors: [],
        warnings: [],
      },
      {
        testname: 'single-tag-multi-level',
        explanation: '"Item/Object/Geometric-object" is a full multi-level tag',
        schemaVersion: '8.3.0',
        stringIn: 'Item/Object/Geometric-object',
        stringLong: 'Item/Object/Geometric-object',
        stringShort: 'Geometric-object',
        errors: [],
        warnings: [],
      },
      {
        testname: 'single-partial-level-tag',
        explanation: '"Object/Geometric-object" is a partial path',
        schemaVersion: '8.3.0',
        stringIn: 'Object/Geometric-object',
        stringLong: 'Item/Object/Geometric-object',
        stringShort: 'Geometric-object',
        errors: [],
        warnings: [],
      },
      {
        testname: 'already-short-tag',
        explanation: '"Geometric-object" is already a short tag',
        schemaVersion: '8.3.0',
        stringIn: 'Geometric-object',
        stringLong: 'Item/Object/Geometric-object',
        stringShort: 'Geometric-object',
        errors: [],
        warnings: [],
      },
      {
        testname: 'single-tag-extension',
        explanation: '"Unique-value" is a valid extension for "Item/Sound/Environmental-sound/Unique-value"',
        schemaVersion: '8.3.0',
        stringIn: 'Item/Sound/Environmental-sound/Unique-value',
        stringLong: 'Item/Sound/Environmental-sound/Unique-value',
        stringShort: 'Environmental-sound/Unique-value',
        errors: [],
        warnings: [],
      },
      {
        testname: 'multi-level-tag-extension',
        explanation: '"Unique-value/Junk" is a valid extension for "Item/Sound/Environmental-sound/Unique-value/Junk"',
        schemaVersion: '8.3.0',
        stringIn: 'Item/Sound/Environmental-sound/Unique-value/Junk',
        stringLong: 'Item/Sound/Environmental-sound/Unique-value/Junk',
        stringShort: 'Environmental-sound/Unique-value/Junk',
        operation: 'toShort',
        errors: [],
        warnings: [],
      },
      {
        testname: 'multi-level-tag-extension-for-partial-path-to-short',
        explanation: '"Unique-value/Junk" is a valid extension for "Sound/Environmental-sound/Unique-value/Junk"',
        schemaVersion: '8.3.0',
        stringIn: 'Sound/Environmental-sound/Unique-value/Junk',
        stringLong: 'Item/Sound/Environmental-sound/Unique-value/Junk',
        stringShort: 'Environmental-sound/Unique-value/Junk',
        errors: [],
        warnings: [],
      },
    ],
  },
  {
    name: 'valid-value-tags',
    description: 'Valid value tags with/without values',
    tests: [
      {
        testname: 'long-form-tag-with-value',
        explanation: '"Agent-property/Agent-trait/Age/15" can take a value"',
        schemaVersion: '8.3.0',
        stringIn: 'Agent-property/Agent-trait/Age/15',
        stringLong: 'Property/Agent-property/Agent-trait/Age/15',
        stringShort: 'Age/15',
        errors: [],
        warnings: [],
      },
      {
        testname: 'long-form-tag-with-value',
        explanation: '"Agent-trait/Age" does not require a value"',
        schemaVersion: '8.3.0',
        stringIn: 'Agent-trait/Age',
        stringLong: 'Property/Agent-property/Agent-trait/Age',
        stringShort: 'Age',
        errors: [],
        warnings: [],
      },
      {
        testname: 'value-tag-does-not-require-value',
        explanation: '"Label" does not have to take a value"',
        schemaVersion: '8.3.0',
        stringIn: 'Label',
        stringLong: 'Property/Informational-property/Label',
        stringShort: 'Label',
        errors: [],
        warnings: [],
      },
    ],
  },
  {
    name: 'valid-mixed-groups',
    description: 'Valid tags with values and extensions',
    tests: [
      {
        testname: 'extensions-and-values',
        explanation: '"(Train/Maglev,Age/15,RGB-red/0.5),Operate" has extensions and values',
        schemaVersion: '8.3.0',
        stringIn: '(Train/Maglev,Age/15,RGB-red/0.5),Operate',
        stringLong:
          '(Item/Object/Man-made-object/Vehicle/Train/Maglev, Property/Agent-property/Agent-trait/Age/15, Property/Sensory-property/Sensory-attribute/Visual-attribute/Color/RGB-color/RGB-red/0.5), Action/Perform/Operate',
        stringShort: '(Train/Maglev, Age/15, RGB-red/0.5), Operate',
        errors: [],
        warnings: [],
      },
      {
        testname: 'value with units',
        explanation: '"(Time-value/20 ms),Perform/Operate" has valid units',
        schemaVersion: '8.3.0',
        stringIn: '(Time-value/20 ms),Perform/Operate',
        stringLong:
          '(Property/Data-property/Data-value/Spatiotemporal-value/Temporal-value/Time-value/20 ms), Action/Perform/Operate',
        stringShort: '(Time-value/20 ms), Operate',
        errors: [],
        warnings: [],
      },
    ],
  },
  {
    name: 'invalid-tags',
    description: 'Invalid tags with or without extensions',
    tests: [
      {
        testname: 'single-level-extension-already-a-tag',
        explanation: '"Event" in "Item/Sound/Event" is already a tag',
        schemaVersion: '8.3.0',
        stringIn: 'Item/Sound/Event',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidParentNode', { tag: 'Event', parentTag: 'Item/Sound' })],
        warnings: [],
      },
      {
        testname: 'multi-level-extension-already-tags',
        explanation: '"Sensory-event" in "Item/Sound/Environmental-sound/Event/Sensory-event" is already a tag',
        schemaVersion: '8.3.0',
        stringIn: 'Item/Sound/Environmental-sound/Event/Sensory-event',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidParentNode', { parentTag: 'Item/Sound/Environmental-sound', tag: 'Event' })],
        warnings: [],
      },
      {
        testname: 'mixed-extension-path',
        explanation: '"Sensory-event" in "Item/Sound/Event/Sensory-event/Environmental-sound"',
        schemaVersion: '8.3.0',
        stringIn: 'Item/Sound/Event/Sensory-event/Environmental-sound',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidParentNode', { parentTag: 'Item/Sound', tag: 'Event' })],
        warnings: [],
      },
      {
        testname: 'invalid-leading-tag',
        explanation: '"Junk" in "Junk/Item/Sound/Event/Sensory-event/Environmental-sound" is invalid',
        schemaVersion: '8.3.0',
        stringIn: 'Junk/Item/Sound/Event/Sensory-event/Environmental-sound',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidTag', { tag: 'Junk/Item/Sound/Event/Sensory-event/Environmental-sound' })],
        warnings: [],
      },
      {
        testname: 'invalid-single-tag',
        explanation: '"Junk" in "Junk" is invalid',
        schemaVersion: '8.3.0',
        stringIn: 'Junk',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidTag', { tag: 'Junk' })],
        warnings: [],
      },
      {
        testname: 'invalid-single-tag-with-extension',
        explanation: '"Junk/Blech" in "Junk" is invalid',
        schemaVersion: '8.3.0',
        stringIn: 'Junk/Blech',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidTag', { tag: 'Junk/Blech' })],
        warnings: [],
      },
      {
        testname: 'invalid-tag-in-middle',
        explanation:
          '"Geometric-object" in "Item/Object/Junk/Geometric-object/2D-shape" expects "Object" not "junk" to be parent',
        schemaVersion: '8.3.0',
        stringIn: 'Item/Object/Junk/Geometric-object/2D-shape',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidParentNode', { parentTag: 'Item/Object/Junk', tag: 'Geometric-object' })],
        warnings: [],
      },
      {
        testname: 'invalid-extension-not-allowed',
        explanation: '"Agent-action" in "Event/Agent-action/Baloney/Blech" cannot have an added extension',
        schemaVersion: '8.3.0',
        stringIn: 'Event/Agent-action/Baloney/Blech',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidExtension', { parentTag: 'Event/Agent-action', tag: 'Baloney' })],
        warnings: [],
      },
    ],
  },
  {
    name: 'placeholders-in-various-places',
    description: 'HED strings with placeholders',
    tests: [
      {
        testname: 'valid-string-with-placeholder',
        explanation: '"Label/#, Red" is okay',
        schemaVersion: '8.3.0',
        stringIn: 'Label/#, Red',
        stringLong:
          'Property/Informational-property/Label/#, Property/Sensory-property/Sensory-attribute/Visual-attribute/Color/CSS-color/Red-color/Red',
        stringShort: 'Label/#, Red',
        errors: [],
        warnings: [],
      },
      {
        testname: 'valid-string-with-placeholder-and-units',
        explanation: '"Time-value/# ms, Red" is okay',
        schemaVersion: '8.3.0',
        stringIn: 'Time-value/# ms, Red',
        stringLong:
          'Property/Data-property/Data-value/Spatiotemporal-value/Temporal-value/Time-value/# ms, Property/Sensory-property/Sensory-attribute/Visual-attribute/Color/CSS-color/Red-color/Red',
        stringShort: 'Time-value/# ms, Red',
        errors: [],
        warnings: [],
      },
      {
        testname: 'string-with-placeholder-not-allowed',
        explanation: '"Object/#, Red" -- Object does not allow placeholder',
        schemaVersion: '8.3.0',
        stringIn: 'Object/#, Red',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidExtension', { tag: '#', parentTag: 'Object' })],
        warnings: [],
      },
      {
        testname: 'place-holder-on-extension',
        explanation: '"Object/Thingie/#, Red" -- an extended tag does not allow placeholder',
        schemaVersion: '8.3.0',
        stringIn: 'Object/Thingie/#, Red',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidExtension', { parentTag: 'Object/Thingie', tag: '#' })],
        warnings: [],
      },
      {
        testname: 'place-holder-in-wrong-place',
        explanation: '"Label/#/Blech, Red" -- a placeholder cannot be followed by something else',
        schemaVersion: '8.3.0',
        stringIn: 'Label/#/Blech, Red',
        stringLong: null,
        stringShort: null,
        errors: [
          generateIssue('invalidPlaceholder', { index: '13', string: 'Label/#/Blech, Red', tag: 'Label/#/Blech' }),
        ],
        warnings: [],
      },
      {
        testname: 'multiple-placeholders-not-allowed',
        explanation: '"Label/##, Red" -- a placeholder cannot be followed by another placeholder',
        schemaVersion: '8.3.0',
        stringIn: 'Label/##, Red',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidPlaceholder', { index: '8', string: 'Label/##, Red', tag: 'Label/##' })],
        warnings: [],
      },
    ],
  },
  {
    name: 'value-tags',
    description: 'Tags with/without values and units',
    tests: [
      {
        testname: 'single-valid-tag-with-value',
        explanation: '"Age/5" has a valid value with no units',
        schemaVersion: '8.3.0',
        stringIn: 'Age/5',
        stringLong: 'Property/Agent-property/Agent-trait/Age/5',
        stringShort: 'Age/5',
        errors: [],
        warnings: [],
      },
      {
        testname: 'single-level-missing-required-value',
        explanation: '"Duration" must have a value',
        schemaVersion: '8.3.0',
        stringIn: 'Duration',
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('childRequired', { tag: 'Duration' })],
        warnings: [],
      },
      {
        testname: 'value with invalid units (BAD)',
        explanation: '"(Time-value/20 cm),Perform/Operate" has valid units',
        schemaVersion: '8.3.0',
        stringIn: '(Time-value/20 ms),Perform/Operate',
        stringLong:
          '(Property/Data-property/Data-value/Spatiotemporal-value/Temporal-value/Time-value/20 ms), Action/Perform/Operate',
        stringShort: '(Time-value/20 ms), Operate',
        errors: [],
        warnings: [],
      },
    ],
  },
  {
    name: 'tag-strings',
    description: 'Tag strings in various forms including empty and many tags',
    tests: [
      {
        testname: 'multiple-valid-tags',
        explanation: '"Age, Perform/Operate" is a valid HED string',
        schemaVersion: '8.3.0',
        stringIn: 'Age, Perform/Operate',
        stringLong: 'Property/Agent-property/Agent-trait/Age, Action/Perform/Operate',
        stringShort: 'Age, Operate',
        errors: [],
        warnings: [],
      },
      {
        testname: 'valid-empty-string',
        explanation: '"" is a valid HED string',
        schemaVersion: '8.3.0',
        stringIn: '',
        stringLong: '',
        stringShort: '',
        errors: [],
        warnings: [],
      },
      {
        testname: 'valid-string-with-groups',
        explanation: '"Red, (Blue,Green)" is a valid HED string',
        schemaVersion: '8.3.0',
        stringIn: 'Red, (Blue,Green)',
        stringLong:
          'Property/Sensory-property/Sensory-attribute/Visual-attribute/Color/CSS-color/Red-color/Red, (Property/Sensory-property/Sensory-attribute/Visual-attribute/Color/CSS-color/Blue-color/Blue, Property/Sensory-property/Sensory-attribute/Visual-attribute/Color/CSS-color/Green-color/Green)',
        stringShort: 'Red, (Blue, Green)',
        errors: [],
        warnings: [],
      },
      {
        testname: 'valid-string-with-nested-groups',
        explanation: '"Red, (Blue,(Green))" is a valid HED string',
        schemaVersion: '8.3.0',
        stringIn: 'Red, (Blue,(Green))',
        stringLong:
          'Property/Sensory-property/Sensory-attribute/Visual-attribute/Color/CSS-color/Red-color/Red, (Property/Sensory-property/Sensory-attribute/Visual-attribute/Color/CSS-color/Blue-color/Blue, (Property/Sensory-property/Sensory-attribute/Visual-attribute/Color/CSS-color/Green-color/Green))',
        stringShort: 'Red, (Blue, (Green))',
        errors: [],
        warnings: [],
      },
      {
        testname: 'invalid-null-string',
        explanation: '"null" is not a valid HED string',
        schemaVersion: '8.3.0',
        stringIn: null,
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidTagString', {})],
        warnings: [],
      },
      {
        testname: 'invalid-undefined-string',
        explanation: '"undefined" is not a valid HED string',
        schemaVersion: '8.3.0',
        stringIn: undefined,
        stringLong: null,
        stringShort: null,
        errors: [generateIssue('invalidTagString', {})],
        warnings: [],
      },
    ],
  },
]
