export function addHexPrefix(addrLike: string) {
  if (addrLike.startsWith("0x")) {
    return addrLike;
  }
  return "0x" + addrLike;
}

export async function fetchEtherscan(network: string, params: URLSearchParams, logger: ((string) => void)): Promise<any> {
  const cache_key = JSON.stringify({network: network, params: params.toString()});
  const cached_value = localStorage.getItem(cache_key);
  if (cached_value) {
    return JSON.parse(cached_value);
  }
  const max_attempts = 5;
  for (let attempt = 0; attempt < max_attempts; ++attempt) {
    logger("Querying Etherscan");
    const resp = await fetch(`https://api${network == 'mainnet' ? '' : '-' + network}.etherscan.io/api?` + params);
    const resp_json = await resp.json();
    if (!('message' in resp_json) || (resp_json.message as string).startsWith("OK")) {
      localStorage.setItem(cache_key, JSON.stringify(resp_json));
      return resp_json;
    }
    if (attempt + 1 == max_attempts) {
      throw `Failed to quest etherscan: ${resp_json.message} - ${resp_json.result}`;
    }
    const delay_seconds = 5 + (2 ** attempt);
    logger(`Failed to quest etherscan: ${resp_json.message} - ${resp_json.result}; will try again in ${delay_seconds} seconds; attempts left: ${max_attempts - attempt - 1}`);
    await new Promise((resolve, _) => {
      setTimeout(resolve, delay_seconds * 1000);
    });
  }
}

export async function fetchTransactionInput(network: string, tx_hash: string, logger: ((string) => void)) {
  const transaction: any = (await fetchEtherscan(network, new URLSearchParams({
    "module": "proxy",
    "action": "eth_getTransactionByHash",
    "txhash": addHexPrefix(tx_hash),
  }), logger))["result"];
  return transaction["input"];
}