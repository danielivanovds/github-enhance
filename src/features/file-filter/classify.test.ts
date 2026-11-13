import { describe, expect, test } from "bun:test";
import { DEFAULT_GENERATED_PATTERNS, DEFAULT_TEST_PATTERNS, makeClassifier } from "./classify.ts";

const classify = makeClassifier({
  generated: DEFAULT_GENERATED_PATTERNS,
  test: DEFAULT_TEST_PATTERNS,
});

describe("default patterns", () => {
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
    "package-lock.json",
    "bun.lock",
    "apps/web/pnpm-lock.yaml",
    "Cargo.lock",
    "go.sum",
    "ios/Podfile.lock",
    "packages/ui/dist/index.js",
    "public/vendor.min.js",
    "public/app.js.map",
    "src/__generated__/schema.graphql.ts",
    "src/ir/generated/opcodes.rs",
    "api/user.pb.go",
    "api/user_pb2_grpc.py",
    "lib/models/user.g.dart",
    "src/routes.gen.ts",
    // Generated wins over test.
    "test/cli/install/migration/yarn-berry/basic/yarn.lock",
  ])("treats %s as generated", (path) => {
    expect(classify(path)).toBe("generated");
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
    "src/install/lockfile.rs",
    "src/generator.ts",
    "scripts/build/deps/webkit.ts",
    "README.md",
  ])("treats %s as code", (path) => {
    expect(classify(path)).toBe("code");
  });
});
