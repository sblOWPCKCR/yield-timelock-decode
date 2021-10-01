<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import ProposalDecoder from './components/ProposalDecoder.vue';
import BatchDecoder from './components/BatchDecoder.vue';

defineProps<{
  batch: boolean
}>()

</script>

<template>
  <ProposalDecoder
    v-if="!batch"
    network="mainnet"
    event-proposed="0x2de9aefe888ee33e88ff8f7de007bdda112b7b6a4d0b1cd88690e805920d4091"
    address-timelock="0xA5E64f55f1d7244475Ee3842E06295c1973482eD"
    arguments-propose="tuple(address target, bytes data)[]"
    />
  <BatchDecoder
    v-if="batch"
    network="kovan"
    address-ladle="0x5840069b175d3eea154c58b065edc06095bb9217"
    />
</template>

<style>
.app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
