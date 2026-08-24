import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { AccessDoor } from '$lib/gql/__generated__/graphql';
import { windowDays } from '$lib/access';

const AccessLogDocument = graphql(`
	query AccessLog($filter: AccessLogFilter, $limit: Int!, $before: ID) {
		accessLog(filter: $filter, limit: $limit, before: $before) {
			id
			at
			personId
			personName
			mail
			door
			tokenId
			roles
			narrowedFrom
			operation
			fields
			mutation
			outcome
			errorCode
			durationMs
			sourceIp
		}
	}
`);

const AccessSummaryDocument = graphql(`
	query AccessSummary($from: Time!, $until: Time!) {
		accessSummary(from: $from, until: $until) {
			from
			until
			counts {
				total
				interactive
				token
				mutations
				errors
				refusedAuth
				refusedScope
				refusedInteractive
				people
			}
			roles {
				role
				operations
			}
			refused {
				mail
				tokenId
				reason
				door
				attempts
				lastAt
			}
			mutations {
				mail
				field
				calls
				lastAt
			}
		}
	}
`);

/** How many entries one page shows. */
const PAGE_SIZE = 100;

/**
 * The access log, for the administration.
 *
 * Both fields are `@interactiveOnly` — through a Personal Access Token they answer `null`, so
 * the API console under /api-doku cannot show them and this page is the only way to read the
 * log in production. That is the rule this repository writes down as "a field marked
 * @interactiveOnly needs a page here, or it does not exist".
 *
 * Every filter is a URL parameter rather than form state: the thing one does with a finding
 * here is paste a link into a support reply, and a page that cannot be linked to is a page that
 * gets described in prose instead.
 *
 * The summary is over the whole window and the entries are one page of it. They are two
 * queries for that reason and not out of tidiness — a count computed from the page would be a
 * count of the page, which is the sort of figure that gets quoted in a meeting.
 */
export const load: PageServerLoad = async ({ url }) => {
	const days = windowDays(url.searchParams.get('zeitraum'));
	const until = new Date();
	const from = new Date(until.getTime() - days * 24 * 60 * 60 * 1000);

	const mail = (url.searchParams.get('person') ?? '').trim();
	const door = (url.searchParams.get('tuer') ?? '') as AccessDoor | '';
	const onlyRefused = url.searchParams.get('nur') === 'auffaellig';
	const onlyMutations = url.searchParams.get('nur') === 'aenderungen';
	const before = url.searchParams.get('weiter');

	const filter = {
		mail: mail === '' ? null : mail,
		door: door === '' ? null : door,
		onlyRefused,
		onlyMutations,
		from: from.toISOString(),
		until: until.toISOString()
	};

	try {
		// Sequential rather than concurrent on purpose: both go through the same SSR hop with the
		// same relayed identity, and two in flight would double the load a support question puts
		// on the database for a page nobody is waiting on.
		const summary = await backendRequest(AccessSummaryDocument, {
			from: from.toISOString(),
			until: until.toISOString()
		});
		const page = await backendRequest(AccessLogDocument, {
			filter,
			limit: PAGE_SIZE,
			before
		});

		const entries = page.accessLog ?? [];
		return {
			days,
			mail,
			door,
			only: url.searchParams.get('nur') ?? '',
			summary: summary.accessSummary ?? null,
			entries,
			// The cursor for the next page, or null when this one is the last. "A full page" is
			// how one knows there may be more; asking for one extra row to find out would be a
			// row read on every page load to answer a question the button already answers.
			next: entries.length === PAGE_SIZE ? entries[entries.length - 1].id : null
		};
	} catch (err) {
		error(403, toRefusal(err).message);
	}
};
