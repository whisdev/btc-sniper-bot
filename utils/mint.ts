import * as Bitcoin from "bitcoinjs-lib";
import {
    initEccLib,
    Psbt,
    Signer as BTCSigner,
    crypto
} from "bitcoinjs-lib";
import ecc from "@bitcoinerlab/secp256k1";
import { ECPairFactory, ECPairAPI } from "ecpair";
import axios, { AxiosResponse } from "axios";

import { IUTXO } from "./types";
import { testVersion } from "./config";

initEccLib(ecc as any);
declare const window: any;
const ECPair: ECPairAPI = ECPairFactory(ecc);

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
                console.log(data);
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

export const getFeeRate = async () => {
    try {
        const url = `https://mempool.space/${testVersion ? "testnet/" : ""
            }api/v1/fees/recommended`;

        const res = await axios.get(url);

        return res.data.fastestFee;
    } catch (error) {
        console.log("Ordinal api is not working now. Try again later");
        return -1;
    }
};

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

export function tapTweakHash(pubKey: Buffer, h: Buffer | undefined) {
    return () => crypto.taggedHash(
        "TapTweak",
        h ? Buffer.concat([pubKey, h]) : pubKey
    );
}

export function toXOnly(pubkey: Buffer) {
    return pubkey.subarray(1, 33);
}

export function tweakSigner(signer: BTCSigner, opts: any = {}) {
    let privateKey: Uint8Array | undefined;
    if (!privateKey) {
        throw new Error("Private key is required for tweaking signer!");
    }
    if (signer.publicKey[0] === 3) {
        privateKey = ecc.privateNegate(privateKey);
    }

    const tweakedPrivateKey = ecc.privateAdd(
        privateKey,
        tapTweakHash(toXOnly(signer.publicKey), opts.tweakHash)()
    );
    if (!tweakedPrivateKey) {
        throw new Error("Invalid tweaked private key!");
    }

    return ECPair.fromPrivateKey(Buffer.from(tweakedPrivateKey), {
        network: opts.network,
    });
}