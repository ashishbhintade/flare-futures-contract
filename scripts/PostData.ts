import { ethers } from "hardhat";
import {
    prepareAttestationRequestBase,
    retrieveDataAndProofBase,
    submitAttestationRequest,
} from "./Base";

const {
    JQ_VERIFIER_URL_TESTNET,
    JQ_VERIFIER_API_KEY_TESTNET,
    COSTON2_DA_LAYER_URL,
    FLARE_RPC_API_KEY,
} = process.env;

const omegaFuturesAddress = "0x52aC5bac822E07eD8318022707c0096ECa5A3422";

const postprocessJq = `{name: .name, price: (.price * 1000000)}`;
const abiSignature =
    `{"components":[{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"string","name":"name","type":"string"}],"internalType":"struct DataTransportObject","name":"dto","type":"tuple"}`;

const apiUrl = "https://flare-futures-contract.onrender.com";

// Configuration constants
const attestationTypeBase = "IJsonApi";
const sourceIdBase = "WEB2";
const verifierUrlBase = JQ_VERIFIER_URL_TESTNET;

async function prepareAttestationRequest(
    apiUrl: string,
    postprocessJq: string,
    abiSignature: string,
) {
    const requestBody = {
        url: apiUrl,
        postprocessJq: postprocessJq,
        abi_signature: abiSignature,
    };

    const url = `${verifierUrlBase}JsonApi/prepareRequest`;
    const apiKey = JQ_VERIFIER_API_KEY_TESTNET!;

    return await prepareAttestationRequestBase(
        url,
        apiKey,
        attestationTypeBase,
        sourceIdBase,
        requestBody,
    );
}

async function retrieveDataAndProof(
    abiEncodedRequest: string,
    roundId: number,
) {
    const url = `${COSTON2_DA_LAYER_URL}api/v1/fdc/proof-by-request-round-raw`;
    console.log("Url:", url, "n");
    return await retrieveDataAndProofBase(url, abiEncodedRequest, roundId);
}

async function main() {
    const commodities = [
        "brent-crude-oil",
        "crude-oil",
        "butter",
        "potato",
        "natural-gas",
        "gasoline",
        "heating-oil",
        "gold",
        "silver",
        "copper",
        "soybeans",
        "wheat",
        "coal",
        "steel",
        "cheese",
        "milk",
    ];

    for (let i = 0; i < commodities.length; i++) {
        const data = await prepareAttestationRequest(
            `${apiUrl}/${commodities[i]}`,
            postprocessJq,
            abiSignature,
        );
        console.log("Data:", data, "\n");

        const abiEncodedRequest = data.abiEncodedRequest;
        const roundId = await submitAttestationRequest(abiEncodedRequest);

        const proof = await retrieveDataAndProof(abiEncodedRequest, roundId);
        console.log(`Proof hex: ${proof}`);

        // A piece of black magic that allows us to read the response type from an artifact
        const IJsonApiVerification = await artifacts.require(
            "IJsonApiVerification",
        );
        const responseType =
            IJsonApiVerification._json.abi[0].inputs[0].components[1];
        console.log("Response type:", responseType, "\n");

        const decodedResponse = web3.eth.abi.decodeParameter(
            responseType,
            proof.response_hex,
        );
        console.log("Decoded proof:", decodedResponse, "\n");

        const OmegaFutures = await ethers.getContractAt(
            "OmegaFutures",
            omegaFuturesAddress,
        );
        const tx = await OmegaFutures.postData({
            merkleProof: proof.proof,
            data: decodedResponse,
        });

        console.log(`data posted for ${commodities[i]}: ${tx.hash}`);
    }
}

main().then(() => {
    process.exit(0);
});
