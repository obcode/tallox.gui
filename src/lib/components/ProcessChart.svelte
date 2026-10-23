<script lang="ts">
	import type { PlanningState } from '$lib/planning';
	import { CHART_LANES, LANE_LABELS, processChart } from '$lib/processChart';

	let { planning }: { planning: PlanningState } = $props();

	const phases = $derived(processChart(planning));
</script>

<!--
	Phases as columns, roles as lanes. From lg the lanes line up across the columns through
	subgrid, with the role named once on the left; below that every phase is a card of its own
	and names the role in each cell instead. The cell label stays in the markup at lg for screen
	readers, which read the chart phase by phase and never see the column on the left.

	The current phase keeps the neutral header: primary on primary-content at this size reaches
	4.13:1 on winter and corporate. The badge and the outlined boxes mark it instead.
-->
<div
	class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-[minmax(0,6.5rem)_repeat(6,minmax(0,1fr))] lg:grid-rows-[auto_repeat(4,auto)] lg:gap-x-1.5 lg:gap-y-0"
>
	<div class="hidden lg:row-span-5 lg:grid lg:grid-rows-subgrid" aria-hidden="true">
		<div></div>
		{#each CHART_LANES as lane (lane)}
			<div class="border-base-300 border-t py-2 pr-2 text-xs font-medium">
				{LANE_LABELS[lane]}
			</div>
		{/each}
	</div>

	{#each phases as phase (phase.column)}
		<section
			class="border-base-300 flex flex-col gap-2 rounded-lg border p-3 lg:row-span-5 lg:grid lg:grid-rows-subgrid lg:gap-0 lg:rounded-none lg:border-0 lg:p-0"
			aria-labelledby="phase-{phase.column}"
		>
			<div class="flex flex-col gap-1 lg:pb-2">
				<h3
					id="phase-{phase.column}"
					class="rounded px-2 py-1 text-sm font-semibold lg:rounded-none lg:pr-4 lg:pl-4 lg:[clip-path:polygon(0_0,calc(100%-0.6rem)_0,100%_50%,calc(100%-0.6rem)_100%,0_100%,0.6rem_50%)] bg-neutral text-neutral-content"
				>
					{phase.label}
				</h3>
				{#if phase.current}
					<span class="badge badge-primary badge-sm">hier stehen wir</span>
				{/if}
				<p class="text-base-content/80 text-xs hyphens-auto">{phase.hint}</p>
			</div>

			{#each phase.cells as cell (cell.lane)}
				<div
					class="border-base-300 flex-col gap-1 lg:flex lg:border-t lg:py-2 {cell.steps.length
						? 'flex'
						: 'hidden'}"
				>
					{#if cell.steps.length}
						<p class="text-xs font-medium lg:sr-only">{LANE_LABELS[cell.lane]}</p>
						<ul class="flex flex-col gap-1">
							{#each cell.steps as step (step.number)}
								<li>
									<a
										class="bg-base-100 hover:border-primary flex gap-1.5 rounded border px-1.5 py-1 text-xs hyphens-auto {phase.current
											? 'border-primary'
											: 'border-base-300'}"
										href="#schritt-{step.number}"
									>
										<span class="font-semibold">{step.number}</span>
										<span class="flex flex-col items-start gap-0.5">
											{step.title}
											{#if step.oneWay}
												<span class="badge badge-warning badge-xs">nicht umkehrbar</span>
											{/if}
										</span>
									</a>
								</li>
							{/each}
						</ul>
					{/if}
				</div>
			{/each}
		</section>
	{/each}
</div>
