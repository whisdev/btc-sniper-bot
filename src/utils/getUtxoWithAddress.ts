import axios, { AxiosResponse } from "axios";

const blockstream = new axios.Axios({
    baseURL: `https://mempool.space/testnet/api`,
});

export async function getUtxoWithAddress(address: string) {
    return new Promise<IUTXO[]>((resolve, reject) => {
        let intervalId: any;
        const checkForUtxo = async () => {
            try {
                const response: AxiosResponse<string> = await blockstream.get(
                    `/address/${address}/utxo`
                );
                const data: IUTXO[] = response.data
                    ? JSON.parse(response.data)
                    : undefined;
                // console.log(data);
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

interface IUTXO {
    txid: string;
    vout: number;
    status: {
        confirmed: boolean;
        block_height: number;
        block_hash: string;
        block_time: number;
    };
    value: number;
}