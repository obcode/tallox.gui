/**
 * The rendered body of an announcement, checked before it becomes markup on the page.
 *
 * `Announcement.bodyHtml` is produced by the backend's small Markdown (`internal/mail`), which
 * escapes everything and then turns a handful of patterns back into tags. This app shows it with
 * `{@html}` — the one place it does, against the rule `$lib/schemaDoc` states, because an
 * announcement is written to be read formatted and the mail already shows it so.
 *
 * Not trusting that alone: every tag in the string must be one of exactly those the renderer
 * emits, with exactly its attributes. Anything else — a newer backend with a tag this list does
 * not know, or a renderer bug — answers null, and the page falls back to the plain text. Wrong in
 * the safe direction: an announcement shown without formatting is still an announcement.
 */

const TAG = /<[^>]*>/g;
const ALLOWED =
	/^<\/?(?:p|ul|ol|li|strong|a)>$|^<br>$|^<a href="(?:https?:\/\/|mailto:)[^"<>\s]*" rel="noopener noreferrer">$/;

/** The fragment if every tag in it is one the renderer emits, otherwise null. */
export function safeFragment(html: string | null | undefined): string | null {
	if (!html) return null;
	for (const tag of html.match(TAG) ?? []) {
		if (tag === '<a>' || !ALLOWED.test(tag)) return null;
	}
	// A stray angle bracket outside a tag means something was not escaped.
	if (html.replace(TAG, '').includes('<')) return null;
	return html;
}
