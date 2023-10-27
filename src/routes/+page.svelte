<script lang="ts">
	import { isCourse } from '$lib/index';
	import type { PageData } from './$types';
	export let data: PageData;

	function getEmptyPeriod(): CoursePeriod {
		return {
			day: null,
			period: null
		};
	}
	function getEmptyGroup(): CourseGroup {
		return {
			group: null,
			periods: [getEmptyPeriod()],
			teacher: ''
		};
	}
	function getEmptyCourse(): Course {
		return {
			name: '',
			groups: [getEmptyGroup()]
		};
	}
	function handleCoursesDataInput(event: Event) {
		const target = event.target as HTMLTextAreaElement;
		const value = target.value;
		try {
			courses = JSON.parse(value);
			validCoursesData = courses.every(isCourse);
		} catch (error) {
			console.error(error);
			validCoursesData = false;
		}
	}
	function handleCoursesInput(event: Event, index: number, property: keyof Course) {
		// @ts-ignore
		courses[index][property] = (event.target as HTMLInputElement).value;

		courses = [...courses];

		if (index === courses.length - 1 && courses[index][property] !== getEmptyCourse()[property]) {
			courses = [...courses, getEmptyCourse()];
		} else if (index < courses.length - 1 && !courses[index][property]) {
			courses = courses.filter((_, i) => i !== index);
		}
	}
	function handleGroupsInput(
		event: Event,
		courseIndex: number,
		groupIndex: number,
		property: keyof CourseGroup
	) {
		// @ts-ignore
		courses[courseIndex].groups[groupIndex][property] = (event.target as HTMLInputElement).value;
		courses[courseIndex].groups[groupIndex].course = courses[courseIndex].name;

		courses = [...courses];

		if (
			groupIndex === courses[courseIndex].groups.length - 1 &&
			courses[courseIndex].groups[groupIndex][property] !== getEmptyGroup()[property]
		) {
			courses[courseIndex].groups = [...courses[courseIndex].groups, getEmptyGroup()];
		} else if (
			groupIndex < courses[courseIndex].groups.length - 1 &&
			!courses[courseIndex].groups[groupIndex][property]
		) {
			courses[courseIndex].groups = courses[courseIndex].groups.filter((_, i) => i !== groupIndex);
		}
	}
	function handlePeriodsInput(
		event: Event,
		courseIndex: number,
		groupIndex: number,
		periodIndex: number,
		property: keyof CoursePeriod
	) {
		// @ts-ignore
		courses[courseIndex].groups[groupIndex].periods[periodIndex][property] = (
			event.target as HTMLInputElement
		).value;

		courses = [...courses];

		if (
			periodIndex === courses[courseIndex].groups[groupIndex].periods.length - 1 &&
			courses[courseIndex].groups[groupIndex].periods[periodIndex][property] !==
				getEmptyPeriod()[property]
		) {
			courses[courseIndex].groups[groupIndex].periods = [
				...courses[courseIndex].groups[groupIndex].periods,
				getEmptyPeriod()
			];
		} else if (
			periodIndex < courses[courseIndex].groups[groupIndex].periods.length - 1 &&
			!courses[courseIndex].groups[groupIndex].periods[periodIndex][property]
		) {
			courses[courseIndex].groups[groupIndex].periods = courses[courseIndex].groups[
				groupIndex
			].periods.filter((_, i) => i !== periodIndex);
		}
	}

	function generateTables(courses: Course[]): Table[] {
		let result: Table[] = [];

		function backtrack(remainingCourses: Course[], currentTable: Table) {
			// If we've gone through all courses, push the current table to the result
			if (remainingCourses.length === 0) {
				result.push(currentTable);
				return;
			}

			const [firstCourse, ...restCourses] = remainingCourses;

			for (const group of firstCourse.groups) {
				// Clone current table and add the new group to its courses
				const newTable = {
					...currentTable,
					courses: currentTable.courses.concat([group])
				};

				backtrack(restCourses, newTable);
			}
		}

		backtrack(courses, { courses: [] });

		// remove tables with no groups
		result.forEach((table) => {
			table.courses = table.courses.filter((course) => course.group);
		});
		// remove tables with not enough courses
		result = result.filter((table) => {
			return table.courses.length >= courses.length - 1;
		});
		// remove tables with duplicate periods
		result = result.filter((table) => {
			let periods: string[] = [];
			for (let i = 0; i < table.courses.length; i++) {
				for (let j = 0; j < table.courses[i].periods.length; j++) {
					const period = table.courses[i].periods[j];
					if (period.day && period.period) {
						const periodString = `${period.day}-${period.period}`;
						if (periods.includes(periodString)) {
							return false;
						} else {
							periods.push(periodString);
						}
					}
				}
			}
			return true;
		});
		// calculate days and hours for each table
		result.forEach((table) => {
			let days: number[] = [];
			let minPeriod = new Map<number, number>();
			let maxPeriod = new Map<number, number>();
			for (let i = 0; i < table.courses.length; i++) {
				for (let j = 0; j < table.courses[i].periods.length; j++) {
					const period = table.courses[i].periods[j];
					if (period.day && period.period) {
						if (!days.includes(period.day)) {
							days.push(period.day);
						}

						if (minPeriod.has(period.day)) {
							minPeriod.set(period.day, Math.min(minPeriod.get(period.day)!, period.period));
						} else {
							minPeriod.set(period.day, period.period);
						}
						if (maxPeriod.has(period.day)) {
							maxPeriod.set(period.day, Math.max(maxPeriod.get(period.day)!, period.period));
						} else {
							maxPeriod.set(period.day, period.period);
						}
					}
				}
			}
			table.days = days.length;
			table.hours = 0;
			for (const [day, min] of minPeriod) {
				table.hours += maxPeriod.get(day)! - min + 1;
			}
		});
		// order by less days then less hours
		result = result.sort((a, b) => {
			return a.days! - b.days! ? a.days! - b.days! : a.hours! - b.hours!;
		});

		return result;
	}

	function periodExist(group: CourseGroup, day: number, period: number) {
		for (let i = 0; i < group.periods.length; i++) {
			const groupPeriod = group.periods[i];
			if (groupPeriod.day == day && groupPeriod.period == period) {
				return true;
			}
		}
		return false;
	}

	function getMaxPeriod(table: Table) {
		let max = 0;
		for (let i = 0; i < table.courses.length; i++) {
			for (let j = 0; j < table.courses[i].periods.length; j++) {
				const period = table.courses[i].periods[j];
				if (period.day && period.period) {
					max = Math.max(max, period.period);
				}
			}
		}
		return max;
	}
	function getMinPeriod(table: Table) {
		let min = Infinity;
		for (let i = 0; i < table.courses.length; i++) {
			for (let j = 0; j < table.courses[i].periods.length; j++) {
				const period = table.courses[i].periods[j];
				if (period.day && period.period) {
					min = Math.min(min, period.period);
				}
			}
		}
		return min;
	}

	const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
	let courses: Course[] = data.searchParams.get('courses')
		? JSON.parse(data.searchParams.get('courses')!)
		: [getEmptyCourse()];
	let validCoursesData = true;
	let tables: Table[] = [];

	$: tables = generateTables(courses);
</script>

<main class="container h-full mx-auto p-responsive">
	<!---------------- Hero ---------------->
	<div class="max-w-fit space-y-5 mx-auto">
		<h1 class="h1">Term courses tables generator!</h1>
		<p class="w-fit text-start">Generate all the possible tables for your term's courses!</p>
	</div>
	<br />
	<!---------------- Courses' Data ---------------->
	<section>
		<label class="label">
			<div class="flex flex-row justify-between">
				<span>Courses' Data</span>
				<span class="">
					<button
						class="btn btn-sm variant-glass-secondary"
						disabled={!validCoursesData}
						on:click={() => navigator.clipboard.writeText(JSON.stringify(courses, null, 2))}
					>
						Copy
					</button>
					<button
						class="btn btn-sm variant-glass-secondary"
						on:click={() => {
							navigator.clipboard.readText().then((text) => {
								try {
									courses = JSON.parse(text);
									validCoursesData = courses.every(isCourse);
								} catch (error) {
									console.error(error);
									validCoursesData = false;
								}
							});
						}}>Paste</button
					>
				</span>
			</div>
			<textarea
				class="textarea variant-form-material"
				rows="2"
				on:input={handleCoursesDataInput}
				class:!input-error={!validCoursesData}>{JSON.stringify(courses, null, 2)}</textarea
			>
		</label>
	</section>
	<br />
	<!---------------- Data Input Form ---------------->
	<section class="space-y-4">
		{#each courses as course, i}
			<div class="grid grid-cols-3 gap-2">
				<input
					placeholder="Course Name"
					type="text"
					class="col-span-1 input variant-form-material"
					bind:value={course.name}
					on:input={(e) => handleCoursesInput(e, i, 'name')}
				/>
				<div class="col-span-2 space-y-4">
					{#each course.groups as group, j}
						<div class="grid grid-cols-2 gap-2">
							<input
								placeholder="Group Number"
								type="number"
								class="input variant-form-material"
								bind:value={group.group}
								on:input={(e) => handleGroupsInput(e, i, j, 'group')}
							/>
							<input
								placeholder="Teacher"
								type="text"
								class="input variant-form-material"
								bind:value={group.teacher}
								on:input={(e) => handleGroupsInput(e, i, j, 'teacher')}
							/>
							<div>
								{#each group.periods as period, k}
									<div class="grid grid-cols-2 gap-2">
										<select
											class="select variant-form-material"
											bind:value={period.day}
											on:input={(e) => handlePeriodsInput(e, i, j, k, 'day')}
										>
											<option value={null}>Day</option>
											<option value="1">Sunday</option>
											<option value="2">Monday</option>
											<option value="3">Tuesday</option>
											<option value="4">Wednesday</option>
											<option value="5">Thursday</option>
										</select>
										<select
											class="select variant-form-material"
											bind:value={period.period}
											on:input={(e) => handlePeriodsInput(e, i, j, k, 'period')}
										>
											<option value={null}>Period</option>
											<option value="1">1</option>
											<option value="2">2</option>
											<option value="3">3</option>
											<option value="4">4</option>
											<option value="5">5</option>
											<option value="6">6</option>
											<option value="7">7</option>
											<option value="8">8</option>
											<option value="9">9</option>
											<option value="10">10</option>
											<option value="11">11</option>
											<option value="12">12</option>
										</select>
									</div>
								{/each}
							</div>
						</div>
					{/each}
				</div>
			</div>
		{/each}
	</section>
	<br />
	<!---------------- Generate button ---------------->
	<!-- <section>
		<button
			class="btn w-full variant-glass-surface"
			disabled={!validCoursesData}
			on:click={() => populateTables(courses)}
		>
			Generate
		</button>
	</section>
	<br /> -->
	<!---------------- Auto Generated Tables ---------------->
	<section class="space-y-4">
		{#if tables.length > 0 && tables[0].courses.length > 0}
			{#each tables as table, tableIndex}
				{@const maxPeriod = getMaxPeriod(table)}
				<div class="overflow-x-auto">
					<table class="table">
						<thead>
							<tr>
								<th />
								{#each days as day}
									<th>{day}</th>
								{/each}
							</tr>
						</thead>
						<tbody>
							{#each Array(maxPeriod).fill(null) as _, periodIndex}
								<tr>
									<th>{periodIndex + 1}</th>
									{#each days as _, dayIndex}
										<td class="text-center">
											{#each table.courses as group}
												{#if periodExist(group, dayIndex + 1, periodIndex + 1)}
													{group.course}
												{/if}
											{/each}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
						<tfoot>
							<tr>
								<th colspan="6">Table #{tableIndex + 1}, {table.days} days, {table.hours} hours</th>
							</tr>
						</tfoot>
					</table>
				</div>
				<hr />
			{/each}
		{:else}
			<div class="flex flex-col items-center justify-center space-y-4">
				<span class="text-sm">No tables to show</span>
			</div>
		{/if}
	</section>
	<br />
</main>

<!-- 
interface CoursePeriod {
	day: number | null;
	period: number | null;
}
interface CourseGroup {
	group: number | null;
	teacher: string;
	periods: CoursePeriod[];
}
interface Course {
	name: string;
	groups: CourseGroup[];
}
-->
