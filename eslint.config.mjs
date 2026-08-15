import { readdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { defineConfig, globalIgnores } from 'eslint/config';
import nextVitals from 'eslint-config-next/core-web-vitals';
import nextTs from 'eslint-config-next/typescript';
import prettier from 'eslint-config-prettier/flat';

const rootDir = dirname(fileURLToPath(import.meta.url));

/**
 * Direct children of `src/<layer>`, so the sibling-isolation zones below stay
 * correct as modules/features are added without editing this file.
 */
const childrenOf = (layer) => {
  try {
    return readdirSync(join(rootDir, 'src', layer), { withFileTypes: true })
      .filter((entry) => entry.isDirectory())
      .map((entry) => entry.name);
  } catch {
    return [];
  }
};

/**
 * Architecture boundaries — see docs/architecture.md.
 *
 *   app      → features, modules, shared
 *   features → modules, shared            (never another feature)
 *   modules  → shared                     (never another module)
 *   shared   → shared only
 *
 * Zones are matched on resolved file paths, so both `@/modules/x` and
 * `../../modules/x` are caught. `target` = the importing file, `from` = the
 * imported file.
 */
const boundaryZones = [
  {
    target: './src/shared',
    from: ['./src/app', './src/features', './src/modules'],
    message: 'shared/ must stay business-agnostic: it cannot import app/, features/ or modules/.',
  },
  {
    target: './src/types',
    from: ['./src/app', './src/features', './src/modules', './src/shared'],
    message: 'src/types holds global types only: it cannot import from a business layer.',
  },
  {
    target: './src/modules',
    from: ['./src/app', './src/features'],
    message: 'modules/ is an isolated business domain: it cannot import app/ or features/.',
  },
  {
    target: './src/features',
    from: './src/app',
    message: 'features/ cannot import app/ — routing composes features, not the reverse.',
  },
  ...childrenOf('modules').map((name) => ({
    target: `./src/modules/${name}`,
    from: './src/modules',
    except: [`./${name}`],
    message: `modules/${name} cannot depend on another module. Compose domains inside a feature instead.`,
  })),
  ...childrenOf('features').map((name) => ({
    target: `./src/features/${name}`,
    from: './src/features',
    except: [`./${name}`],
    message: `features/${name} cannot depend on another feature. Extract the shared part into a module.`,
  })),
];

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  {
    name: 'project/typescript',
    files: ['**/*.{ts,tsx,mts}'],
    rules: {
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],
      '@typescript-eslint/no-unused-vars': [
        'error',
        {
          argsIgnorePattern: '^_',
          varsIgnorePattern: '^_',
          caughtErrorsIgnorePattern: '^_',
        },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
    },
  },
  {
    name: 'project/architecture-boundaries',
    files: ['src/**/*.{ts,tsx}'],
    rules: {
      'import/no-restricted-paths': ['error', { basePath: rootDir, zones: boundaryZones }],
    },
  },
  prettier,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    '.next/**',
    'out/**',
    'build/**',
    'next-env.d.ts',
  ]),
]);

export default eslintConfig;
