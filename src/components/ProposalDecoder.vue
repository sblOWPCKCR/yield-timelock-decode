<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  network: string,
  addressTimelock: string,
  eventProposed: string,
  argumentsPropose: string
}>()
// let logs = "";

</script>

<script lang="ts">
import { FunctionFragment, Interface } from "@ethersproject/abi";
import { ethers } from "ethers";
import {addHexPrefix, fetchEtherscan} from "../utils";

import { defineComponent } from 'vue'
export default defineComponent({
  data() {
    return {
      proposalHash: location.hash.substring(1),
      logs: [],
      txHash: [null, null],
      calls: [null, null],
      decoded:
      {
        abis: {},
        contracts: {},
        calls: {}
      }
    } as {
      logs: string[],
      txHash: [string?, string?],
      calls: [string?, {target: string, data: string}[]?],
      decoded: {
        contracts: {[key: string]: string},
        abis: {[key: string]: {
          interface: Interface,
          functions: Map<string, FunctionFragment>
        }},
        calls: {[key: string]: {
          method: string
        }}
      }
      }
  },
  watch: {
    proposalHash(newVal) {
      location.hash = '#' + newVal;
    },
  },
  methods: {
    async decodeHash(hash: string) {
      try {
        const tx_hash_array: Array<any> = (await fetchEtherscan(this.network, new URLSearchParams({
          "module": "logs",
          "action": "getLogs",
          "address": addHexPrefix(this.addressTimelock),
          "topic0": addHexPrefix(this.eventProposed),
          "topic1": addHexPrefix(hash)
        }), (x) => this.logs.push(x)))["result"];

        if (tx_hash_array.length == 0) {
          throw "Failed to find Proposal hash";
        } else if (tx_hash_array.length > 1) {
          this.logs.push("Found more than 1 transaction with the same proposal hash; decoding the last one");
        }
        const tx_hash = tx_hash_array[0]["transactionHash"];
        if (this.txHash[0] == undefined || this.proposalHash == hash) {
          this.txHash = [hash, tx_hash];
          await this.decodeTxHash(hash, tx_hash);
        }
      } catch (ex) {
        this.logs.push(ex);
      }
      return false;
    },

    getEtherscanAddressLink(addr: string) {
      return `https://${this.network == "mainnet" ? '' : this.network + '.'}etherscan.io/address/${addHexPrefix(addr)}`;
    },
    getEtherscanTxLink(addr: string) {
      return `https://${this.network == "mainnet" ? '' : this.network + '.'}etherscan.io/tx/${addHexPrefix(addr)}`;
    },

    getContractName(addr: string): string {
      return this.decoded.contracts[addr];
    },
    getFunctionName(target: string, calldata: string): string {
      if (!(target in this.decoded.abis)) {
        return "Fetching function name...";
      }
      const abi = this.decoded.abis[target];
      const selector = calldata.slice(0, 2 + 4 * 2);
      const f = abi.functions.get(selector);
      if (!f) {
        return "Selector not found, that's bad";
      }
      return f.format(ethers.utils.FormatTypes.full);
    },

    getFunctionArguments(target: string, calldata: string): Array<[string, string]> {
      if (!(target in this.decoded.abis)) {
        return [["status", "Fetching function arguments..."]];
      }
      const abi = this.decoded.abis[target];
      const selector = calldata.slice(0, 2 + 4 * 2);
      const f = abi.functions.get(selector);
      if (!f) {
        return [["status", "Selector not found, that's bad"]];
      }
      const args = ethers.utils.defaultAbiCoder.decode([f.format(ethers.utils.FormatTypes.full)], addHexPrefix(calldata.slice(2 + 2 * 4)))[0];
      return f.inputs.map((v, i) => {
        return [v.format(ethers.utils.FormatTypes.full), args[i]];
      });
    },

    async startFetchingABIs(targets: Iterable<string>) {
      for (const target of targets) {
        if (!(target in this.decoded.abis)) {
          const ret = (await fetchEtherscan(this.network, new URLSearchParams({
            "module": "contract",
            "action": "getsourcecode",
            "address": addHexPrefix(target),
          }), (x) => this.logs.push(x)))["result"][0];
          const iface = new Interface(ret["ABI"]);
          const functions = new Map<string, FunctionFragment>();
          for (const f in iface.functions) {
            functions.set(iface.getSighash(iface.functions[f]), iface.functions[f]);
          }
          this.decoded.contracts[target] = ret["ContractName"];
          this.decoded.abis[target] = {
            interface: iface,
            functions: functions,
          };
        }
      }
      this.logs.push("ABIs fetched");
    },

    async decodeTxHash(epoch: string, hash: string) {
      const input = (await ethers.getDefaultProvider(this.network).getTransaction(hash)).data;
      const calls_arr = ethers.utils.defaultAbiCoder.decode([this.argumentsPropose], addHexPrefix(input.slice(2 + 4 * 2)))[0];
      // 0x4a6c405fad393b24f0fd889bb8ae715b3fcca1f0a12c9ae079d072958c9dbbc7
      this.calls = [epoch,
        calls_arr.map((call) => {
          return {
            target: call.target,
            data: call.data
          };
        })];

      this.startFetchingABIs(new Set(calls_arr.map(call => {
        return call.target
      })));
    }
  }
})
</script>

<template>
  <h1>Yield Proposal hash decoder</h1>
  <form>
    <label for="proposal_hash">
      Proposal hash
      <input type="text" id="proposal_hash" name="proposal_hash"  v-model="proposalHash" required>
    </label>
    <button v-on:click.stop.prevent="decodeHash(proposalHash)">Decode</button>
    <label for="tx_hash" v-if="txHash[0] == proposalHash">
      <a :href="getEtherscanTxLink(txHash[1])">Transaction hash</a>
      <input type="text" id="tx_hash" name="tx_hash" readonly :value="txHash[1]">
    </label>
  </form>
  <div v-if="calls[0] == proposalHash">
    <h4>Calls: {{calls[1].length}}</h4>
      <article v-for="call in calls[1]">
        <form>
          <label :for="call.target">
            <a :href="getEtherscanAddressLink(call.target)">Target</a>
            <input type="text" :id="call.target" readonly :value="`[${getContractName(call.target)}] ${call.target}`">
          </label>
          <label :for="'decoded' + call.data">
            Decoded calldata
            <textarea 
              :rows="getFunctionArguments(call.target, call.data).length + 3"
              readonly 
              :id="'decoded' + call.data"
              >{{getFunctionName(call.target, call.data)}}

{{getFunctionArguments(call.target, call.data).map(x => `${x[0]} = ${x[1]}`).join(";\n")}}
            </textarea>
          </label>
          <label :for="call.data">
            Calldata
            <input type="text" :id="call.data" readonly :value="call.data">
          </label>
        </form>
      </article>
  </div>
  <small class=".logs">{{logs.length ? logs[logs.length - 1] : ""}}</small>
</template>

<style scoped>
a {
  color: #42b983;
}
/*
label {
  margin: 0 0.5em;
  font-weight: bold;
} */

.logs {
  float: left
}


code {
  background-color: #eee;
  padding: 2px 4px;
  border-radius: 4px;
  color: #304455;
}
</style>
