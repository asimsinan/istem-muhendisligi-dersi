<script lang="ts">
	import type { PopoverProps } from 'flowbite-svelte/Popover.svelte';
	import CommonPopover from './CommonPopover.svelte';

	export let offset: PopoverProps['offset'] = undefined;
	export let className: PopoverProps['class'] = undefined;
	export let triggeredBy: PopoverProps['triggeredBy'] = undefined;
	export let trigger: PopoverProps['trigger'] = undefined;
	export let placement: PopoverProps['placement'] = undefined;
</script>

<CommonPopover
	className="activation-popover"
	title="GELU aktivasyonu"
	{offset}
	{triggeredBy}
	{trigger}
	{placement}
	goTo="article-activation"
>
	<div class="activation-content">
		Karmaşık örüntüleri öğrenmek için doğrusal dönüşümün çıktısına doğrusal olmayan bir dönüşüm uygular.
	</div></CommonPopover
>

<style>
	.activation-content {
		width: 12rem;
	}
</style>
