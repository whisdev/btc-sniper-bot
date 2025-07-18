import { networkType } from "../utils/config";
import { getUtxos, pushBTCpmt } from "../utils/mempool";
import * as Bitcoin from "bitcoinjs-lib";
import * as ecc from "tiny-secp256k1";
import dotenv from "dotenv";
import { redeemSendUTXOPsbt, sendUTXOPsbt } from "../controller/utxo.send.controller";
import { SeedWallet } from "../utils/Wallet";
// import { WIFWallet } from '../utils/WIFWallet'

import {
  TESTNET_FEERATE,
  SEND_UTXO_LIMIT,
  RECEIVEADDRESS
} from "../utils/config";

dotenv.config();
Bitcoin.initEccLib(ecc);

const SEED_PRIVATE_KEY: string = process.env.SEED_PRIVATE_KEY as string;
// const WIF_PRIVATE_KEY: string = process.env.WIF_PRIVATE_KEY as string;


export const sendUTXO = async () => {
  const wallet = new SeedWallet({ networkType: networkType, seed: SEED_PRIVATE_KEY });
  // const wallet = new WIFWallet({ networkType: networkType, privateKey: WIF_PRIVATE_KEY });

  const utxos = await getUtxos(wallet.address, networkType);
  const utxo = utxos.find((utxo) => utxo.value > SEND_UTXO_LIMIT);
  if (utxo === undefined) throw new Error("No btcs");

  let redeemPsbt: Bitcoin.Psbt = redeemSendUTXOPsbt(wallet, utxo, networkType);
  redeemPsbt = wallet.signPsbt(redeemPsbt, wallet.ecPair)
  let redeemFee = redeemPsbt.extractTransaction().virtualSize() * TESTNET_FEERATE;

  let psbt = sendUTXOPsbt(wallet, utxo, networkType, redeemFee, RECEIVEADDRESS);
  let signedPsbt = wallet.signPsbt(psbt, wallet.ecPair)

  const txHex = signedPsbt.extractTransaction().toHex();

  const txId = await pushBTCpmt(txHex, networkType);
  console.log(`Send_UTXO_TxId=======> ${txId}`)
}