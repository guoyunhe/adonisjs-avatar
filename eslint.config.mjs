import { base } from 'eslint-config-ali';
import prettier from 'eslint-plugin-prettier/recommended';

export default [
  ...base,
  {
    files: ['tests/**/*.ts'],
    languageOptions: {
      parserOptions: {
        projectService: {
          allowDefaultProject: ['tests/*.spec.ts'],
        },
      },
    },
  },
  prettier,
];
