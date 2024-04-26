import { HardhatUserConfig, task } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

const ETHERSCAN_API_KEY = process.env.HH_ETHERSCAN_API_KEY || '';

task("deploy")
  .addParam("contract")
  .addOptionalParam("contractargs", "", "")
  .setAction(async (args, hre) => {
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const contractArgs = JSON.parse(args.contractargs || "[]")
    const contract = await hre.ethers.deployContract(args.contract, contractArgs);

    const res = await contract.waitForDeployment();

    const deployedAddress = res.target;
    console.log(JSON.stringify({
      type: 'contract_address',
      data: {
        address: deployedAddress
      }
    }))
  })

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    }
  },
  etherscan: {
    apiKey: {
      sepolia: ETHERSCAN_API_KEY
    }
  }
};

export default config;
