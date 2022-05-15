import { transactions, connect, KeyPair, keyStores, utils } from "near-api-js";
import { setTimeout } from "timers/promises";
import { sha256 } from "js-sha256";

const sender = "sb2test.near";
const receiver =
  "87d14a1ab31a791cdb2332a0b49d97e3de815cca48ce285aa4321f57bdf1d598";
const networkId = "mainnet";
const amount = utils.format.parseNearAmount("0.001");

const keyStore = new keyStores.InMemoryKeyStore();
const keyPair = KeyPair.fromString(process.env.SENDER_PRIVATE_KEY ?? "badkey");
await keyStore.setKey(networkId, sender, keyPair);

const near = await connect({
  networkId,
  keyStore,
  nodeUrl: `https://rpc.${networkId}.near.org`,
  walletUrl: `https://wallet.${networkId}.near.org`,
  helperUrl: `https://helper.${networkId}.near.org`,
  explorerUrl: `https://explorer.${networkId}.near.org`,
});

// const senderAccount = await near.account(sender);

console.time("ping_gas_price");
console.log(await near.connection.provider.gasPrice());
console.timeEnd("ping_gas_price");

console.time("tx_setup");

const publicKey = keyPair.getPublicKey();
console.time("key_query");
const accessKey = await near.connection.provider.query(
  `access_key/${sender}/${publicKey.toString()}`,
  ""
);
console.timeEnd("key_query");
console.log("Key:", accessKey);
const nonce = accessKey.nonce + 1;
const actions = [transactions.transfer(amount)];
const recentBlockHash = utils.serialize.base_decode(accessKey.block_hash);

const transaction = transactions.createTransaction(
  sender,
  publicKey,
  receiver,
  nonce,
  actions,
  recentBlockHash
);
const serializedTx = utils.serialize.serialize(
  transactions.SCHEMA,
  transaction
);
const serializedTxHash = new Uint8Array(sha256.array(serializedTx));
const signature = keyPair.sign(serializedTxHash);
const signedTransaction = new transactions.SignedTransaction({
  transaction,
  signature: new transactions.Signature({
    keyType: transaction.publicKey.keyType,
    data: signature.signature,
  }),
});
const signedSerializedTx = signedTransaction.encode();
const txBase64 = Buffer.from(signedSerializedTx).toString("base64");

console.timeEnd("tx_setup");
console.log("tx:", txBase64);

console.time("send");

// Option 1 -- send async and check status
// const txHash = await near.connection.provider.sendJsonRpc(
//   "broadcast_tx_async",
//   [txBase64]
// );
// console.timeLog("send", "broadcast");
// console.log("tx hash:", txHash);

// let tx;
// do {
//   console.time("tx_status_request");
//   try {
//     tx = await near.connection.provider.sendJsonRpc("tx", [txHash, sender]);
//   } catch (error) {
//     console.log("Tx not found");
//   }
//   console.timeEnd("tx_status_request");
//   console.timeLog("send");
//   console.log(tx);
//   await setTimeout(250);
// } while (tx?.status?.SuccessValue !== "");

// Option 2 -- send sync and await for status
const txResult = await near.connection.provider.sendJsonRpc(
  "broadcast_tx_commit",
  [txBase64]
);
console.timeEnd("send", "final");
console.log("tx result:", txResult);
