<script setup lang="ts">
// This starter template is using Vue 3 <script setup> SFCs
// Check out https://v3.vuejs.org/api/sfc-script-setup.html#sfc-script-setup
import ProposalDecoder from './components/ProposalDecoder.vue';
</script>

<template>
  <!-- <img alt="Vue logo" src="./assets/logo.png" /> -->
  <ProposalDecoder
    network="mainnet"
    event-proposed="0x2de9aefe888ee33e88ff8f7de007bdda112b7b6a4d0b1cd88690e805920d4091"
    address-timelock="0xA5E64f55f1d7244475Ee3842E06295c1973482eD"
    arguments-propose="tuple(address target, bytes data)[]"
    />
</template>

<style>
#app {
  font-family: Avenir, Helvetica, Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  text-align: center;
  color: #2c3e50;
  margin-top: 60px;
}
</style>
