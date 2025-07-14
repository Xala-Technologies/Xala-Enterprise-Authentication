module.exports = {
  extends: [
    "./node_modules/@xala-technologies/enterprise-standards/configs/eslint/base.cjs"
  ],
  parserOptions: {
    project: './tsconfig.json'
  },
  rules: {
    // Additional project-specific rules if needed
    "security/detect-object-injection": "error",
    "security/detect-non-literal-fs-filename": "error"
  }
};