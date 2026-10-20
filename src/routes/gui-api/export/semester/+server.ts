import { error } from '@sveltejs/kit';
import { exportFileName, exportSheets } from '$lib/export';
import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';
import { workbook } from '$lib/server/export';
import { toRefusal } from '$lib/server/graphqlError';
import type { RequestHandler } from './$types';

/**
 * Everything the export shows, in one request — and therefore one entry in the access log, under
 * this operation's name.
 *
 * `assignments` goes through the backend's visibility filter like on every screen; that filter is
 * the reason the export lives here rather than in a query of its own. Deliberately no `wishes`.
 */
const ExportDocument = graphql(`
	query ExportSemester($semester: String!) {
		semester(code: $semester) {
			code
			assignmentsPublishedAt
		}
		courseInstances(semester: $semester) {
			id
			track
			programmeSemester
			note
			delivery
			taughtInEnglish
			topic
			programme {
				code
			}
			module {
				name
				zpaId
				subjectGroup {
					code
				}
			}
			parts {
				id
				kind
				position
				teachingHours
				sharedAcrossTracks
				dividedFrom
				taughtBy
			}
			coveredBy {
				acceptedAt
				instance {
					id
					track
					programmeSemester
					programme {
						code
					}
				}
			}
			covers {
				acceptedAt
				instance {
					id
					track
					programmeSemester
					programme {
						code
					}
				}
			}
		}
		assignments(semester: $semester) {
			note
			assignee {
				name
			}
			part {
				id
			}
		}
		teachingLoad(semester: $semester) {
			programme {
				code
				title
				planningStatus
			}
			teachingHours
			ownHours
			instanceCount
			fwpInstanceCount
			fwpHours
			partsWithoutHours
			externalHours
			shares {
				homeProgramme {
					code
					title
				}
				teachingHours
				instanceCount
			}
			yearlyQuota
			semesterQuota
			balance
		}
	}
`);

/** The spelling the backend accepts; anything else is refused before it costs a request. */
const SEMESTER_CODE = /^\d{4}-(WS|SS)$/;

/**
 * The planning of one semester as an `.xlsx` file, for whoever wants to keep working in a
 * spreadsheet.
 *
 * A GET under `/gui-api/` like every read this app proxies, so that a plain link downloads it —
 * in production, in `pnpm dev` and under Playwright alike, with the identity relayed by the same
 * hook as every page. Not cached: a planning snapshot that a proxy serves to the next person is
 * somebody else's view of the assignments.
 */
export const GET: RequestHandler = async ({ url }) => {
	const semester = url.searchParams.get('semester') ?? '';
	if (!SEMESTER_CODE.test(semester)) error(400, 'Kein gültiges Semester angegeben.');

	let data;
	try {
		data = await backendRequest(ExportDocument, { semester });
	} catch (err) {
		error(403, toRefusal(err).message);
	}

	const body = await workbook(
		exportSheets({
			semester,
			assignmentsPublishedAt: data.semester.assignmentsPublishedAt,
			instances: data.courseInstances,
			assignments: data.assignments,
			load: data.teachingLoad,
			exportedAt: new Date()
		})
	);

	return new Response(new Uint8Array(body), {
		headers: {
			'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
			'Content-Disposition': `attachment; filename="${exportFileName(semester)}"`,
			'Cache-Control': 'private, no-store'
		}
	});
};
