export interface IUtxo {
  txid: string;
  vout: number;
  value: number;
  scriptpubkey?: string;
}

export interface IInscriptionInfo {
  inscriptionId: string;
  amount: number;
  ownerPaymentAddress: string;
  ownerOrdinalAddress: string;
}

export interface IFile {
  mimetype: string,
  data: Buffer
}

export interface IUtxo {
  txid: string;
  vout: number;
  value: number;
}
