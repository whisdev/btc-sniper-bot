import { 
    Signer as BTCSigner,
    Psbt
 } from "bitcoinjs-lib/";

 import { broadcast } from "./utils";

declare const window: any;

export async function signAndSend(
    keyPair: BTCSigner,
    psbt: Psbt,
    address: string
) {
    if (process.env.NODE) {
        psbt.signInput(0, keyPair);
        psbt.finalizeAllInputs();

        const tx = psbt.extractTransaction();
        console.log(`Broadcasting Transaction Hex: ${tx.toHex()}`);
        const txid = await broadcast(tx.toHex());
        console.log(`Success! Txid is ${txid}`);
    } else {
        // in browser

        try {
            let res = await window.unisat.signPsbt(psbt.toHex(), {
                toSignInputs: [
                    {
                        index: 0,
                        address: address,
                    },
                ],
            });

            console.log("signed psbt", res);

            res = await window.unisat.pushPsbt(res);

            console.log("txid", res);
        } catch (e) {
            console.log(e);
        }
    }
}