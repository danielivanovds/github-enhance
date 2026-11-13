import { describe, expect, test } from "bun:test";
import { DEFAULT_TEST_PATTERNS, makeClassifier } from "./classify.ts";

const classify = makeClassifier(DEFAULT_TEST_PATTERNS);

describe("default test patterns", () => {
  test.each([
    "src/foo.test.ts",
    "packages/a/src/bar.spec.tsx",
    "src/__tests__/thing.ts",
    "test/setup.ts",
    "packages/a/tests/helpers/x.ts",
    "src/__snapshots__/view.test.ts.snap",
    "pkg/server/handler_test.go",
    "app/test_models.py",
    "app/tests/conftest.py",
    "src/aot/compile/tests.rs",
    "src/aot/compile/module_reach_tests.rs",
    "src/main/java/com/acme/UserServiceTest.java",
    "Sources/AppTests/LoginTests.swift",
    "internal/parser/testdata/input.json",
    "e2e/login.ts",
    ".github/fixtures/payload.json",
  ])("treats %s as a test", (path) => {
    expect(classify(path)).toBe("test");
  });

  test.each([
    "src/foo.ts",
    "src/testing-library-adapter.ts",
    "docs/testing.md",
    "src/contest.ts",
    "src/latest.ts",
    "pkg/server/handler.go",
    "src/aot/compile/program_reach.rs",
    "src/main/java/com/acme/Testimonial.java",
    "README.md",
  ])("treats %s as code", (path) => {
    expect(classify(path)).toBe("code");
  });
});
