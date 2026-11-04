import { defineConfig } from 'oxlint';
import recommended from 'oxlint-config-recommended';

export default defineConfig({
  env: { builtin: true, browser: true, node: true, vitest: true },
  extends: [recommended],
});
