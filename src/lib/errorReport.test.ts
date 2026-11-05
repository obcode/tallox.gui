import { describe, expect, it } from 'vitest';
import { newErrorId, reportUnexpectedError, type ErrorSinks } from './errorReport';

function recordingSinks() {
	const captured: { error: unknown; errorId: string }[] = [];
	const lines: string[] = [];
	const sinks: ErrorSinks = {
		capture: (error, errorId) => captured.push({ error, errorId }),
		log: (line) => lines.push(line),
		version: 'v5.0.0'
	};
	return { sinks, captured, lines };
}

describe('newErrorId', () => {
	it('is eight hex digits', () => {
		expect(newErrorId()).toMatch(/^[0-9a-f]{8}$/);
	});
});

describe('reportUnexpectedError', () => {
	it('gives the page, the log and the collector the same number', () => {
		const { sinks, captured, lines } = recordingSinks();
		const error = new TypeError("Cannot read properties of undefined (reading 'id')");

		const got = reportUnexpectedError(
			{
				error,
				status: 500,
				message: 'Internal Error',
				method: 'POST',
				path: '/konto/kompetenzen',
				routeId: '/konto/kompetenzen'
			},
			sinks
		);

		expect(got.message).toBe('Internal Error');
		expect(got.errorId).toMatch(/^[0-9a-f]{8}$/);
		expect(captured).toEqual([{ error, errorId: got.errorId }]);
		expect(lines).toHaveLength(1);
		expect(lines[0]).toContain(`unexpected error ${got.errorId}: 500 POST /konto/kompetenzen`);
		expect(lines[0]).toContain('route /konto/kompetenzen, version v5.0.0');
		expect(lines[0]).toContain(error.stack);
	});

	it('reports a thrown non-error as text', () => {
		const { sinks, lines } = recordingSinks();
		reportUnexpectedError(
			{ error: 'boom', status: 500, message: 'Internal Error', path: '/', routeId: null },
			sinks
		);
		expect(lines[0]).toContain('(route none, version v5.0.0)\nboom');
	});

	it('leaves a wrong address alone', () => {
		const { sinks, captured, lines } = recordingSinks();
		const got = reportUnexpectedError(
			{
				error: new Error('Not found'),
				status: 404,
				message: 'Not Found',
				path: '/x',
				routeId: null
			},
			sinks
		);
		expect(got).toEqual({ message: 'Not Found' });
		expect(captured).toEqual([]);
		expect(lines).toEqual([]);
	});
});
