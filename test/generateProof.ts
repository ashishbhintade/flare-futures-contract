import { ethers } from "hardhat";
import { keccak256, toUtf8Bytes } from "ethers";

export interface DataTransportObject {
    value: number;
    name: string;
}

export async function generateProof(
    input: DataTransportObject,
): Promise<any> {
    const abi = ethers.AbiCoder.defaultAbiCoder();

    // Encode the new DataTransportObject
    const encodedInput = abi.encode(
        ["tuple(uint256 value, string name)"],
        [[input.value, input.name]],
    );

    const proof = {
        merkleProof: [
            keccak256(toUtf8Bytes("dummy1")),
            keccak256(toUtf8Bytes("dummy2")),
        ],
        data: {
            attestationType: ethers.ZeroHash,
            sourceId: ethers.ZeroHash,
            votingRound: 1,
            lowestUsedTimestamp: 1234567890,
            requestBody: {
                url: "https://dummy.url",
                postprocessJq: ".data | .value",
                abi_signature: "tuple(uint256 value,string name)", // updated ABI signature
            },
            responseBody: {
                abi_encoded_data: encodedInput,
            },
        },
    };

    return proof;
}

export function decimalCorrection(input: DataTransportObject): DataTransportObject {
    return {
        value: input.value * 1000000,
        name: input.name,
    };
}