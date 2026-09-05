import { defineConfig } from 'vitest/config';

/**
 * Domain and content modules are deliberately free of react-native imports so
 * they can be tested in plain node with no native mocking. Anything under
 * src/ui or app/ is verified visually via scripts/screenshot.mjs instead.
 */
export default defineConfig({
  test: {
    environment: 'node',
    // src/data is mostly react-native-dependent and verified visually instead.
    // guardrail.ts is the exception: it is pure, and it is safety-critical.
    include: [
      'src/domain/**/*.test.ts',
      'src/content/**/*.test.ts',
      'src/data/guardrail.test.ts',
    ],
  },
});
