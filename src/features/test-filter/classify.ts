import picomatch from "picomatch";

// #region Patterns

/**
 * Path globs that mark a file as test code across the common ecosystems.
 * Support files that only exist for tests (fixtures, snapshots, mocks) count
 * as tests too, since a reviewer reading the product change wants them out of
 * the way as well.
 */
export const DEFAULT_TEST_PATTERNS: readonly string[] = [
  // Directories
  "**/test/**",
  "**/tests/**",
  "**/__tests__/**",
  "**/spec/**",
  "**/e2e/**",
  "**/testdata/**",
  "**/fixtures/**",
  "**/__fixtures__/**",
  "**/__mocks__/**",
  "**/__snapshots__/**",
  // JavaScript, TypeScript and friends
  "**/*.{test,spec}.*",
  "**/*.snap",
  // Go, Python, Rust, Elixir, C++
  "**/*_test.*",
  "**/*_tests.*",
  "**/test_*.*",
  "**/tests.rs",
  "**/conftest.py",
  // Java, Kotlin, Scala, Swift, C#
  "**/*{Test,Tests,Spec,IT}.{java,kt,kts,scala,swift,cs}",
];

// #endregion

// #region Classifier

export type FileKind = "test" | "code";

/** Builds a path classifier from a set of globs. */
export const makeClassifier = (patterns: readonly string[]): ((path: string) => FileKind) => {
  const isTest = picomatch([...patterns], { dot: true });
  return (path) => (isTest(path) ? "test" : "code");
};

// #endregion
