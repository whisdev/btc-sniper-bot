import {
    script,
    Psbt,
    initEccLib,
    networks,
    payments,
} from "bitcoinjs-lib";
import { Taptree } from "bitcoinjs-lib/src/types";
import { ECPairFactory, ECPairAPI } from "ecpair";
import ecc from "@bitcoinerlab/secp256k1";
import { Request, Response } from "express";
import {
    Rune,
    Runestone,
    EtchInscription,
    none,
    some,
    Terms,
    Range,
    Etching,
} from "runelib";
import { Buffer as Buff } from "bitcoinjs-lib/src/types";
import { getUtxoWithAddress } from "../utils/getUtxoWithAddress";
import { SeedWallet } from "../utils/getSeedWallet";
import { WIFWallet } from "../utils/getWifWallet";
import { signAndSend } from "../utils/signAndSend";
import { toXOnly } from "../utils/utils";
import { IFile } from "../types/types";
import MockWallet from "../utils/mockWallet";

import { receiveAddress, refundWallet } from "../config/config";

initEccLib(ecc as any);

const network = networks.testnet;
const networkType: string = "testnet";
const adminSEED: string = process.env.ADMIN_SEED as string;
// const adminWIF: string = process.env.ADMIN_WIF as string;
const runeName = process.env.RUNENAME ?? "";

const ECPair: ECPairAPI = ECPairFactory(ecc);
const mockWallet = new MockWallet();
mockWallet.init();

declare global {
    namespace Express {
        interface Request {
            files: Record<string, any>;
        }
    }
}

export async function etchController() {
    const wallet = new SeedWallet({ networkType: networkType, seed: adminSEED });
    const keyPair = wallet.ecPair;

    const ins = new EtchInscription();

    ins.setContent("text/plain", Buffer.from("RuneTestSakele", "utf-8"));
    ins.setRune(runeName);

    const etching_script_asm = `${toXOnly(keyPair.publicKey).toString(
        "hex"
    )} OP_CHECKSIG`;

    const etching_script = Buffer.concat([
        script.fromASM(etching_script_asm),
        ins.encipher(),
    ]);

    const scriptTree: Taptree = {
        output: etching_script,
    };

    const script_p2tr = payments.p2tr({
        internalPubkey: toXOnly(keyPair.publicKey),
        scriptTree,
        network,
    });

    const etching_redeem = {
        output: etching_script,
        redeemVersion: 192,
    };

    const etching_p2tr = payments.p2tr({
        internalPubkey: toXOnly(keyPair.publicKey),
        scriptTree,
        redeem: etching_redeem,
        network,
    });

    const address = script_p2tr.address ?? "";
    console.log("send coin to address", address);

    const utxos = await getUtxoWithAddress(address as string);
    console.log(`Using UTXO ========> ${utxos[0].txid}:${utxos[0].vout}`);

    const psbt = new Psbt({ network });

    psbt.addInput({
        hash: utxos[0].txid,
        index: utxos[0].vout,
        witnessUtxo: { value: utxos[0].value, script: script_p2tr.output! },
        tapLeafScript: [
            {
                leafVersion: etching_redeem.redeemVersion,
                script: etching_redeem.output,
                controlBlock: etching_p2tr.witness![etching_p2tr.witness!.length - 1],
            },
        ],
    });

    const rune = Rune.fromName(runeName);

    const terms = new Terms(
        1000,
        10000,
        new Range(none(), none()),
        new Range(none(), none())
    );

    const etching = new Etching(
        some(1),
        some(1000000),
        some(rune),
        none(),
        some("$"),
        some(terms),
        true
    );

    const stone = new Runestone([], some(etching), none(), none());

    psbt.addOutput({
        script: stone.encipher(),
        value: 0,
    });

    const fee = 18000;

    const change = utxos[0].value - 546 - fee;

    psbt.addOutput({
        address: buyerWallet, // change address
        value: 546,
    });

    psbt.addOutput({
        address: refundWallet, // change address
        value: change,
    });

    await signAndSend(keyPair, psbt, address as string);
}

export async function imgEtchController(req: Request, res: Response) {
    if (!req.files || Object.keys(req.files).length === 0) {
        return res.status(400).json({ msg: 'No file uploaded' });
    }
    const file: IFile = req.files?.file as IFile;
    const mimetype: any = file?.mimetype;
    const data: any = file?.data;

    const marker = Buff.encode("ord");
    const type = Buff.encode(mimetype);
    console.log('mimetype====> ', mimetype)
    console.log('data====> ', data)

    const script = [
        mockWallet.pubkey,
        "OP_CHECKSIG",
        "OP_0",
        "OP_IF",
        marker,
        "01",
        type,
        "OP_0",
        data,
        "OP_ENDIF",
    ];
    const tx: any = await inscribe(script, receiveAddress);

    return tx;
    // res.send({ tx: txId })
}