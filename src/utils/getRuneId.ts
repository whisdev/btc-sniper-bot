import axios from "axios";
import { OPENAPI_UNISAT_URL } from "../config/config";

const UNISAT_APIKEY = process.env.UNISAT_APIKEY;

export async function getRuneId(runeTick:string) {
    const data = await axios.get(
        `${OPENAPI_UNISAT_URL}/v1/indexer/runes/info-list`,
        {
            headers: {
                Authorization: `Bearer ${UNISAT_APIKEY}`,
            },
        }
    );

    const detail: any = data.data.data.detail;
    let runeId: string = "";

    for (const runedata in detail) {
        if (detail[runedata].rune == runeTick) {
            runeId = detail[runedata].runeid;
        }
    }
    return runeId;
}