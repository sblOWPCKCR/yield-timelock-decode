<script setup lang="ts">
import { ref } from 'vue'

defineProps<{
  network: string,
  addressLadle: string,
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
      logs: [],
      txHash: location.hash.substring(1),
      calls: [null, null],
      decoded:
      {
        abis: {},
        contracts: {},
        calls: {}
      }
    } as {
      logs: string[],
      txHash: string,
      calls: [string?, object?],
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
    txHash(newVal) {
      location.hash = '#' + newVal;
    },
  },
  methods: {
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

    async getABI(target: string) {
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
      return this.decoded.abis[target];
    },

    getFunction(abi: {interface: Interface, functions: Map<string, FunctionFragment>},
                calldata: string): [FunctionFragment, string] {
      const selector = calldata.slice(0, 2 + 4 * 2);
      const f = abi.functions.get(selector);
      if (!f) {
        throw new Error(`Can't find selector ${selector} in function ${abi}`);
      }
      return [f, addHexPrefix(calldata.slice(2 + 2 * 4))];
    },

    log(msg: string) {
      this.logs.push(msg);
    },

    async resolveCall(call: Call) {
      const abi = await this.getABI(call.to);
      const [func, args_calldata] = this.getFunction(abi, call.calldata);

      // console.log("calldata", call.calldata);
      // console.log("func", func.format(ethers.utils.FormatTypes.full), "args calldata", args_calldata);
      let args = ethers.utils.defaultAbiCoder.decode(
        func.inputs.map(p => {return p.format()}),
        args_calldata);
      if (ethers.utils.getAddress(call.to) == ethers.utils.getAddress(this.addressLadle) && func.name == "batch") {
        args = [args[0].map(x => {
          return new Call(call.to, x);
        })];

        await Promise.all(args[0].map(x => {
          return this.resolveCall(x);
        }));
      } else if (ethers.utils.getAddress(call.to) == ethers.utils.getAddress(this.addressLadle) && func.name == "route") {
        args = [new Call(args[0], args[1])];
        await this.resolveCall(args[0]);
      }
      else {
        args = args.map(x => {return x.toString()});
      }
      // const decoded_args = func.inputs.map((v) => {
      //   return v.format(ethers.utils.FormatTypes.minimal);
      // });
      call.resolve(func.name, args);
    },

    async decodeTxHash(hash: string) {
      const tx = await ethers.getDefaultProvider(this.network).getTransaction(hash);
      const input = tx.data;
      if (!tx.to) {
        this.log(`Transaction without address: ${tx}`);
        return;
      }
      const call = new Call(tx.to, tx.data);
      this.log(`call: ${call}`);
      await this.resolveCall(call);
      this.calls = [hash, call];
    },
    getCallsJson() {
      return JSON.stringify(this.calls[1], (k, v) => {
        if (v instanceof Call) {
          return v.toPrettyJson();
        }
        return v;
      }, 2);
    }
  },
})

class Call {
  method?: string;
  arguments: (string|Call)[] = [];
  constructor(readonly to: string, readonly calldata: string) {
  }

  resolve(_method: string, _arguments: (string|Call)[]) {
    this.method = _method;
    this.arguments = _arguments;
  }

  toPrettyJson() {
    return {"function": `${this.method} [${this.to}]`, "arguments": this.arguments};
  }
}
</script>

<template>
  <h1>Yield Batch decoder</h1>
  <form>
    <label for="tx_hash">
      Transaction hash
      <input type="text" id="tx_hash" name="tx_hash" v-model="txHash">
    </label>
    <button v-on:click.stop.prevent="decodeTxHash(txHash)">Decode</button>
  </form>
  <div v-if="calls[0] == txHash">
    <textarea
      :rows="getCallsJson().match(/\n/g).length + 3"
      readonly
      >{{getCallsJson()}}
    </textarea>
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
