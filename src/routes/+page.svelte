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

	let courses: Course[] = data.searchParams.get('courses')
		? JSON.parse(data.searchParams.get('courses')!)
		: [getEmptyCourse()];
	let validCoursesData = true;

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

	function handleCoursesInput(event: Event, index: number, proprtey: keyof Course) {
		// @ts-ignore
		courses[index][proprtey] = (event.target as HTMLInputElement).value;

		courses = [...courses];

		if (index === courses.length - 1 && courses[index][proprtey] !== getEmptyCourse()[proprtey]) {
			courses = [...courses, getEmptyCourse()];
		} else if (index < courses.length - 1 && !courses[index][proprtey]) {
			courses = courses.filter((_, i) => i !== index);
		}
	}

	function handleGroupsInput(
		event: Event,
		courseIndex: number,
		groupIndex: number,
		proprtey: keyof CourseGroup
	) {
		// @ts-ignore
		courses[courseIndex].groups[groupIndex][proprtey] = (event.target as HTMLInputElement).value;

		courses = [...courses];

		if (
			groupIndex === courses[courseIndex].groups.length - 1 &&
			courses[courseIndex].groups[groupIndex][proprtey] !== getEmptyGroup()[proprtey]
		) {
			courses[courseIndex].groups = [...courses[courseIndex].groups, getEmptyGroup()];
		} else if (
			groupIndex < courses[courseIndex].groups.length - 1 &&
			!courses[courseIndex].groups[groupIndex][proprtey]
		) {
			courses[courseIndex].groups = courses[courseIndex].groups.filter((_, i) => i !== groupIndex);
		}
	}

	function handlePeriodsInput(
		event: Event,
		courseIndex: number,
		groupIndex: number,
		periodIndex: number,
		proprtey: keyof CoursePeriod
	) {
		// @ts-ignore
		courses[courseIndex].groups[groupIndex].periods[periodIndex][proprtey] = (
			event.target as HTMLInputElement
		).value;

		courses = [...courses];

		if (
			periodIndex === courses[courseIndex].groups[groupIndex].periods.length - 1 &&
			courses[courseIndex].groups[groupIndex].periods[periodIndex][proprtey] !==
				getEmptyPeriod()[proprtey]
		) {
			courses[courseIndex].groups[groupIndex].periods = [
				...courses[courseIndex].groups[groupIndex].periods,
				getEmptyPeriod()
			];
		} else if (
			periodIndex < courses[courseIndex].groups[groupIndex].periods.length - 1 &&
			!courses[courseIndex].groups[groupIndex].periods[periodIndex][proprtey]
		) {
			courses[courseIndex].groups[groupIndex].periods = courses[courseIndex].groups[
				groupIndex
			].periods.filter((_, i) => i !== periodIndex);
		}
	}

	function hasStringified(map: Map<CoursePeriod, CourseGroup>, period: CoursePeriod) {
		period = JSON.parse(JSON.stringify(period));
		period.day = parseInt(period.day as any);
		period.period = parseInt(period.period as any);
		let has = null;
		map.forEach((_, key) => {
			key = JSON.parse(JSON.stringify(key));
			key.day = parseInt(key.day as any);
			key.period = parseInt(key.period as any);
			if (JSON.stringify(key) === JSON.stringify(period)) {
				has = key;
			}
		});
		return has ?? false;
	}

	let tables: Table[] = [];

	function populateTables(courses: Course[]) {
		// Reset tables
		tables = [];

		// Populate groups with their courses
		courses.forEach((course) => {
			course.groups.forEach((group) => {
				group.course = course.name;
			});
		});

		// Make the first table using the first course
		const firstCourse = courses[0];

		firstCourse.groups.forEach((group) => {
			const table: Table = {
				courses: new Map<CoursePeriod, CourseGroup>()
			};

			group.periods.forEach((period) => {
				if (!period.day || !period.period) {
					return;
				}
				table.courses.set(period, group);
			});

			if (table.courses.size > 0) {
				tables.push(table);
			}
		});

		// Make the rest of the tables using the rest of the courses
		// by cloning the first table and adding the new course
		courses.slice(1).forEach((course) => {
			const clonedTables: Table[] = [];

			course.groups.forEach((group) => {
				tables.forEach((table) => {
					const clone: Table = {
						courses: new Map<CoursePeriod, CourseGroup>()
					};

					table.courses.forEach((group, period) => {
						clone.courses.set(period, group);
					});

					let conflict = false;

					group.periods.forEach((period) => {
						// skip anything that is null or undefined
						if (!period.day || !period.period) {
							return;
						}

						if (hasStringified(clone.courses, period)) {
							conflict = true;
						} else {
							clone.courses.set(period, group);
						}
					});

					if (!conflict && clone.courses.size) {
						clonedTables.push(clone);
					}
				});
			});

			tables = clonedTables;
		});

		tables = tables.filter((table) => table.courses.size >= courses.length - 1);

		// calculate the days and hours of each table

		tables.forEach((table) => {
			const days = new Set<number>();
			let daysPeriodsInterval: Map<number, [number, number]> = new Map();

			table.courses.forEach((_, period) => {
				days.add(period.day!);

				if (!daysPeriodsInterval.has(period.day!)) {
					daysPeriodsInterval.set(period.day!, [period.period!, period.period!]);
				} else {
					const interval = daysPeriodsInterval.get(period.day!)!;
					if (period.period! < interval[0]) {
						interval[0] = period.period!;
					}
					if (period.period! > interval[1]) {
						interval[1] = period.period!;
					}
				}
			});

			table.days = days.size;

			let hours = 0;

			daysPeriodsInterval.forEach((interval) => {
				hours += interval[1] - interval[0] + 1;
			});

			table.hours = hours;
		});

		tables = tables.sort((a, b) => {
			if (a.days! > b.days!) {
				return 1;
			} else if (a.days! < b.days!) {
				return -1;
			} else {
				if (a.hours! > b.hours!) {
					return 1;
				} else if (a.hours! < b.hours!) {
					return -1;
				} else {
					return 0;
				}
			}
		});
	}

	$: populateTables(courses);
	$: console.log(tables);

	function getGroup(table: Table, day: number, period: number): CourseGroup {
		let group = null;
		table.courses.forEach((g, p) => {
			if (p.day == day && p.period == period) {
				group = g;
			}
		});
		return group!;
	}
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
	<!---------------- Auto Generated Tables ---------------->
	<section class="space-y-4">
		{#if tables.length > 0 && tables[0].courses.size > 0}
			{#each tables as table, tableIndex}
				<div>
					<h4 class="h4 w-full text-center bg-surface-700 p-2">
						#{tableIndex}: {table.days} Days, {table.hours} Hours
					</h4>
					<table class="table variant-glass">
						<thead>
							<tr>
								<th>Sunday</th>
								<th>Monday</th>
								<th>Tuesday</th>
								<th>Wednesday</th>
								<th>Thursday</th>
							</tr>
						</thead>
						<tbody>
							{#each [...Array(12).keys()] as i}
								<tr>
									{#each [...Array(5).keys()] as j}
										<td class="contents-when-children">
											{#if getGroup(table, j + 1, i + 1)}
												{@const group = getGroup(table, j + 1, i + 1)}
												<div class="space-y-1 text-center bg-surface-600 text-surface-50 p-2">
													<span class="text-sm">{group.course}</span>
													<br />
													<span class="text-xs">g: {group.group}</span>
													<span class="text-xs">t: {group.teacher}</span>
												</div>
											{/if}
										</td>
									{/each}
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
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
