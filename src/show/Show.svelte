<script>
	import { onMount, afterUpdate, tick } from 'svelte';
	import FormItem from '../components/FormItem.svelte';

	onMount(async () => {
		console.log("on mount");
	});

	let options = {
		text: "sample",
		bcid: "code128",
		scaleX: 2,
		scaleY: 2,
		includetext: true,
		includecheck: true,
	};
	
	let ean8 = false;
	let ean13 = false;
	let upca = false;
	let code39 = false;
	$:{
		ean8 = isValidEan8(options.text);
		ean13 = isValidEan13(options.text);
		upca = isValidUpca(options.text);
		code39 = isValidCode39(options.text);
	}
	let imageUrl = "/logo.png";

	function checksum_1(str){
		let checksum = 0;
		let l = str.length;
		for (var i = 0; i < l; i += 1) {
			let ic = str.charCodeAt(i) - '0'.charCodeAt(0);
			if ((i % 2) != 0) {
				checksum = checksum + ic;
			} else {
				checksum = checksum + (ic * 3);
			}
		}
		checksum = (10 - (checksum % 10)) % 10;
		checksum = checksum + '0'.charCodeAt(0);
		checksum = String.fromCharCode(checksum);
		return checksum;
	}

	function checksum_2(str){
		let checksum = 0;
		let l = str.length;
		for (var i = 0; i < l; i += 1) {
			let ic = str.charCodeAt(i) - '0'.charCodeAt(0);
			if ((i % 2) == 0) {
				checksum = checksum + ic;
			} else {
				checksum = checksum + (ic * 3);
			}
		}
		checksum = (10 - (checksum % 10)) % 10;
		checksum = checksum + '0'.charCodeAt(0);
		checksum = String.fromCharCode(checksum);
		return checksum;
	}


	function isValidUpca(text){
		if (text.match(/^\d+$/)){
			if (text.length==11) return true;
			else if (text.length==12) {
				return checksum_1(text.slice(0, -1)) == text.slice(-1);
			}
		}
		return false;
	}
	function isValidEan8(text){
		if (text.match(/^\d+$/)){
			if (text.length==7) return true;
			else if (text.length==8) {
				return checksum_1(text.slice(0, -1)) == text.slice(-1);
			}
		}
		return false;
	}

	function isValidEan13(text){
		if (text.match(/^\d+$/)){
			if (text.length==12) return true;
			else if (text.length==13) {
				return checksum_2(text.slice(0, -1)) == text.slice(-1);
			}
		}
		return false;
	}
	
	function isValidCode39(text){
		if (text.match(/^[0-9A-Z\+\-\*\/\%\.\$\s]*$/)) return true;
		return false;
	}

	function updateBarcode(e){
		options.bcid = e.currentTarget.getAttribute("bcid");

		let url = `http://localhost:3333/code/${options.text}.png?`;
		for (let [k, v] of Object.entries(options)) {
			if (k!="text") url = url + `${k}=${v}&`;
		}
		let img = document.getElementById("image");
		img.src = url;
		console.log(url);
	}
</script>

<div class="columns">
  	<div class="column is-two-thirds">
		<FormItem label={"Text"} >
			<div class="control"><input id="text" required class="input" type="text" placeholder="text" bind:value={options.text}></div>
		</FormItem>

		<button bcid='upca' disabled={upca!=true} class="button is-link" on:click={updateBarcode}>UPC-A</button>
		<button bcid='ean13' disabled={ean13!=true} class="button is-link" on:click={updateBarcode}>EAN-13</button>
		<button bcid='ean8' disabled={ean8!=true} class="button is-link" on:click={updateBarcode}>EAN-8</button>

		<button bcid='qrcode' class="button is-link" on:click={updateBarcode}>QR Code</button>
		<button bcid='code39' disabled={code39!=true} class="button is-link" on:click={updateBarcode}>Code 39</button>
		<button bcid='code49' class="button is-link" on:click={updateBarcode}>Code 49</button>
		<button bcid='code128' class="button is-link" on:click={updateBarcode}>Code 128</button>

	</div>
	<div class="column">
		<img id="image" src={imageUrl} alt="not valid" />
	</div>
</div>

<style>
	* {
		box-sizing: border-box;
	}
</style>