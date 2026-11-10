import { test, expect, PERSONAS, gotoRendered } from './fixtures';

/**
 * "Zum Home-Bildschirm": the web manifest and its icons.
 *
 * Nothing here fails loudly. A manifest the browser cannot fetch, or an icon path that 404s,
 * leaves the app fully usable — the install entry just never appears, or appears with a blank
 * icon, and nobody files that as a bug. Hence the checks below.
 *
 * The files are fetched WITHOUT identity on purpose: browsers request the manifest without
 * cookies unless told otherwise, and the deployment serves these paths without login so that
 * this works regardless.
 */
test.describe('home-screen install', () => {
	test('every page links the manifest with credentials and an apple-touch-icon', async ({
		asPersona
	}) => {
		const page = await asPersona(PERSONAS.eins);
		await gotoRendered(page, '/');

		const manifest = page.locator('head link[rel="manifest"]');
		await expect(manifest).toHaveAttribute('href', /manifest\.webmanifest$/);
		// Without it the fetch goes out cookie-less and an auth proxy answers with a redirect.
		await expect(manifest).toHaveAttribute('crossorigin', 'use-credentials');
		await expect(page.locator('head link[rel="apple-touch-icon"]')).toHaveAttribute(
			'href',
			/apple-touch-icon\.png$/
		);
	});

	test('the manifest is installable and every icon it names exists at its size', async ({
		request,
		browser
	}) => {
		const res = await request.get('/manifest.webmanifest');
		expect(res.status()).toBe(200);
		const manifest = await res.json();

		expect(manifest.name).toBeTruthy();
		expect(manifest.short_name).toBe('Tallox');
		expect(manifest.start_url).toBe('/');
		expect(manifest.display).toBe('standalone');

		const icons: { src: string; sizes: string; purpose?: string }[] = manifest.icons;
		// What Chromium requires for the install prompt: a 192 and a 512.
		expect(icons.map((i) => i.sizes)).toEqual(expect.arrayContaining(['192x192', '512x512']));
		expect(icons.some((i) => i.purpose === 'maskable')).toBe(true);

		const page = await browser.newPage();
		try {
			for (const icon of [...icons, { src: '/apple-touch-icon.png', sizes: '180x180' }]) {
				const r = await request.get(icon.src);
				expect(r.status(), icon.src).toBe(200);
				expect(r.headers()['content-type'], icon.src).toContain('image/png');

				// The declared size must be the real one: a mismatch makes Chromium skip the icon.
				const dataUrl = `data:image/png;base64,${(await r.body()).toString('base64')}`;
				const size = await page.evaluate(async (src) => {
					const img = new Image();
					img.src = src;
					await img.decode();
					return `${img.naturalWidth}x${img.naturalHeight}`;
				}, dataUrl);
				expect(size, icon.src).toBe(icon.sizes);
			}
		} finally {
			await page.close();
		}
	});
});
