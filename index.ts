import * as Bitcoin from "bitcoinjs-lib";
import {
    address as Address,
    networks,
    payments,
    Psbt,
    initEccLib,
    Signer as BTCSigner,
    crypto
} from "bitcoinjs-lib";
import { ECPairFactory, ECPairAPI } from "ecpair";
import ecc from "@bitcoinerlab/secp256k1";
import { RuneId, Runestone, none, some } from "runelib";
import axios, { AxiosResponse } from "axios";

import { networkType } from "./utils/config";
import { SeedWallet, WIFWallet } from "./utils/Wallet";

import { IUTXO } from "./utils/types";
import { testVersion } from "./utils/config";

import { RECEIVEADDRESS } from "./utils/config";
import { run } from "node:test";
import { mergeUTXO } from "./main/UTXO_merge";

declare const window: any;
initEccLib(ecc as any);

const ECPair: ECPairAPI = ECPairFactory(ecc);
const network = networks.testnet;

const SEED_PRIVATE_KEY: string = process.env.SEED_PRIVATE_KEY as string;
const WIFprivateKey: string = process.env.WIF_PRIVATE_KEY as string;

const blockstream = new axios.Axios({
    baseURL: `https://mempool.space/testnet/api`
});

export async function waitUntilUTXO(address: string) {
    return new Promise<IUTXO[]>((resolve, reject) => {
        let intervalId: any;
        const checkForUtxo = async () => {
            try {
                const response: AxiosResponse<string> = await blockstream.get(`/address/${address}/utxo`);
                const data: IUTXO[] = response.data ? JSON.parse(response.data) : undefined;
                if (data.length > 0) {
                    resolve(data);
                    clearInterval(intervalId);
                }
            } catch (error) {
                reject(error);
                clearInterval(intervalId);
            }
        };
        intervalId = setInterval(checkForUtxo, 10000);
    });
}

export async function getTx(id: string): Promise<string> {
    const response: AxiosResponse<string> = await blockstream.get(`/tx/${id}/hex`);
    return response.data;
}

export async function signAndSend(keyPair: BTCSigner, psbt: Psbt, address: string) {
    if (process.env.NODE) {

        psbt.signInput(0, keyPair);
        psbt.finalizeAllInputs();

        const tx = psbt.extractTransaction();
        console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
        // const txid = await broadcast(tx.toHex());
        // console.log(`Success! Txid is ${txid}`);

    } else { // in browser

        try {
            let res = await window.unisat.signPsbt(psbt.toHex(), {
                toSignInputs: [
                    {
                        index: 0,
                        address: address,
                    }
                ]
            });

            console.log("signed psbt", res)

            res = await window.unisat.pushPsbt(res);

            console.log("txid", res)
        } catch (e) {
            console.log(e);
        }
    }

}

export async function broadcast(txHex: string) {
    const response: AxiosResponse<string> = await blockstream.post('/tx', txHex);
    return response.data;
}

function tapTweakHash(pubKey: Buffer, h: Buffer | undefined): Buffer {
    return crypto.taggedHash(
        "TapTweak",
        Buffer.concat(h ? [pubKey, h] : [pubKey])
    );
}

function toXOnly(pubkey: Buffer): Buffer {
    return pubkey.subarray(1, 33);
}

function tweakSigner(signer: BTCSigner, opts: any = {}): BTCSigner {
    // eslint-disable-next-line @typescript-eslint/ban-ts-comment
    // @ts-ignore
    let privateKey: Uint8Array | undefined = signer.privateKey!;
    if (!privateKey) {
        throw new Error("Private key is required for tweaking signer!");
    }
    if (signer.publicKey[0] === 3) {
        privateKey = ecc.privateNegate(privateKey);
    }

    const tweakedPrivateKey = ecc.privateAdd(
        privateKey,
        tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash)
    );
    if (!tweakedPrivateKey) {
        throw new Error("Invalid tweaked private key!");
    }

    return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
        network: opts.network,
    });
}

async function mintWithP2wpkh(runeId: RuneId) {

    const adminWallet = new SeedWallet({ networkType: networkType, seed: SEED_PRIVATE_KEY });
    // const wallet = new WIFWallet({ networkType: networkType, privateKey: WIFprivateKey });

    const mintstone = new Runestone([], none(), some(runeId), some(1));

    const keyPair = adminWallet.ecPair;

    const { address, } = payments.p2wpkh({ pubkey: keyPair.publicKey, network })

    console.log('admin P2wpkh address:', address)

    const utxos = await waitUntilUTXO(address as string)
    console.log(`Using UTXO ${utxos[0].txid}:${utxos[0].vout}`);

    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxos[0].txid,
        index: utxos[0].vout,
        witnessUtxo: { value: utxos[0].value, script: Address.toOutputScript(address as string, network) },
    });

    psbt.addOutput({
        script: mintstone.encipher(),
        value: 0
    });

    psbt.addOutput({
        address: RECEIVEADDRESS, // rune receive address
        value: 5000
    });

    const fee = 5000;

    const change = utxos[0].value - fee - 5000;

    psbt.addOutput({
        address: "tb1pjzwn9z0q39y45adgsscy5q4mrl0wrav47lemwvk83gnjtwv3dggqzlgdsl", // change address
        value: change
    });

    await signAndSend(keyPair, psbt, address as string);
}

async function mintWithTaproot(runeId: RuneId) {

    const adminWallet = new SeedWallet({ networkType: networkType, seed: SEED_PRIVATE_KEY });
    // const wallet = new WIFWallet({ networkType: networkType, privateKey: privateKey });

    const keyPair = adminWallet.ecPair;
    const tweakedSigner = tweakSigner(keyPair, { network });

    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const address = p2pktr.address ?? "";
    console.log(`admin taproot Address: ${address}`);

    const utxos = await waitUntilUTXO(address as string)

    console.log("utxos====>", utxos);

    console.log(`Using UTXO ${utxos[0].txid}:${utxos[0].vout}`);

    // const psbt = new Psbt({ network });
    // psbt.addInput({
    //     hash: utxos[0].txid,
    //     index: utxos[0].vout,
    //     witnessUtxo: { value: utxos[0].value, script: p2pktr.output! },
    //     tapInternalKey: toXOnly(keyPair.publicKey)
    // });

    // const mintstone = new Runestone([], none(), some(runeId), some(1));

    // console.log("mintstone ===>", mintstone);


    // psbt.addOutput({
    //     script: mintstone.encipher(),
    //     value: 0
    // });

    // psbt.addOutput({
    //     address: RECEIVEADDRESS, // rune receive address
    //     value: 5000
    // });

    // const fee = 5000;

    // const change = utxos[0].value - fee - 5000;

    // psbt.addOutput({
    //     address: "tb1pjzwn9z0q39y45adgsscy5q4mrl0wrav47lemwvk83gnjtwv3dggqzlgdsl", // change address
    //     value: change
    // });

    // await signAndSend(tweakedSigner, psbt, address as string);
}

async function mintWithP2pkh(runeId: RuneId) {

    const mintstone = new Runestone([], none(), some(runeId), some(1));

    const keyPair = ECPair.fromWIF(
        WIFprivateKey,
        network
    );

    const { address, } = payments.p2pkh({ pubkey: keyPair.publicKey, network })

    console.log('admin P2pkh address:', address)

    const utxos = await waitUntilUTXO(address as string)
    console.log(`Using UTXO ${utxos[0].txid}:${utxos[0].vout}`);


    const rawTx = await getTx(utxos[0].txid);


    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxos[0].txid,
        index: utxos[0].vout,
        nonWitnessUtxo: Buffer.from(rawTx, 'hex')
    });

    psbt.addOutput({
        script: mintstone.encipher(),
        value: 0
    });
    psbt.addOutput({
        address: RECEIVEADDRESS, // rune receive address
        value: 546
    });

    const change = utxos[0].value - 546 - 10000;

    psbt.addOutput({
        address: "tb1qh9338ymus4tcsv7g0xptwx4ksjsujqmlq945cp", // change address
        value: change
    });

    await signAndSend(keyPair, psbt, address as string);
}

async function index() {

    await mergeUTXO();

    const runeId: RuneId = new RuneId(2586233, 1009);

    // await mintWithP2wpkh(runeId);
    // await mintWithTaproot(runeId);
    // await mintWithP2pkh(runeId);
}

// main
index();