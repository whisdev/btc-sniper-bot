import {
    Psbt,
    initEccLib,
    networks,
    opcodes,
    payments,
    address as Address
} from "bitcoinjs-lib";
import { ECPairFactory, ECPairAPI } from "ecpair";
import ecc from "@bitcoinerlab/secp256k1";
import {
    Runestone,
    none,
    some,
    RuneId,
} from "runelib";

import { getUtxoWithAddress } from "../utils/getUtxoWithAddress";
import { SeedWallet } from "../utils/getSeedWallet";
// import { WIFWallet } from "../utils/getWifWallet";
import { signAndSend } from "../utils/signAndSend";
import { getTx, toXOnly } from "../utils/utils";
import { tweakSigner } from "../utils/tweakSigner";
import { getRuneId } from "../utils/getRuneId";

initEccLib(ecc as any);
const ECPair: ECPairAPI = ECPairFactory(ecc);

const network = networks.testnet;
const networkType: string = "testnet";
const adminSEED: string = process.env.ADMIN_SEED as string;
// const adminWIF: string = process.env.ADMIN_WIF as string;
const runeName = process.env.RUNENAME ?? "";

export async function mintWithP2wpkh() {
    const runeId = getRuneId(runeName);
    const wallet = new SeedWallet({ networkType: networkType, seed: adminSEED });

    // const wallet = new WIFWallet({ networkType: networkType, privateKey: privateKey });

    const mintstone = new Runestone([], none(), some(runeId), some(1));

    const keyPair = wallet.ecPair;

    const { address, } = payments.p2wpkh({ pubkey: keyPair.publicKey, network })

    console.log('address:', address)

    const utxos = await getUtxoWithAddress(address as string)
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

export async function mintWithTaproot() {

    const wallet = new SeedWallet({ networkType: networkType, seed: adminSEED });
    // const wallet = new WIFWallet({ networkType: networkType, privateKey: privateKey });

    const keyPair = wallet.ecPair;
    const mintstone = new Runestone([], none(), some(new RuneId(2586233, 1009)), some(1));


    const tweakedSigner = tweakSigner(keyPair, { network });
    // Generate an address from the tweaked public key
    const p2pktr = payments.p2tr({
        pubkey: toXOnly(tweakedSigner.publicKey),
        network
    });
    const address = p2pktr.address ?? "";
    console.log(`Waiting till UTXO is detected at this Address: ${address}`);

    const utxos = await getUtxoWithAddress(address as string)
    console.log(`Using UTXO ${utxos[0].txid}:${utxos[0].vout}`);

    const psbt = new Psbt({ network });
    psbt.addInput({
        hash: utxos[0].txid,
        index: utxos[0].vout,
        witnessUtxo: { value: utxos[0].value, script: p2pktr.output! },
        tapInternalKey: toXOnly(keyPair.publicKey)
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

    await signAndSend(tweakedSigner, psbt, address as string);

}

export async function mintWithP2pkh() {

    const mintstone = new Runestone([], none(), some(new RuneId(2586233, 1009)), some(1));

    const keyPair = ECPair.fromWIF(
        "cPwrst1ya98KhMRc5Bbj3MPB9AjQWvMAxjxQDWzv2Ak2Bq4EoXYP",
        network
    );

    const { address, } = payments.p2pkh({ pubkey: keyPair.publicKey, network })

    console.log('address:', address)

    const utxos = await getUtxoWithAddress(address as string)
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
