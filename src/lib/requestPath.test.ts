import { describe, expect, it } from 'vitest';
import { isRefusedPath } from './requestPath';

describe('isRefusedPath', () => {
	it('refuses a protocol-relative path', () => {
		expect(isRefusedPath('//evil.example/')).toBe(true);
		expect(isRefusedPath('//')).toBe(true);
	});

	it('lets every ordinary path through', () => {
		expect(isRefusedPath('/')).toBe(false);
		expect(isRefusedPath('/bedarf?semester=2027-SS')).toBe(false);
		expect(isRefusedPath('/module/abc//def')).toBe(false);
	});
});
