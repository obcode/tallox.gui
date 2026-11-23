import js from '@eslint/js';
import svelte from 'eslint-plugin-svelte';
import prettier from 'eslint-config-prettier';
import globals from 'globals';
import ts from 'typescript-eslint';

export default ts.config(
	js.configs.recommended,
	...ts.configs.recommended,
	...svelte.configs['flat/recommended'],
	prettier,
	...svelte.configs['flat/prettier'],
	{
		languageOptions: {
			globals: {
				...globals.browser,
				...globals.node,
				// Substituted at build time by vite.config.ts.
				__APP_VERSION__: 'readonly',
				__BUILD_TIME__: 'readonly'
			}
		}
	},
	{
		files: ['**/*.svelte'],
		languageOptions: {
			parserOptions: { parser: ts.parser }
		}
	},
	{
		// Forms stay on their page: #lib/enhance passes `navigate: false`, which SvelteKit 3's own
		// enhance does not. A direct import would quietly bring the navigation back.
		files: ['src/**/*.ts', 'src/**/*.svelte'],
		ignores: ['src/lib/enhance.ts'],
		rules: {
			'no-restricted-imports': [
				'error',
				{
					paths: [
						{
							name: '$app/forms',
							importNames: ['enhance'],
							message: "Use enhance from '#lib/enhance.ts', which keeps the page where it is."
						}
					]
				}
			]
		}
	},
	{
		ignores: [
			'build/',
			'.svelte-kit/',
			'dist/',
			'node_modules/',
			'src/lib/gql/__generated__/',
			'schema.graphql',
			// Test output, not source.
			'coverage/',
			'playwright-report/',
			'test-results/'
		]
	}
);
