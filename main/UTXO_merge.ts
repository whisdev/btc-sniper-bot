import { networkType } from "../utils/config";
import { getUtxos, pushBTCpmt } from "../utils/mempool";
import {
  redeemMergeUTXOPsbt,
  mergeUTXOPsbt
} from "../controller/utxo.merge.controller";
import * as Bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import { SeedWallet } from "../utils/Wallet";
// import { WIFWallet } from '../utils/WIFWallet'
import dotenv from "dotenv";

import {
  TESTNET_FEERATE,
  MERGE_COUNT
} from "../utils/config";

dotenv.config();
Bitcoin.initEccLib(ecc);

const SEED_PRIVATE_KEY: string = process.env.SEED_PRIVATE_KEY as string;
// const WIF_PRIVATE_KEY: string = process.env.WIF_PRIVATE_KEY as string;


const mergeUTXO = async () => {
  const wallet = new SeedWallet({ networkType: networkType, seed: SEED_PRIVATE_KEY });
  // const wallet = new WIFWallet({ networkType: networkType, privateKey: WIF_PRIVATE_KEY });

  const utxos = await getUtxos(wallet.address, networkType);
  if (utxos.length < MERGE_COUNT) throw new Error("No btcs");

  let redeemPsbt: Bitcoin.Psbt = redeemMergeUTXOPsbt(wallet, utxos, networkType, MERGE_COUNT);
  redeemPsbt = wallet.signPsbt(redeemPsbt, wallet.ecPair)
  let redeemFee = redeemPsbt.extractTransaction().virtualSize() * TESTNET_FEERATE;

  let psbt = mergeUTXOPsbt(wallet, utxos, networkType, MERGE_COUNT, redeemFee);
  let signedPsbt = wallet.signPsbt(psbt, wallet.ecPair)

  const txHex = signedPsbt.extractTransaction().toHex();
  const txId = await pushBTCpmt(txHex, networkType);
  console.log(`Merge_UTXO_TxId=======> ${txId}`)
}

mergeUTXO();