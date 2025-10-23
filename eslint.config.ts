import eslint from '@eslint/js'
import prettierConfig from 'eslint-config-prettier'
import perfectionist from 'eslint-plugin-perfectionist'
import { defineConfig } from 'eslint/config'
import tseslint from 'typescript-eslint'

export default defineConfig(
	{
		ignores: ['**/node_modules/**', '**/dist/**', '**/.wrangler/**']
	},
	eslint.configs.recommended,
	...tseslint.configs.strictTypeChecked,
	...tseslint.configs.stylisticTypeChecked,
	perfectionist.configs['recommended-natural'],
	{
		files: ['**/*.{ts,tsx,js,jsx}'],
		languageOptions: {
			parserOptions: {
				projectService: {
					allowDefaultProject: ['*.js', '*.mjs', '*.cjs']
				}
			}
		},
		rules: {
			'@typescript-eslint/await-thenable': 'error',
			'@typescript-eslint/consistent-type-definitions': ['error', 'type'],
			'@typescript-eslint/consistent-type-exports': [
				'error',
				{
					fixMixedExportsWithInlineTypeSpecifier: true
				}
			],
			'@typescript-eslint/consistent-type-imports': [
				'error',
				{
					fixStyle: 'inline-type-imports',
					prefer: 'type-imports'
				}
			],
			'@typescript-eslint/no-explicit-any': 'error',
			'@typescript-eslint/no-floating-promises': 'error',
			'@typescript-eslint/no-misused-promises': 'error',
			'@typescript-eslint/no-non-null-assertion': 'error',
			'@typescript-eslint/no-redundant-type-constituents': 'off',
			'@typescript-eslint/no-unnecessary-condition': 'off',
			'@typescript-eslint/no-unnecessary-type-parameters': 'off',

			'@typescript-eslint/no-unsafe-assignment': 'error',
			'@typescript-eslint/no-unsafe-call': 'error',
			'@typescript-eslint/no-unsafe-member-access': 'error',
			'@typescript-eslint/no-unsafe-return': 'error',
			'@typescript-eslint/no-unused-vars': [
				'error',
				{
					argsIgnorePattern: '^_',
					caughtErrorsIgnorePattern: '^_',
					varsIgnorePattern: '^_'
				}
			],
			'@typescript-eslint/restrict-template-expressions': 'off',
			'@typescript-eslint/strict-boolean-expressions': 'off',
			eqeqeq: ['error', 'always'],
			// General
			'no-var': 'error',
			'perfectionist/sort-enums': ['error', { order: 'asc', type: 'natural' }],
			'perfectionist/sort-exports': ['error', { order: 'asc', type: 'natural' }],
			// Perfectionist sorting
			'perfectionist/sort-imports': [
				'error',
				{
					customGroups: {
						type: {
							cloudflare: ['^@cloudflare/']
						},
						value: {
							cloudflare: ['^@cloudflare/']
						}
					},
					groups: [
						'side-effect',
						'side-effect-style',
						['builtin', 'builtin-type'],
						['external', 'external-type'],
						['internal', 'internal-type'],
						['parent', 'parent-type'],
						['sibling', 'sibling-type'],
						['index', 'index-type'],
						'object',
						'style',
						'unknown'
					],
					internalPattern: ['^@/.+'],
					newlinesBetween: 'always',
					order: 'asc',
					type: 'natural'
				}
			],
			'perfectionist/sort-interfaces': ['error', { order: 'asc', type: 'natural' }],
			'perfectionist/sort-named-exports': ['error', { order: 'asc', type: 'natural' }],
			'perfectionist/sort-named-imports': ['error', { order: 'asc', type: 'natural' }],

			'perfectionist/sort-object-types': ['error', { order: 'asc', type: 'natural' }],
			'perfectionist/sort-objects': ['error', { order: 'asc', type: 'natural' }],
			'perfectionist/sort-union-types': ['error', { order: 'asc', type: 'natural' }],
			'prefer-const': 'error'
		}
	},
	prettierConfig
)
