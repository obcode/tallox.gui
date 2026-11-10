import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import { audienceInput } from '$lib/notifications';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

/**
 * Announcements: the ones I received or sent, and — for those who lead the planning — a new one.
 *
 * Who may write to whom is the backend's `policy.MaySendAnnouncement`; `announcementAudiences`
 * lists exactly those, and a page that offers nothing else cannot be talked into more. Sending
 * and previewing are `@interactiveOnly`: this page is the only way to them, which is why it exists.
 */
const AnnouncementsDocument = graphql(`
	query Announcements {
		announcements {
			id
			subject
			body
			sentAt
			recipientCount
			sender {
				id
				name
				mail
			}
			audience {
				kind
				semester
				subjectGroup {
					id
					name
				}
				programme {
					code
					title
				}
			}
		}
		announcementAudiences {
			kind
			semester
			subjectGroup {
				id
				name
			}
			programme {
				code
				title
			}
		}
		me {
			id
		}
	}
`);

const PreviewDocument = graphql(`
	query PreviewAnnouncement(
		$audience: AnnouncementAudienceInput!
		$subject: String!
		$body: String!
	) {
		previewAnnouncement(audience: $audience, subject: $subject, body: $body) {
			subject
			html
			recipientCount
		}
	}
`);

const SendDocument = graphql(`
	mutation SendAnnouncement(
		$audience: AnnouncementAudienceInput!
		$subject: String!
		$body: String!
	) {
		sendAnnouncement(audience: $audience, subject: $subject, body: $body) {
			id
			recipientCount
		}
	}
`);

export const load: PageServerLoad = async () => {
	try {
		const data = await backendRequest(AnnouncementsDocument);
		return {
			announcements: data.announcements,
			audiences: data.announcementAudiences,
			me: data.me?.id ?? null
		};
	} catch (err) {
		error(403, toRefusal(err).message);
	}
};

async function read(request: Request) {
	const form = await request.formData();
	const audienceKey = String(form.get('audience') ?? '');
	return {
		audienceKey,
		audience: audienceInput(audienceKey),
		subject: String(form.get('subject') ?? ''),
		body: String(form.get('body') ?? '')
	};
}

export const actions: Actions = {
	/** Render it as it would go out, and say how many it would reach. Sends nothing. */
	preview: async ({ request }) => {
		const draft = await read(request);
		if (!draft.audience) {
			return fail(400, {
				...draft,
				code: 'AUDIENCE_NOT_ALLOWED',
				message: 'Bitte eine Gruppe wählen.'
			});
		}
		try {
			const data = await backendRequest(PreviewDocument, {
				audience: draft.audience,
				subject: draft.subject,
				body: draft.body
			});
			return { ...draft, preview: data.previewAnnouncement };
		} catch (err) {
			return fail(400, { ...draft, ...toRefusal(err) });
		}
	},

	send: async ({ request }) => {
		const draft = await read(request);
		if (!draft.audience) {
			return fail(400, {
				...draft,
				code: 'AUDIENCE_NOT_ALLOWED',
				message: 'Bitte eine Gruppe wählen.'
			});
		}
		try {
			const data = await backendRequest(SendDocument, {
				audience: draft.audience,
				subject: draft.subject,
				body: draft.body
			});
			return { sent: data.sendAnnouncement.recipientCount ?? 0 };
		} catch (err) {
			return fail(400, { ...draft, ...toRefusal(err) });
		}
	}
};
