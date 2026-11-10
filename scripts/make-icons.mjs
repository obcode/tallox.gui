// Renders the home-screen icons in static/ from the same emoji the favicon uses.
//
// Run by hand after the favicon changes: `node scripts/make-icons.mjs`. The PNGs are committed —
// generating them at build time would make every image build depend on an emoji font.
//
// Two shapes, because the platforms crop differently:
//   - "any" icons get a rounded tile with transparent corners, the way a browser shows them;
//   - the maskable icon and the apple-touch-icon are full-bleed, because Android and iOS cut
//     their own shape out of it. The emoji stays inside the central 80 % safe zone.
import { chromium } from '@playwright/test';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const STATIC = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', 'static');
const EMOJI = '🎓';
const TILE = '#eef2f8';

const icons = [
	{ file: 'icon-192.png', size: 192, fullBleed: false },
	{ file: 'icon-512.png', size: 512, fullBleed: false },
	{ file: 'icon-maskable-512.png', size: 512, fullBleed: true },
	{ file: 'apple-touch-icon.png', size: 180, fullBleed: true }
];

const browser = await chromium.launch();
try {
	for (const { file, size, fullBleed } of icons) {
		const page = await browser.newPage({ viewport: { width: size, height: size } });
		const radius = fullBleed ? 0 : Math.round(size * 0.22);
		const glyph = Math.round(size * (fullBleed ? 0.5 : 0.62));
		await page.setContent(`<!doctype html>
			<html><body style="margin:0;background:transparent">
			<div style="width:${size}px;height:${size}px;border-radius:${radius}px;background:${TILE};
				display:flex;align-items:center;justify-content:center;
				font:${glyph}px/1 'Noto Color Emoji','Apple Color Emoji',sans-serif">${EMOJI}</div>
			</body></html>`);
		await page.screenshot({ path: path.join(STATIC, file), omitBackground: true });
		await page.close();
		console.log(`${file} (${size}×${size})`);
	}
} finally {
	await browser.close();
}
