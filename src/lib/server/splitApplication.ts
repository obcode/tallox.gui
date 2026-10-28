import { graphql } from '$lib/gql/__generated__';
import { backendRequest } from '$lib/server/backend';

/**
 * Carrying a module's split over to its existing instances, for every page that offers it.
 *
 * The module page offers it next to the split editor, and the demand page right after a split
 * was changed from a row, and wherever a row's stored parts have drifted from the split. Both
 * call the one backend mutation — what is carried over, what stays and who may are rules of
 * `applyModuleSplitToInstances` and `policy.MayWriteModuleSplit`, not of either page.
 */
const ApplySplitDocument = graphql(`
	mutation ApplyModuleSplitToInstances($moduleId: ID!, $dryRun: Boolean!) {
		applyModuleSplitToInstances(moduleId: $moduleId, dryRun: $dryRun) {
			dryRun
			unchanged
			changed {
				instance {
					id
					semester
					track
					programmeSemester
					programme {
						code
					}
				}
				teachingHoursBefore
				teachingHoursAfter
			}
			refused {
				instance {
					id
					semester
					track
					programmeSemester
					programme {
						code
					}
				}
				kind
				code
				message
			}
		}
	}
`);

/** Carry the split over — `dryRun` for the preview, which is the same transaction rolled back. */
export async function applyModuleSplit(moduleId: string, dryRun: boolean) {
	const data = await backendRequest(ApplySplitDocument, { moduleId, dryRun });
	return data.applyModuleSplitToInstances;
}

/**
 * What carrying the split over would do, or `null` where there is nothing to ask about.
 *
 * Asked right after a split is saved, so the person sees in the same moment that the existing
 * instances did not change with it. A refusal here is no reason to spoil a save that worked: the
 * split is stored, and asking for the preview again shows the refusal there.
 */
export async function previewModuleSplit(moduleId: string) {
	try {
		return await applyModuleSplit(moduleId, true);
	} catch {
		return null;
	}
}
