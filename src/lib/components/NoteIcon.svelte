<script lang="ts">
	/**
	 * The mark that says "this is a comment": a speech bubble with lines of text in it.
	 *
	 * One place for the path, because it stands wherever a planner's note is shown or typed —
	 * and two drawings of "a comment" would be two things to the eye. Decorative: every use
	 * puts the word beside it for a screen reader, so the icon itself is hidden from one.
	 *
	 * chat-bubble-bottom-center-text, outline, from Heroicons (MIT, Tailwind Labs).
	 */
	let { class: className = '' }: { class?: string } = $props();
</script>

<svg
	aria-hidden="true"
	class={className}
	xmlns="http://www.w3.org/2000/svg"
	fill="none"
	viewBox="0 0 24 24"
	stroke-width="1.5"
	stroke="currentColor"
>
	<path
		stroke-linecap="round"
		stroke-linejoin="round"
		d="M7.5 8.25h9m-9 3H12m-9.75 1.51c0 1.6 1.123 2.994 2.707 3.227 1.087.16 2.185.283 3.293.369V21l4.076-4.076a1.526 1.526 0 0 1 1.037-.443 48.282 48.282 0 0 0 5.68-.494c1.584-.233 2.707-1.626 2.707-3.228V6.741c0-1.602-1.123-2.995-2.707-3.228A48.394 48.394 0 0 0 12 3c-2.392 0-4.744.175-7.043.513C3.373 3.746 2.25 5.14 2.25 6.741v6.018Z"
	/>
</svg>
