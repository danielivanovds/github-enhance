import picomatch from "picomatch";

// #region Patterns

/**
 * Path globs for files a tool wrote rather than a person: lock files, bundles,
 * source maps and code generators' output. They change in bulk and rarely
 * need line-by-line review.
 */
export const DEFAULT_GENERATED_PATTERNS: readonly string[] = [
  // Lock files
  "**/{package-lock.json,npm-shrinkwrap.json,yarn.lock,pnpm-lock.yaml,bun.lock,bun.lockb}",
  "**/{Cargo.lock,go.sum,poetry.lock,uv.lock,Pipfile.lock,Gemfile.lock,composer.lock}",
  "**/{Podfile.lock,Package.resolved,flake.lock,mix.lock,pubspec.lock,packages.lock.json}",
  "**/gradle.lockfile",
  // Build output
  "**/dist/**",
  "**/*.min.{js,css}",
  "**/*.map",
  // Code generators
  "**/__generated__/**",
  "**/generated/**",
  "**/*.{generated,gen}.*",
  "**/*.{g,freezed}.dart",
  "**/*.pb.{go,h,cc}",
  "**/*_pb2{,_grpc}.py",
  "**/zz_generated*.go",
  "**/*.Designer.cs",
];

/**
 * Path globs for test code across the common ecosystems. Files that exist only
 * for tests (fixtures, snapshots, mocks) count too: a reviewer reading the
 * product change wants them out of the way as well.
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

export const FILE_KINDS = ["code", "test", "generated"] as const;
export type FileKind = (typeof FILE_KINDS)[number];

export interface Patterns {
  readonly generated: readonly string[];
  readonly test: readonly string[];
}

/**
 * Builds a path classifier. Generated wins over test, so a lock file inside a
 * test fixture folder counts as generated.
 */
export const makeClassifier = (patterns: Patterns): ((path: string) => FileKind) => {
  const isGenerated = picomatch([...patterns.generated], { dot: true });
  const isTest = picomatch([...patterns.test], { dot: true });
  return (path) => (isGenerated(path) ? "generated" : isTest(path) ? "test" : "code");
};

// #endregion
