import { Network, Tenderly, TransactionParameters } from "@tenderly/sdk";
import axios from "axios";
import * as dotenv from "dotenv";
import { Wallet, ethers, providers } from "ethers";
import { readFileSync, writeFileSync } from "fs";
import runLatest from "./broadcast/DeployTestnet.s.sol/31337/run-latest.json";

dotenv.config();

const { TENDERLY_USER, TENDERLY_PROJECT, TENDERLY_ACCESS_KEY } = process.env;
const API_URL = `https://api.tenderly.co/api/v1/account/${TENDERLY_USER}/project/${TENDERLY_PROJECT}/`;

const [
  deployGreeterTx,
  setGreetingTx,
  deployVeFxsVotingDelegation,
  deployTimelockController,
  deployFraxGovernorAlpha,
  grantProposer,
  grantExecutor,
  grantCanceller,
  renounceNounceRole,
  deployFraxGovOmega,
  deployFraxGuard,
] = runLatest.transactions;

function forgeTxToTxParameters(tx: (typeof runLatest)["transactions"][number]): TransactionParameters {
  const { transaction } = tx;

  return {
    to: transaction.to ?? ethers.constants.AddressZero,
    from: transaction.from,
    gas: +transaction.gas,
    value: "value" in transaction ? +transaction.value : 0,
    gas_price: "0",
    input: transaction.data,
  };
}

function saveLog(fileName: string, data: any) {
  writeFileSync(fileName, JSON.stringify(data, null, 2));
}

function forgeTxToEthersInput(tx: (typeof runLatest)["transactions"][number]): ethers.providers.TransactionRequest {
  const {
    transaction: { gas, type, ...txInfo },
  } = tx;

  return txInfo;
}

async function verifyContract(address: string) {
  const tenderlyInstance = new Tenderly({
    accessKey: TENDERLY_ACCESS_KEY as string,
    accountName: TENDERLY_USER as string,
    projectName: TENDERLY_PROJECT as string,
    network: Network.MAINNET,
  });

  const result = await tenderlyInstance.contracts.verify(address, {
    config: {
      mode: "public",
    },
    contractToVerify: "Greeter.sol:Greeter",
    solc: {
      version: "v0.8.19",
      sources: {
        "Greeter.sol": {
          content: readFileSync("src/Greeter.sol", "utf8"),
        },
      },
      settings: {
        libraries: {},
        optimizer: {
          enabled: false,
          runs: 5000,
        },
      },
    },
  });
  saveLog("verify.json", result);
}

async function simulateTx(tx: TransactionParameters) {
  console.log("tx", tx);
  const resp = await axios.post(
    API_URL + "simulate",
    {
      save: true, // if true simulation is saved and shows up in the dashboard
      save_if_fails: true, // if true, reverting simulations show up in the dashboard
      simulation_type: "full", // full or quick (full is default)
      network_id: "1", // network to simulate on
      ...tx,
    },
    {
      headers: {
        "X-Access-Key": TENDERLY_ACCESS_KEY as string,
      },
    }
  );
  saveLog("simulate.json", resp.data);
  return resp.data;
}

async function createFork() {
  return await axios.post(
    API_URL + "fork",
    {
      network_id: "1",
      chain_config: {
        chain_id: 11,
        shanghai_time: 1677557088,
      },
    },
    {
      headers: {
        "X-Access-Key": TENDERLY_ACCESS_KEY as string,
      },
    }
  );
}

async function dealEth(provider: providers.JsonRpcProvider, address: string) {
  const result = await provider.send("tenderly_setBalance", [
    [address],
    ethers.utils.hexValue(ethers.utils.parseUnits("100", "ether").toHexString()),
  ]);
  return result;
}

const FORK = "9c77c92d-908e-4d8e-9442-66f741e9346d";

const main = async () => {
  const forkId = FORK ? FORK : (await createFork()).data.simulation_fork.id;
  console.log("forkId", forkId);
  const rpcUrl = `https://rpc.tenderly.co/fork/${forkId}`;

  console.log("Fork URL\n\t" + rpcUrl);

  const wallet = new Wallet(process.env.PK as string);

  const provider = new providers.JsonRpcProvider(rpcUrl);

  //   await dealEth(provider, wallet.address);

  //   //deployTimelockController, deployFraxGovernorAlpha
  //   [deployGreeterTx].forEach(async (input, i) => {
  //     const tx = await wallet.connect(provider).sendTransaction(forgeTxToEthersInput(input));
  //     const receipt = await tx.wait();
  //     writeFileSync("tx" + i + ".json", JSON.stringify(tx, null, 2));
  //     writeFileSync("receipt" + i + ".json", JSON.stringify(receipt, null, 2));
  //     const { contractAddress } = receipt;
  //     console.log("contractAddress", contractAddress);
  //     await verifyContract(contractAddress);
  //   });

  //   await simulateTx({ ...forgeTxToTxParameters(setGreetingTx), to: "0x245e77e56b1514d77910c9303e4b44ddb44b788c" });
  const { nonce, ...unsentTx } = {
    gas: "0x0",
    gasPrice: "0x0",
    ...forgeTxToEthersInput(setGreetingTx),
    to: "0x245e77e56b1514d77910c9303e4b44ddb44b788c",
  };
  const response = await provider.send("tenderly_simulateTransaction", [unsentTx, "latest"]);
  saveLog("response.json", response);
};

main();
