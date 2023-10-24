import type { Load } from "@sveltejs/kit";

export const load: Load = async ({ url }) => {
    return {
        searchParams: url.searchParams,
    }
}