import { enhance as kitEnhance, type SubmitFunction } from '$app/forms';

/**
 * `use:enhance` that keeps the page where it is. Every form in this app goes through this one,
 * never through `$app/forms` directly.
 *
 * Since SvelteKit 3 an enhanced form navigates to where its submission lands, the way a native
 * submission would. For `action="?/roles"` that is the page's path with the action stripped —
 * and with it every other query parameter. On /verwaltung/personen?ansicht=konten&q=… a tick
 * then reloaded the unfiltered default tab, and the row it had just saved was gone. Every
 * action here answers on the page it was sent from, so `navigate: false` is the default; a
 * submit function can still pass `navigate: true` to `update()`. Redirects are followed either
 * way.
 */
export function enhance(form: HTMLFormElement, submit?: SubmitFunction) {
	return kitEnhance(form, async (input) => {
		const callback = await submit?.(input);
		return async (options) => {
			const update: typeof options.update = (opts) => options.update({ navigate: false, ...opts });
			if (callback) await callback({ ...options, update });
			else await update();
		};
	});
}
