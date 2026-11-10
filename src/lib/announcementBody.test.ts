import { describe, expect, it } from 'vitest';
import { safeFragment } from './announcementBody';

describe('safeFragment', () => {
	it('lets through what the backend renderer emits', () => {
		const html =
			'<p>Hallo <strong>alle</strong>,<br>bis bald</p><ul><li>eins</li></ul><ol><li>zwei</li></ol>' +
			'<p><a href="https://tallox.example.org/ablauf" rel="noopener noreferrer">hier</a> &lt;b&gt;</p>';
		expect(safeFragment(html)).toBe(html);
	});

	it('refuses any other tag or attribute', () => {
		for (const html of [
			'<p><script>alert(1)</script></p>',
			'<img src="x" onerror="alert(1)">',
			'<p style="color:red">x</p>',
			'<a href="javascript:alert(1)" rel="noopener noreferrer">x</a>',
			'<a href="https://x.example" onclick="x" rel="noopener noreferrer">x</a>',
			'<a>x</a>',
			'<p>x < y</p>'
		]) {
			expect(safeFragment(html), html).toBeNull();
		}
	});

	it('answers null for nothing', () => {
		expect(safeFragment('')).toBeNull();
		expect(safeFragment(undefined)).toBeNull();
	});
});
