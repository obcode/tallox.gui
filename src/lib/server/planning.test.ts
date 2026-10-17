import { beforeEach, describe, expect, it, vi } from 'vitest';

const backendRequest = vi.fn();
vi.mock('./backend', () => ({ backendRequest }));

const { loadPlanningState } = await import('./planning');

/**
 * Three outcomes, because the card says three different things: what is due in this phase, that
 * the dean's office has yet to name a planning semester, or nothing at all.
 */
describe('loadPlanningState', () => {
	beforeEach(() => {
		backendRequest.mockReset();
	});

	it('passes the planning semester and its phase through', async () => {
		backendRequest.mockResolvedValue({ planningSemester: { code: '2027-SS', phase: 'WISHES' } });
		await expect(loadPlanningState()).resolves.toEqual({
			kind: 'set',
			code: '2027-SS',
			phase: 'WISHES'
		});
	});

	// null is "nobody has said yet" — the step "Das Planungssemester setzen" is due then, so it
	// must not collapse into the failure case.
	it('tells an unset planning semester from a failure', async () => {
		backendRequest.mockResolvedValue({ planningSemester: null });
		await expect(loadPlanningState()).resolves.toEqual({ kind: 'unset' });
	});

	it('returns unknown rather than throwing when the backend does not answer', async () => {
		backendRequest.mockRejectedValue(new Error('connect ECONNREFUSED 127.0.0.1:8080'));
		await expect(loadPlanningState()).resolves.toEqual({ kind: 'unknown' });
	});
});
