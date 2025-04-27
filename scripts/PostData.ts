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

