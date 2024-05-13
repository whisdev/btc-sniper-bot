import {
    Psbt,
    address as Address,
    networks,
    payments,
} from "bitcoinjs-lib";
import { ECPairFactory, ECPairAPI } from "ecpair";
import ecc from "@bitcoinerlab/secp256k1";
import { RuneId, Runestone, none, some } from "runelib";

import { networkType } from "./utils/config";
import { SeedWallet, WIFWallet } from "./utils/Wallet";
import {
    signAndSend,
    waitUntilUTXO,
    getTx,
    tweakSigner,
    toXOnly
} from "./utils/mint";

const ECPair: ECPairAPI = ECPairFactory(ecc);
const network = networks.testnet;

const SEED_PRIVATE_KEY: string = process.env.SEED_PRIVATE_KEY as string;
const WIFprivateKey: string = process.env.WIF_PRIVATE_KEY as string;

async function mintWithP2wpkh(runeId: RuneId) {

    const adminWallet = new SeedWallet({ networkType: networkType, seed: SEED_PRIVATE_KEY });
    // const wallet = new WIFWallet({ networkType: networkType, privateKey: WIFprivateKey });

    const mintstone = new Runestone([], none(), some(runeId), some(1));

    const keyPair = adminWallet.ecPair;

    const { address, } = payments.p2wpkh({ pubkey: keyPair.publicKey, network })

    console.log('address:', address)

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
        address: "tb1pjzwn9z0q39y45adgsscy5q4mrl0wrav47lemwvk83gnjtwv3dggqzlgdsl", // rune receive address
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
    console.log(`Waiting till UTXO is detected at this Address: ${address}`);

    const utxos = await waitUntilUTXO(address as string)
    console.log(`Using UTXO ${utxos[0].txid}:${utxos[0].vout}`);

    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxos[0].txid,
        index: utxos[0].vout,
        witnessUtxo: { value: utxos[0].value, script: p2pktr.output! },
        tapInternalKey: toXOnly(keyPair.publicKey)
    });

    const mintstone = new Runestone([], none(), some(runeId), some(1));

    psbt.addOutput({
        script: mintstone.encipher(),
        value: 0
    });

    psbt.addOutput({
        address: "tb1pjzwn9z0q39y45adgsscy5q4mrl0wrav47lemwvk83gnjtwv3dggqzlgdsl", // rune receive address
        value: 5000
    });

    const fee = 5000;

    const change = utxos[0].value - fee - 5000;

    psbt.addOutput({
        address: "tb1pjzwn9z0q39y45adgsscy5q4mrl0wrav47lemwvk83gnjtwv3dggqzlgdsl", // change address
        value: change
    });



    await signAndSend(tweakedSigner, psbt, address as string);

}

async function mintWithP2pkh(runeId: RuneId) {

    const mintstone = new Runestone([], none(), some(runeId), some(1));

    const keyPair = ECPair.fromWIF(
        WIFprivateKey,
        network
    );

    const { address, } = payments.p2pkh({ pubkey: keyPair.publicKey, network })

    console.log('address:', address)

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
        address: "tb1qh9338ymus4tcsv7g0xptwx4ksjsujqmlq945cp", // rune receive address
        value: 10000
    });

    const fee = 5000;
    const change = utxos[0].value - fee - 10000;

    psbt.addOutput({
        address: "tb1qh9338ymus4tcsv7g0xptwx4ksjsujqmlq945cp", // change address
        value: change
    });

    await signAndSend(keyPair, psbt, address as string);
}

async function index() {
    console.log("start");
    const runeId: RuneId = new RuneId(2586233, 1009);

    // await mintWithP2wpkh(runeId);
    // await mintWithTaproot(runeId);
    // await mintWithP2pkh(runeId);
}

// main
index();