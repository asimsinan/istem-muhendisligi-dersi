<script lang="ts">
	import { Dropdown, DropdownItem, ButtonGroup } from 'flowbite-svelte';
	import Temperature from './Temperature.svelte';

	import { ChevronDownOutline } from 'flowbite-svelte-icons';
	import {
		inputText,
		isModelRunning,
		predictedToken,
		inputTextExample,
		isFetchingModel,
		expandedBlock,
		selectedExampleIdx,
		isLoaded,
		isOnAnimation,
		isMobile,
		weightPopover,
		sampling,
		attentionHeadIdx,
		blockIdx,
		temperature,
		tokenIds,
		userId,
		modelDurum,
		modelIlerleme,
		MODELLER,
		ekDurum,
		ekIlerleme,
		istenenModel,
		selectedModel
	} from '~/store';
	import { YEREL } from '~/dil/dil';
	import LoadingDots from './common/LoadingDots.svelte';
	import classNames from 'classnames';
	import Sampling from './Sampling.svelte';
	import { completeCurrentAnimation } from '~/utils/animation';
	import { textPages } from '~/utils/textbookPages';

	let inputRef: HTMLDivElement;
	let predictRef: HTMLDivElement;

	let useCustomInput = false;

	$: inputTextTemp = $inputText || '';

	$: predictedTokenTemp = $predictedToken?.token || '';

	const wordLimit = 12;
	$: exceedLimit = inputTextTemp.split(' ').length >= wordLimit;

	// Text input
	// TR düzeltmesi: Özgün kod, kutuya her odaklanmada tahmini metne ekliyordu. Kutuya tıklandıktan
	// sonra sıcaklık/örnekleme değişince yeni bir tahmin geliyor ve "Üret" aynı token'ı ikinci kez
	// ekliyordu ("Ankara'd'd"). Artık tahmin yalnızca kutudaki metin, modelin son çalıştığı metinle
	// aynıysa eklenir; kutuya önceden eklenmiş eski tahmin, yeni tahmin gelince geri alınır.
	const bosluk = (s: string) => (s || '').replace(/[\s\n]+/g, ' ');
	let otomatikEklenen = '';

	const onFocusInput = (e?) => {
		const kutu = bosluk(inputTextTemp);
		if (predictedTokenTemp && kutu.trim() === bosluk($inputText).trim()) {
			inputTextTemp = bosluk(kutu.trimEnd() + predictedTokenTemp);
			otomatikEklenen = inputTextTemp;
		} else {
			inputTextTemp = kutu;
		}

		// set predicted to empty
		predictedTokenTemp = '';
		// set input box text
		inputRef.innerText = inputTextTemp;
	};

	const yeniTahmin = (_t) => {
		if (otomatikEklenen && inputRef && bosluk(inputRef.innerText) === otomatikEklenen) {
			if (bosluk($inputText).trim() !== otomatikEklenen.trim()) {
				inputTextTemp = $inputText || '';
				inputRef.innerText = inputTextTemp;
			}
		}
		otomatikEklenen = '';
	};
	$: yeniTahmin($predictedToken);

	const onInput = (e) => {
		inputTextTemp = inputRef.innerText;
	};

	const handleSubmit = (e) => {
		// Complete any running animation before starting new generation
		completeCurrentAnimation();

		setTimeout(() => {
			onFocusInput();
			textPages.find((page) => page.id === 'how-transformers-work')?.complete();

			inputText.set(inputTextTemp);

			window.dataLayer?.push({
				event: 'generate-next-token',
				attn_head_num: $attentionHeadIdx,
				transformer_block_num: $blockIdx,
				sampling_type: $sampling.type,
				sampling_value: $sampling.value,
				temperature_value: $temperature,
				current_token_length: $tokenIds.length,
				input_word_count: inputTextTemp
					.trim()
					.split(/\s+/)
					.filter((word) => word.length > 0).length,
				use_custom_input: useCustomInput,
				user_id: $userId
			});
		}, 0);
	};

	const handleKeyDown = (e) => {
		if (e.key === 'Enter') {
			e.preventDefault();
			if (disabled || exceedLimit) return;
			handleSubmit(e);
			return;
		}
		useCustomInput = true;
	};

	// Example select box
	let dropdownOpen = false;
	const onSelectExample = (d, i) => {
		if ($isFetchingModel) {
			textPages.find((page) => page.id === 'how-transformers-work')?.complete();
		}

		dropdownOpen = false;

		selectedExampleIdx.set(i);
		predictedTokenTemp = '';

		inputTextTemp = d;
		inputRef.innerText = inputTextTemp;
		inputText.update((prev) => {
			if (prev === d.trim()) {
				return d + ' ';
			}
			return d.trim();
		});
		useCustomInput = false;
	};

	const moveCursorToEnd = (element) => {
		const range = document.createRange();
		const sel = window.getSelection();
		range.selectNodeContents(element);
		range.collapse(false);
		sel.removeAllRanges();
		sel.addRange(range);
		element.focus();
	};

	$: isLoading = $isFetchingModel || $isModelRunning;
	// TR: Model seçimi (küçük / orta)
	$: secimKapali = $isModelRunning || $expandedBlock.id !== null;
	const modelSec = (e, ad) => {
		e.preventDefault();
		e.stopPropagation();
		if ($istenenModel === ad && $ekDurum[ad] === 'hata') istenenModel.set($selectedModel); // "tekrar dene"
		istenenModel.set(ad);
	};
	const MODEL_SIRASI = Object.keys(MODELLER); // TR: gpt2, gpt2-medium, xglm, gemma (İngilizce sürümde yalnızca gpt2)
	$: inenModel = MODEL_SIRASI.find((ad) => $ekDurum[ad] === 'iniyor' || $ekDurum[ad] === 'hazirlaniyor');
	$: hataliModel = $istenenModel !== $selectedModel && $ekDurum[$istenenModel] === 'hata' ? $istenenModel : null;
	$: disabled =
		$isFetchingModel ||
		// $isModelRunning ||
		$expandedBlock.id !== null ||
		!!$weightPopover;
	$: selectDisabled = $isModelRunning || $expandedBlock.id !== null || !!$weightPopover;
	$: parameterDisabled = !!$weightPopover;
</script>

<div class="input-area" data-click="input-area">
	<form class="input-form" data-click="input-form">
		<ButtonGroup class="input-btn-group" size="sm">
			<button
				data-click="dropdown-btn"
				type="button"
				disabled={selectDisabled}
				class:selectDisabled
				class="select-button inline-flex shrink-0 items-center justify-center border border-s-0 border-gray-200 bg-white px-3 py-2 text-center text-xs font-medium text-gray-900 first:rounded-s-lg first:border-s last:rounded-e-lg"
			>
				Örnekler<ChevronDownOutline class="pointer-events-none h-4 w-4 text-gray-500" />
			</button>
			<Dropdown bind:open={dropdownOpen} class="example-dropdown">
				{#each inputTextExample as text, index}
					<DropdownItem
						data-click={`dropdown-item-${index}`}
						class={$selectedExampleIdx === index && 'active'}
						on:click={() => {
							onSelectExample(text, index);
						}}>{text}</DropdownItem
					>
				{/each}
			</Dropdown>

			<div
				data-click="text-input"
				class="input-container"
				class:disabled
				role="none"
				on:keydown={(e) => {
					e.stopPropagation();
					inputRef.focus();
				}}
				on:click={(e) => {
					e.stopPropagation();
					inputRef.focus();
				}}
			>
				<div class={`editable ${!$isModelRunning ? 'w-full' : ''}`}>
					<div
						bind:this={inputRef}
						contenteditable={!disabled}
						class="text-box"
						placeholder="Kendi cümlenizi yazın"
						on:focus={onFocusInput}
						on:input={onInput}
						on:keydown={handleKeyDown}
						on:click={(e) => {
							e.stopPropagation();
						}}
						role="input"
					>
						{inputTextTemp}
					</div>
					{#if !$isModelRunning}
						<div
							bind:this={predictRef}
							class="predicted"
							role="none"
							on:click={(e) => {
								e.stopPropagation();
								onFocusInput(e);
								inputRef.focus();
								moveCursorToEnd(inputRef);
							}}
						>
							<span>{predictedTokenTemp}</span>
						</div>
					{/if}
				</div>
				{#if $isModelRunning}
					<div class="loading"><LoadingDots /></div>
				{/if}
				<!-- TR: Model durumu her zaman görünür -->
				<div class="model-durum">
					{#if $isMobile}
						<span class="rozet gri">Telefonda yalnızca örnekler</span>
						<span class="aciklama">Kendi cümlenizi yazmak için bilgisayardan açın.</span>
					{:else if $modelDurum === 'iniyor'}
						<span class="rozet sari"
							>Model iniyor · %{Math.round($modelIlerleme * 100)}
							<span class="cubuk"><span style={`width:${Math.round($modelIlerleme * 100)}%`}></span></span
							></span
						>
						<span class="aciklama">210 MB, yalnızca ilk açılışta. Bu sırada örnekleri deneyin.</span>
					{:else if $modelDurum === 'hazirlaniyor'}
						<span class="rozet sari">Model hazırlanıyor…</span>
						<span class="aciklama">Birkaç saniye sürer.</span>
					{:else if $modelDurum === 'hata'}
						<span class="rozet kirmizi">Model inmedi</span>
						<span class="aciklama">Bağlantıyı kontrol edip sayfayı yenileyin. Örnekler çalışmaya devam eder.</span>
					{:else}
						<span class="secici" role="group" aria-label="Model seçimi">
							{#each MODEL_SIRASI as ad}
								<button
									type="button"
									class:secili={$selectedModel === ad}
									class:bekliyor={$istenenModel === ad && $selectedModel !== ad}
									disabled={secimKapali}
									title={MODELLER[ad].uzun + (ad === 'gpt2' || $ekDurum[ad] === 'hazir' ? '' : ` · ${MODELLER[ad].boyut} indirilir`)}
									on:click={(e) => modelSec(e, ad)}
									>{#if $selectedModel === ad}✓ {/if}{MODELLER[ad].kisa}</button
								>
							{/each}
						</span>
						{#if inenModel}
							<span class="rozet sari"
								>{MODELLER[inenModel].kisa} model {$ekDurum[inenModel] === 'iniyor'
									? `iniyor · %${Math.round(($ekIlerleme[inenModel] ?? 0) * 100)}`
									: 'hazırlanıyor…'}
								{#if $ekDurum[inenModel] === 'iniyor'}<span class="cubuk"
										><span style={`width:${Math.round(($ekIlerleme[inenModel] ?? 0) * 100)}%`}></span></span
									>{/if}</span
							>
							<span class="aciklama">{MODELLER[inenModel].boyut}; bu sırada {MODELLER[$selectedModel].kisa.toLocaleLowerCase(YEREL)} modelle devam edebilirsiniz.</span>
						{:else if hataliModel}
							<button type="button" class="gecis kirmizi-yazi" on:click={(e) => modelSec(e, hataliModel)}
								>{MODELLER[hataliModel].kisa} model inmedi · tekrar dene</button
							>
						{:else}
							<span class="aciklama"
								>{exceedLimit ? `En fazla ${wordLimit} kelime yazabilirsiniz.` : MODELLER[$selectedModel].uzun}</span
							>
						{/if}
					{/if}
				</div>
			</div>
		</ButtonGroup>
		<button
			data-click="generate-btn"
			disabled={disabled || exceedLimit || exceedLimit}
			class={classNames('generate-button rounded-lg text-center text-sm shadow-sm', {
				disabled: disabled || exceedLimit,
				active: !(disabled || exceedLimit)
			})}
			type="submit"
			on:click={handleSubmit}
		>
			Üret
		</button>
	</form>
	<div class="parameters" data-click="input-parameters">
		<Temperature disabled={parameterDisabled} />
		<Sampling disabled={parameterDisabled} />
	</div>
</div>

<style lang="scss">
	.parameters {
		display: flex;
		gap: 1rem;
	}
	.input-area {
		width: 100%;
		flex-shrink: 0;
		display: flex;
		gap: 1rem;
		padding-left: 1rem;
		padding-right: 1.25rem;

		.input-form {
			width: 100%;
			flex: 1 0 0;
			display: flex;
			align-items: center;
			gap: 0.5rem;

			:global(.input-btn-group) {
				flex: 1 0 0;
				display: flex;
			}
		}
	}
	.input-container {
		position: relative;
		display: flex;
		flex: 1 0 0;
		align-items: center;

		border: 1px solid theme('colors.gray.300');
		color: theme('colors.gray.900');
		border-left: none;
		border-start-end-radius: 0.5rem;
		border-end-end-radius: 0.5rem;
		font-size: 1rem;
		line-height: 1rem;
		padding: 0.5rem;
		white-space: pre-wrap;
		gap: 0.3rem;

		width: 10px; // to keep input box width

		.editable {
			overflow-y: hidden;
			justify-content: end; // to show the last word

			display: flex;
			align-items: center;
			overflow-x: hidden;
			white-space: nowrap;

			.text-box {
				white-space: nowrap;
				br {
					display: none;
				}

				&:focus {
					outline: none;
				}
			}
			.predicted {
				flex: 1 0 0;
				color: var(--predicted-color);
				font-weight: 600;
				span {
					white-space: pre;
				}
			}
		}

		&.disabled {
			cursor: not-allowed;
		}

		.loading {
			flex-shrink: 0;
		}
	}

	.select-button {
		flex-shrink: 0;
		font-size: 0.9rem;
		border: 1px solid theme('colors.gray.300');
		color: theme('colors.gray.900');
		&:hover {
			background-color: theme('colors.gray.100');
		}
		&:focus {
			outline: none;
		}
		&.disabled {
			cursor: not-allowed;
		}
	}
	:global(.example-dropdown) {
		:global(.active) {
			background-color: theme('colors.gray.100') !important;
		}
	}
	.model-durum {
		position: absolute;
		bottom: 0;
		left: 0;
		transform: translate(0, 100%);
		padding-top: 0.3rem;
		display: flex;
		align-items: center;
		gap: 0.5rem;
		white-space: nowrap;
		font-size: 0.8rem;
		pointer-events: none;
		.rozet {
			display: inline-flex;
			align-items: center;
			gap: 0.4rem;
			font-weight: 600;
			border-radius: 999px;
			padding: 0.1rem 0.55rem;
			border: 1px solid transparent;
		}
		.sari { background: #fff7e0; color: #8a5a00; border-color: #f2d27a; }
		.yesil { background: #e8f6ec; color: #1e6b34; border-color: #a8dbb7; }
		.kirmizi { background: #fde8eb; color: #a50e26; border-color: #f2a5b1; }
		.gri { background: #f1f1f1; color: #555; border-color: #ddd; }
		.cubuk {
			display: inline-block;
			width: 4rem;
			height: 0.35rem;
			border-radius: 999px;
			background: #f2d27a66;
			overflow: hidden;
			span { display: block; height: 100%; background: #d9a400; transition: width 0.3s; }
		}
		.aciklama { color: theme('colors.gray.500'); }
		.secici {
			pointer-events: auto;
			display: inline-flex;
			border: 1px solid #a8dbb7;
			border-radius: 999px;
			overflow: hidden;
			background: #fff;
			button {
				font-weight: 600;
				padding: 0.1rem 0.6rem;
				color: theme('colors.gray.600');
				border-left: 1px solid #e3e3e3;
				cursor: pointer;
				&:first-child { border-left: 0; }
				&:hover:not(:disabled):not(.secili) { background: #f4f4f4; }
				&.secili { background: #e8f6ec; color: #1e6b34; cursor: default; }
				&.bekliyor { background: #fff7e0; color: #8a5a00; }
				&:disabled:not(.secili) { opacity: 0.45; cursor: default; }
			}
		}
		.gecis {
			pointer-events: auto;
			font-weight: 600;
			color: #c8102e;
			border: 1px solid #f2a5b1;
			background: #fff;
			border-radius: 999px;
			padding: 0.1rem 0.6rem;
			cursor: pointer;
			&:hover:not(:disabled) { background: #fde8eb; }
			&:disabled { opacity: 0.45; cursor: default; }
		}
		@media (max-width: 1150px) { .aciklama { display: none; } }
	}
	.helper-text {
		position: absolute;
		bottom: 0;
		right: 0;
		padding: 0.3rem 0;
		transform: translate(0, 100%);
		color: theme('colors.gray.400');
		font-size: 0.9rem;
	}
	:global(.generate-button) {
		padding: 0.4rem 0.8rem;
		border: 1px solid theme('colors.gray.300');
		color: theme('colors.gray.900');
		transition: all 0.2s;
		flex-shrink: 0;
	}
	:global(.generate-button.active) {
		&:hover {
			border: 1px solid var(--predicted-color);
			color: var(--predicted-color);
		}
	}
	:global(.generate-button.disabled) {
		opacity: 1;
		background-color: theme('colors.gray.100');
		color: theme('colors.gray.400');
		cursor: not-allowed;
	}

	:global(.generate-button):focus {
		border: 1px solid var(--predicted-color);
		color: var(--predicted-color);
	}
</style>
