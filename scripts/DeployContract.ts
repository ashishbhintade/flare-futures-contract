import { ethers, run, web3 } from "hardhat";

async function deployContract() {
    const USDT = await ethers.getContractFactory("USDT");
    const usdt = await USDT.deploy();
    await usdt.waitForDeployment();

    const usdtAddress = await usdt.getAddress();
    console.log(`USDT token deployed to: ${usdtAddress}`);

    await run("verify:verify", {
        address: usdtAddress,
        constructorArguments: [],
    });

    const name = "Omega Futures";
    const symbol = "OFTU";

    const OmegaFutures = await ethers.getContractFactory("OmegaFutures");
    const omegaFutures = await OmegaFutures.deploy(usdtAddress, name, symbol);
    await omegaFutures.waitForDeployment();

    const omegaFuturesAddress = await omegaFutures.getAddress();
    console.log(`Omega Futures contract deployed to: ${omegaFuturesAddress}`);

    await run("verify:verify", {
        address: omegaFuturesAddress,
        constructorArguments: [usdtAddress, name, symbol],
    });
}

async function main() {
    await deployContract();
}

main().then(() => {
    process.exit(0);
});
