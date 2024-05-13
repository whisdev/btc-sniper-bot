import axios, { AxiosResponse } from "axios";

const blockstream = new axios.Axios({
    baseURL: `https://mempool.space/testnet/api`,
});

export async function broadcast(txHex: string) {
    const response: AxiosResponse<string> = await blockstream.post("/tx", txHex);
    return response.data;
}

export async function getTx(id: string): Promise<string> {
    const response: AxiosResponse<string> = await blockstream.get(
        `/tx/${id}/hex`
    );
    return response.data;
}

export function toXOnly(pubkey: Buffer): Buffer {
    return pubkey.subarray(1, 33);
}