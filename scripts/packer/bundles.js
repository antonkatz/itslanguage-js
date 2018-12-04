// Files that should be available in each package
const defaultFiles = [
  'package.json',
  'README.md',
  'CHANGELOG.md',
  'LICENSE',
];

/**
 * Specify some bundle information.
 *
 * Entry: module id of the package. Is also used as path where the pacakge lives.
 * Library: this id will be used to generate the UMD package with.
 * files: array with files to always copy.
 *
 * @type {{
 *   entry: string,
 *   library: string,
 *   files: string[]
 * }[]}
 */
const bundles = [
  {
    entry: 'api',
    library: 'itsl.api',
    files: [
      ...defaultFiles,
    ],
  },
  {
    entry: 'recorder',
    library: 'itsl.recorder',
    files: [
      ...defaultFiles,
    ],
  },
];

module.exports = bundles;
