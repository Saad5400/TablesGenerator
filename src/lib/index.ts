export function isCoursePeriod(obj: any): obj is CoursePeriod {
    return 'day' in obj && 'period' in obj;
}
export function isCourseGroup(obj: any): obj is CourseGroup {
    return (
        'group' in obj &&
        'teacher' in obj &&
        Array.isArray(obj.periods) &&
        obj.periods.every(isCoursePeriod)
    );
}
export function isCourse(obj: any): obj is Course {
    return (
        'name' in obj &&
        Array.isArray(obj.groups) &&
        obj.groups.every(isCourseGroup)
    );
}