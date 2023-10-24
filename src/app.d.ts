// See https://kit.svelte.dev/docs/types#app
// for information about these interfaces
// and what to do when importing types
declare namespace App {
	// interface Locals {}
	// interface PageData {}
	// interface Error {}
	// interface Platform {}
}

interface CoursePeriod {
	day: number | null;
	period: number | null;
}
interface CourseGroup {
	group: number | null;
	teacher: string;
	periods: CoursePeriod[];
	course?: string;
}
interface Course {
	name: string;
	groups: CourseGroup[];
}
interface Table {
	courses: Map<CoursePeriod, CourseGroup>;
	days?: number;
	hours?: number;
}
