import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type {
	NotificationDelivery,
	NotificationKind,
	NotificationTargetSet
} from '$lib/gql/__generated__/graphql';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

/**
 * My mail subscriptions.
 *
 * In the account area: a subscription is a statement about myself, made by myself, and the backend
 * takes its owner from the session — there is no argument that could name somebody else. Nothing
 * here is subscribed without a click; the "recommended" set is an offer, and the list starts
 * empty.
 */
const NotificationsDocument = graphql(`
	query MyNotifications {
		me {
			mail
		}
		myNotificationSubscriptions {
			id
			kind
			semester
			targetSet
			delivery
			createdAt
			module {
				id
				name
				homeProgrammeCode
			}
			programme {
				code
				title
			}
			subjectGroup {
				id
				name
			}
		}
		myNotificationSettings {
			pausedUntil
		}
		programmes {
			code
			title
		}
		subjectGroups {
			id
			name
		}
		semesters {
			code
		}
		planningSemester {
			code
		}
	}
`);

const SubscribeDocument = graphql(`
	mutation SubscribeNotification($input: NotificationSubscriptionInput!) {
		subscribeNotification(input: $input) {
			id
		}
	}
`);

const RecommendedDocument = graphql(`
	mutation SubscribeRecommendedNotifications {
		subscribeRecommendedNotifications {
			id
		}
	}
`);

const DeliveryDocument = graphql(`
	mutation SetNotificationDelivery($id: ID!, $delivery: NotificationDelivery!) {
		setNotificationDelivery(id: $id, delivery: $delivery) {
			id
			delivery
		}
	}
`);

const UnsubscribeDocument = graphql(`
	mutation UnsubscribeNotification($id: ID!) {
		unsubscribeNotification(id: $id)
	}
`);

const PauseDocument = graphql(`
	mutation PauseNotifications($until: Date) {
		pauseNotifications(until: $until) {
			pausedUntil
		}
	}
`);

export const load: PageServerLoad = async () => {
	try {
		const data = await backendRequest(NotificationsDocument);
		return {
			mail: data.me?.mail ?? '',
			subscriptions: data.myNotificationSubscriptions,
			pausedUntil: data.myNotificationSettings.pausedUntil ?? null,
			programmes: data.programmes,
			subjectGroups: data.subjectGroups,
			semesters: data.semesters.map((s) => s.code),
			planningSemester: data.planningSemester?.code ?? null
		};
	} catch (err) {
		error(403, toRefusal(err).message);
	}
};

function text(form: FormData, name: string): string | undefined {
	const v = String(form.get(name) ?? '').trim();
	return v === '' ? undefined : v;
}

export const actions: Actions = {
	/**
	 * One subscription. The target arrives as one field, `target`, because the form offers one
	 * choice: „alle“, a programme, a subject group or a set of my own rows — never two at once,
	 * which the backend would refuse anyway.
	 */
	subscribe: async ({ request }) => {
		const form = await request.formData();
		const kind = text(form, 'kind') as NotificationKind | undefined;
		if (!kind)
			return fail(400, { code: 'SUBSCRIPTION_INVALID', message: 'Bitte ein Ereignis wählen.' });

		const [targetType, targetValue] = (text(form, 'target') ?? 'ALL:').split(':');
		const input: {
			kind: NotificationKind;
			semester?: string;
			programme?: string;
			subjectGroupId?: string;
			targetSet?: NotificationTargetSet;
			delivery: NotificationDelivery;
		} = {
			kind,
			semester: text(form, 'semester'),
			delivery: text(form, 'delivery') === 'DAILY' ? 'DAILY' : 'IMMEDIATE'
		};
		if (targetType === 'PROGRAMME') input.programme = targetValue;
		if (targetType === 'SUBJECT_GROUP') input.subjectGroupId = targetValue;
		if (targetType === 'SET') input.targetSet = targetValue as NotificationTargetSet;

		try {
			await backendRequest(SubscribeDocument, { input });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { subscribed: true };
	},

	recommended: async () => {
		try {
			await backendRequest(RecommendedDocument);
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { recommended: true };
	},

	delivery: async ({ request }) => {
		const form = await request.formData();
		const id = text(form, 'id');
		const delivery: NotificationDelivery =
			text(form, 'delivery') === 'DAILY' ? 'DAILY' : 'IMMEDIATE';
		if (!id)
			return fail(400, { code: 'SUBSCRIPTION_NOT_FOUND', message: 'Dieses Abo gibt es nicht.' });
		try {
			await backendRequest(DeliveryDocument, { id, delivery });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { delivery: true };
	},

	unsubscribe: async ({ request }) => {
		const form = await request.formData();
		const id = text(form, 'id');
		if (!id)
			return fail(400, { code: 'SUBSCRIPTION_NOT_FOUND', message: 'Dieses Abo gibt es nicht.' });
		try {
			await backendRequest(UnsubscribeDocument, { id });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { unsubscribed: true };
	},

	/** Pause until a day, or — with no day — resume. */
	pause: async ({ request }) => {
		const form = await request.formData();
		const until = form.get('resume') ? undefined : text(form, 'until');
		try {
			await backendRequest(PauseDocument, { until: until ?? null });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { paused: true };
	}
};
