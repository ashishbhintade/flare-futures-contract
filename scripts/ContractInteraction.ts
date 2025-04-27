import { ethers, run, web3 } from "hardhat";
import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { Contract } from "ethers";
import { decimalCorrection, generateProof } from "../test/generateProof";

const usdtAddress = "0xb0596355d1C42A6f001d8B44ADBDDF6658995110";
const omegaFuturesAddress = "0x52aC5bac822E07eD8318022707c0096ECa5A3422";

const commoArr = [
    {
        value: 17.50,
        name: "Potato",
    },
    {
        value: 67.00,
        name: "Crude Oil",
    },
    {
        value: 7413.00,
        name: "Butter",
    },
];

async function mintToken(usdt: Contract) {
    const tx = await usdt.mint(ethers.parseUnits("1000000", 18));
    console.log(`Transaction hash for token mint: ${tx.hash}`);
}
async function postTempData(omegaFutures: Contract) {
    for (let i = 0; i < commoArr.length; i++) {
        let proof = await generateProof(decimalCorrection(commoArr[0]));
        const tx = await omegaFutures.postData(proof);
        console.log(`The transaction hash for data post ${i}: ${tx.hash}`);
    }
}
async function createContract(
    omegaFutures: Contract,
    signer: HardhatEthersSigner,
) {
    let block = await ethers.provider.getBlock("latest");
    const now = block?.timestamp;

    if (now === null || now === undefined) {
        throw new Error("Failed to retrieve block timestamp");
    }
    const totalContracts = 8; // 4 longs + 4 shorts

    for (let i = 0; i < totalContracts; i++) {
        const isLong = i < 4; // first 4 are long, next 4 are short
        const commo = commoArr[i % commoArr.length];

        // Random delta: up to 20% of original value
        const deltaPercent = Math.random() * 0.2; // 0% to 20%
        const delta = commo.value * deltaPercent;

        // Adjust value based on isLong
        let adjustedValue: number;
        if (isLong) {
            adjustedValue = commo.value + delta;
        } else {
            adjustedValue = Math.max(0, commo.value - delta); // avoid negative
        }

        // Random expiry: between 7 days and 30 days
        const minExpiry = 7 * 24 * 60 * 60; // 7 days
        const maxExpiry = 30 * 24 * 60 * 60; // 30 days
        const randomExpiryDelta = Math.floor(
            minExpiry + Math.random() * (maxExpiry - minExpiry),
        );

        const expiry = now + randomExpiryDelta;

        const createContractInput = {
            value: Math.floor(adjustedValue * 1_000_000), // scale it
            name: commo.name,
            isLong,
            expiry,
        };

        const tx = await omegaFutures.createContract(createContractInput, {
            gasLimit: 1_000_000,
        });

        console.log(
            `Created contract ${i + 1}/${totalContracts} | Hash: ${tx.hash}`,
        );
    }
}
async function buyContract(omegaFutures: Contract) {
    await omegaFutures.buyContract(1);
}

async function main() {
    const omegaFutures = await ethers.getContractAt(
        "OmegaFutures",
        omegaFuturesAddress,
    );

    const usdt = await ethers.getContractAt(
        "USDT",
        usdtAddress,
    );

    const [signer] = await ethers.getSigners();
    console.log(`Signer address: ${signer.address}`);

    // await usdt.approve(omegaFuturesAddress, ethers.MaxUint256);

    // await mintToken(usdt);
    // await postTempData(omegaFutures);
    // await createContract(omegaFutures, signer);
    await buyContract(omegaFutures);
}

main().then(() => {
    process.exit(0);
});
