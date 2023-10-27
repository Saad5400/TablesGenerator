<script lang="ts">
	import '../app.postcss';

	// Floating UI for Popups
	import { computePosition, autoUpdate, flip, shift, offset, arrow } from '@floating-ui/dom';
	import { Toast, storePopup } from '@skeletonlabs/skeleton';
	import { autoModeWatcher, initializeStores } from '@skeletonlabs/skeleton';
	import { onMount } from 'svelte';

	initializeStores();
	storePopup.set({ computePosition, autoUpdate, flip, shift, offset, arrow });

	onMount(() => {
		autoModeWatcher();
	});
</script>

<svelte:head>
	<title>Courses Tables Generator</title>
	<meta name="description" content="Generate all the possible tables for this term's courses!" />
</svelte:head>

<Toast />

<slot />
