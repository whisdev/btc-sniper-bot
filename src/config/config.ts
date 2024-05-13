import dotenv from "dotenv";

dotenv.config();

export const testVersion = process.env.TESTNET;
export const OPENAPI_UNISAT_URL = testVersion
  ? "https://open-api-testnet.unisat.io"
  : "https://open-api.unisat.io";

export const OPENAPI_URL = testVersion
  ? "https://api-testnet.unisat.io/wallet-v4"
  : "https://api.unisat.io/wallet-v4";

export const OPENAPI_UNISAT_TOKEN = process.env.UNISAT_TOKEN;
export const SIGNATURE_SIZE = 126;
export const SERVICE_FEE_PERCENT = 3;
export const ADMIN_PAYMENT_ADDRESS: string = process.env
  .ADMIN_PAYMENT_ADDRESS as string;

export enum WalletTypes {
  UNISAT = "Unisat",
  XVERSE = "Xverse",
  HIRO = "Hiro",
  OKX = "Okx",
}

export enum RaffleStatus {
  PENDING = 0,
  START = 1,
  CANFINISH = 2,
  END = 3,
}

export const TOKEN_PRICE = 100;

export const receiveAddress = "tb1pxrk8ml0p0e0sesr6njhcdxnzj6ptjj7h39767m6f7amjtdw5sazsv34u5n";
export const refundWallet = "tb1pxrk8ml0p0e0sesr6njhcdxnzj6ptjj7h39767m6f7amjtdw5sazsv34u5n";

export const config = {
  defaultOutput: 546,
  txRate: 40,
  mempoolNetwork: "testnet/",
  encodedAddressPrefix: "testnet",
  amount: 1,
  tick: "TICK",
  max: 21000000,
  lim: 21000000,
  dec: 8,
  mintAmount: 1000,
  transferAmount: 100,
};