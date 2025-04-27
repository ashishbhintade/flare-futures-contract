// SPDX-License-Identifier: MIT
pragma solidity ^0.8.25;

import {ERC20} from "@openzeppelin/contracts/token/ERC20/ERC20.sol";

contract USDT is ERC20 {
    constructor() ERC20("Tether USDT", "USDT") {}

    function mint(uint256 amount) external {
        _mint(msg.sender, amount);
    }
}
