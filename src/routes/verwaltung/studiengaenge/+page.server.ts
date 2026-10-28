import { error, fail } from '@sveltejs/kit';
import { graphql } from '$lib/gql/__generated__';
import type { ProgrammeStatus } from '$lib/gql/__generated__/graphql';
import { parseDegreeParam } from '$lib/catalogue';
import { studyYearOf } from '$lib/controlling';
import { backendRequest } from '$lib/server/backend';
import { toRefusal } from '$lib/server/graphqlError';
import type { Actions, PageServerLoad } from './$types';

/**
 * Which study programmes this faculty plans.
 *
 * The examination office's catalogue holds every programme its regulations mention, and some of
 * them are not this faculty's business — either somebody else runs them, or they were ours and
 * have run out. The source cannot tell the two apart from the ones that are planned: the newest
 * regulations of two planned programmes are from 2010, older than every programme on the other
 * list. So it is a decision, and this is the screen it is taken on.
 */
const ProgrammesDocument = graphql(`
	query AllProgrammes {
		programmes(includeUnplanned: true) {
			code
			title
			active
			planningStatus
			degree
			spos {
				version
			}
		}
	}
`);

/**
 * The quotas of one study year, and the planning semester that decides which year that is.
 *
 * The year the faculty is planning, because that is the one somebody enters figures for; another
 * one is a `?studienjahr=` away.
 */
const QuotasDocument = graphql(`
	query ProgrammeQuotas($studyYear: Int!) {
		programmeQuotas(studyYear: $studyYear) {
			programme {
				code
			}
			teachingHours
		}
	}
`);

const PlanningSemesterDocument = graphql(`
	query QuotaPlanningSemester {
		planningSemester {
			code
		}
	}
`);

const SetQuotaDocument = graphql(`
	mutation SetProgrammeQuota($programme: String!, $studyYear: Int!, $teachingHours: Float) {
		setProgrammeQuota(programme: $programme, studyYear: $studyYear, teachingHours: $teachingHours) {
			teachingHours
		}
	}
`);

const SetStatusDocument = graphql(`
	mutation SetProgrammePlanningStatus($code: String!, $status: ProgrammeStatus!) {
		setProgrammePlanningStatus(code: $code, status: $status) {
			code
			planningStatus
		}
	}
`);

const SetDegreeDocument = graphql(`
	mutation SetProgrammeDegree($code: String!, $degree: Degree) {
		setProgrammeDegree(code: $code, degree: $degree) {
			code
			degree
		}
	}
`);

export const load: PageServerLoad = async ({ url }) => {
	try {
		const [data, planning] = await Promise.all([
			backendRequest(ProgrammesDocument),
			backendRequest(PlanningSemesterDocument)
		]);

		const asked = Number(url.searchParams.get('studienjahr'));
		const studyYear =
			Number.isInteger(asked) && asked > 0
				? asked
				: studyYearOf(planning.planningSemester?.code ?? '');

		// A year out of reach is refused by the backend; that costs the column, not the page.
		let quotas: Record<string, number> = {};
		if (studyYear !== null) {
			try {
				const q = await backendRequest(QuotasDocument, { studyYear });
				quotas = Object.fromEntries(
					q.programmeQuotas.map((r) => [r.programme.code, r.teachingHours])
				);
			} catch {
				quotas = {};
			}
		}
		return { programmes: data.programmes, studyYear, quotas };
	} catch (err) {
		// The list itself needs no particular role — the refusal here is "no account", which the
		// root layout already shows as its own page. What is scoped is the button.
		error(403, toRefusal(err).message);
	}
};

export const actions: Actions = {
	/**
	 * Record that this faculty plans a programme, or no longer does.
	 *
	 * A form action rather than a proxy: it belongs to this page and nothing else needs it, and
	 * as a form it works without JavaScript.
	 */
	setStatus: async ({ request }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '');
		const status = String(form.get('status') ?? '') as ProgrammeStatus;

		try {
			await backendRequest(SetStatusDocument, { code, status });
		} catch (err) {
			return fail(400, toRefusal(err));
		}
		return { changed: code };
	},

	/**
	 * Record whether a programme leads to a bachelor's or a master's; the empty choice takes it
	 * back. Read with the same function as the URL parameter, so anything unexpected becomes
	 * "not recorded" rather than a guess.
	 */
	setDegree: async ({ request }) => {
		const form = await request.formData();
		const code = String(form.get('code') ?? '');
		const degree = parseDegreeParam(String(form.get('degree') ?? ''));

		try {
			await backendRequest(SetDegreeDocument, { code, degree });
		} catch (err) {
			return fail(400, { ...toRefusal(err), programme: code });
		}
		return { changed: code };
	},

	/**
	 * Enter, correct or — with an empty field — take back a programme's quota for a study year.
	 *
	 * The field is read as German too: "212,5" is what somebody types. Text that is still not a
	 * number cannot even be sent as a Float, so it is turned back here; whether a number is a
	 * plausible quota is the backend's to decide (`QUOTA_INVALID`).
	 */
	setQuota: async ({ request }) => {
		const form = await request.formData();
		const programme = String(form.get('programme') ?? '');
		const studyYear = Number(form.get('studyYear'));
		const raw = String(form.get('hours') ?? '')
			.trim()
			.replace(',', '.');
		const teachingHours = raw === '' ? null : Number(raw);

		if (!Number.isInteger(studyYear)) {
			return fail(400, { message: 'Das Studienjahr muss eine ganze Zahl sein.', programme });
		}
		// isFinite rather than isNaN: `Infinity` is not NaN and would travel as a Float.
		if (teachingHours !== null && !Number.isFinite(teachingHours)) {
			return fail(400, { message: 'Das Kontingent muss eine Zahl sein.', programme });
		}
		try {
			await backendRequest(SetQuotaDocument, { programme, studyYear, teachingHours });
		} catch (err) {
			return fail(400, { ...toRefusal(err), programme });
		}
		return { changed: programme };
	}
};
