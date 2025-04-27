// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.25;

import {IJsonApi} from "@flarenetwork/flare-periphery-contracts/coston/IJsonApi.sol";
import {ContractRegistry} from "@flarenetwork/flare-periphery-contracts/coston/ContractRegistry.sol";

import {IERC20} from "@openzeppelin/contracts/token/ERC20/IERC20.sol";
import {ERC721} from "@openzeppelin/contracts/token/ERC721/ERC721.sol";

struct DataTransportObject {
    uint256 value;
    string name;
}

contract OmegaFutures is ERC721 {
    IERC20 s_token;
    uint256 public s_currentTokenID;

    mapping(string => uint256) public commodities;
    mapping(uint256 => ContractDetails) public contractDetails;

    enum Status {
        Created,
        Fullfilled,
        Redeemed
    }

    struct Commodity {
        uint256 value;
        string name;
        bool isLong;
        uint256 expiry;
    }

    struct ContractDetails {
        address buyer;
        uint256 currentPrice;
        uint256 trigger;
        uint256 expiry;
        Status status;
        bool isLong;
        string commodity;
    }

    constructor(address token, string memory name_, string memory symbol_) ERC721(name_, symbol_) {
        s_token = IERC20(token);
    }

    // create future contract
    function createContract(Commodity calldata commodity) external {
        // check given price is not zero
        require(commodity.value != 0, "trigger price can't be zero");

        // get current price
        uint256 currentPrice = commodities[commodity.name];

        // transfer amount from msg.sender to this contract
        s_token.transferFrom(msg.sender, address(this), commodity.value * 1e12);

        // save contract details
        contractDetails[s_currentTokenID] = ContractDetails({
            buyer: address(0),
            currentPrice: currentPrice,
            trigger: commodity.value,
            expiry: commodity.expiry,
            status: Status.Created,
            isLong: commodity.isLong,
            commodity: commodity.name
        });

        // mint contract
        _safeMint(msg.sender, s_currentTokenID);

        s_currentTokenID++;

        // emit event
    }

    // buy contract
    function buyContract(uint256 id) external {
        // get contract
        ContractDetails storage details = contractDetails[id];

        // check expiry
        require(block.timestamp < details.expiry, "can't buy expired contract");

        // transfer tokens
        if (details.isLong) {
            s_token.transferFrom(msg.sender, address(this), (details.trigger - details.currentPrice) * 1e12);
        } else {
            s_token.transferFrom(msg.sender, address(this), (details.currentPrice - details.trigger) * 1e12);
        }

        // udpate contract details
        details.buyer = msg.sender;
        details.status = Status.Fullfilled;
    }

    // update contract
    function updateContract(uint256 id) external {
        // get contract
        ContractDetails storage details = contractDetails[id];

        uint256 currentPrice = commodities[details.commodity];

        if (details.isLong) {
            if (details.trigger <= currentPrice) {
                // update status
                details.status = Status.Redeemed;

                // send tokens to owner
                s_token.transfer(ownerOf(id), details.trigger - details.currentPrice);
            }
        } else {
            if (details.trigger >= currentPrice) {
                // update status
                details.status = Status.Redeemed;

                // send tokens to owner
                s_token.transfer(ownerOf(id), details.currentPrice - details.trigger);
            }
        }

        // check expiry
        if (details.expiry <= block.timestamp) {
            s_token.transfer(ownerOf(id), details.currentPrice);
            if (details.currentPrice < details.trigger) {
                s_token.transfer(details.buyer, details.trigger - details.currentPrice);
            } else {
                s_token.transfer(details.buyer, details.currentPrice - details.trigger);
            }
        }
    }

    // data

    function postData(IJsonApi.Proof calldata data) external {
        // decode data
        DataTransportObject memory dto = abi.decode(data.data.responseBody.abi_encoded_data, (DataTransportObject));

        // udpate mapping
        commodities[dto.name] = dto.value;
    }

    function isJsonApiProofValid(IJsonApi.Proof calldata _proof) private view returns (bool) {
        // Inline the check for now until we have an official contract deployed
        return ContractRegistry.auxiliaryGetIJsonApiVerification().verifyJsonApi(_proof);
    }

    function abiSignatureHack(DataTransportObject calldata dto) public pure {}
}
