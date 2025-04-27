import { ethers } from "hardhat";
import {
    loadFixture,
    time,
} from "@nomicfoundation/hardhat-toolbox/network-helpers";

import { expect } from "chai";
import { decimalCorrection, generateProof } from "./generateProof";

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

describe("OmegaFutures", async function () {
    async function deployOmegaFuturesFixture() {
        let signers = await ethers.getSigners();

        let [owner, user1, user2, user3] = signers;

        // deploy USDT token contract
        let USDT = await ethers.getContractFactory("USDT");
        let usdt = await USDT.deploy();
        await usdt.waitForDeployment();

        // get usdt address
        let usdtAddres = await usdt.getAddress();

        // NFT details
        const name = "Omega Futures";
        const symbol = "OFTU";

        // deploy omega futures
        let OmegaFutures = await ethers.getContractFactory("OmegaFutures");
        let omegaFutures = await OmegaFutures.deploy(usdtAddres, name, symbol);
        await omegaFutures.waitForDeployment();

        // get omega futures address
        let omegaFuturesAddress = await omegaFutures.getAddress();

        // mint tokens for all the users
        const amount = ethers.parseUnits("1000000", 18);
        await usdt.mint(amount);
        await usdt.approve(omegaFuturesAddress, amount);
        // @ts-ignore
        await usdt.connect(user1).mint(amount);
        await usdt.connect(user1).approve(omegaFuturesAddress, amount);
        // @ts-ignore
        await usdt.connect(user2).mint(amount);
        await usdt.connect(user2).approve(omegaFuturesAddress, amount);
        // @ts-ignore
        await usdt.connect(user3).mint(amount);
        await usdt.connect(user3).approve(omegaFuturesAddress, amount);

        // update data for few commodities
        let proof = await generateProof(
            decimalCorrection(commoArr[0]),
        );
        await omegaFutures.postData(proof);

        proof = await generateProof(
            decimalCorrection(commoArr[1]),
        );
        await omegaFutures.postData(proof);

        proof = await generateProof(
            decimalCorrection(commoArr[2]),
        );
        await omegaFutures.postData(proof);

        return { omegaFutures, usdt, owner, user1, user2, user3, name, symbol };
    }

    describe("Deployment", async function () {
        it("should have set correct parameter", async function () {
            const { omegaFutures, name, symbol } = await loadFixture(
                deployOmegaFuturesFixture,
            );

            const actualName = await omegaFutures.name();
            const actualSymbol = await omegaFutures.symbol();

            expect(actualName).to.be.equal(name);
            expect(actualSymbol).to.be.equal(symbol);
        });
    });

    describe("Create Contract", async function () {
        it("should create contract", async function () {
            const { omegaFutures, owner } = await loadFixture(
                deployOmegaFuturesFixture,
            );

            const triggerPrice = (commoArr[0].value + 1.5) * 1000000;
            const expiry = (await time.latest()) + 1000000;

            const createContractInput = {
                value: triggerPrice,
                name: commoArr[0].name,
                isLong: true,
                expiry: expiry,
            };

            await omegaFutures.createContract(createContractInput);

            let expectedTotalSupply = 1;

            expect(await omegaFutures.s_currentTokenID()).to.be.equal(
                expectedTotalSupply,
                "wrong incorrect total supply",
            );

            let currentPrice = await omegaFutures.commodities(commoArr[0].name);

            const details = {
                buyer: ethers.ZeroHash,
                currentPrice: currentPrice,
                trigger: triggerPrice,
                expiry: expiry,
                status: 0,
                isLong: true,
                commodity: commoArr[0].name,
            };

            const actualDetails = await omegaFutures.contractDetails(0);

            expect(actualDetails).to.be.equal(
                actualDetails,
                "contract details don't match",
            );
            expect(await omegaFutures.ownerOf(0)).to.be.equal(owner.address);
        });

        it("should revert on zero trigger value", async function () {
            const { omegaFutures } = await loadFixture(
                deployOmegaFuturesFixture,
            );

            const triggerPrice = 0;
            const expiry = (await time.latest()) + 1000000;

            const createContractInput = {
                value: triggerPrice,
                name: commoArr[0].name,
                isLong: true,
                expiry: expiry,
            };

            await expect(omegaFutures.createContract(createContractInput)).to.be
                .revertedWith("trigger price can't be zero");
        });
    });

    describe("Buy Contract", async function () {
        async function buyContractFixture() {
            let {
                omegaFutures,
                usdt,
                owner,
                user1,
                user2,
                user3,
                name,
                symbol,
            } = await loadFixture(deployOmegaFuturesFixture);

            const triggerPrice = (commoArr[0].value + 1.5) * 1000000;
            const expiry = (await time.latest()) + 1000000;

            const createContractInput = {
                value: triggerPrice,
                name: commoArr[0].name,
                isLong: true,
                expiry: expiry,
            };

            await omegaFutures.createContract(createContractInput);

            return {
                omegaFutures,
                usdt,
                owner,
                user1,
                user2,
                user3,
                name,
                symbol,
            };
        }

        it("should allow user to buy contract", async function () {
            const { omegaFutures, usdt, user1 } = await loadFixture(
                buyContractFixture,
            );

            let actualDetails = await omegaFutures.contractDetails(0);

            let tx = await omegaFutures.connect(user1).buyContract(0);
            expect(tx).to.emit(usdt, "Transfer").withArgs(
                user1.address,
                await omegaFutures.getAddress(),
                actualDetails.trigger - actualDetails.currentPrice,
            );

            actualDetails = await omegaFutures.contractDetails(0);

            expect(actualDetails.buyer).to.be.equal(user1.address);
            
        });
    });
});
