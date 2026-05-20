// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

interface IBondVault {
    function submitRiskUpdate(uint256 bondId, uint16 riskScoreBps, bytes32 reportHash) external;
}

contract RiskOracleAdapter is Ownable {
    address public bondVault;
    mapping(address => bool) public isAuthorizedOracle;

    event OracleAdded(address indexed oracle);
    event OracleRemoved(address indexed oracle);
    event RiskUpdateForwarded(uint256 indexed bondId, uint16 riskScoreBps, bytes32 reportHash, address indexed oracle);

    constructor(address bondVault_) Ownable(msg.sender) {
        require(bondVault_ != address(0), "invalid bond vault");

        bondVault = bondVault_;
    }

    function addOracle(address oracle) external onlyOwner {
        require(oracle != address(0), "invalid oracle");

        isAuthorizedOracle[oracle] = true;

        emit OracleAdded(oracle);
    }

    function removeOracle(address oracle) external onlyOwner {
        isAuthorizedOracle[oracle] = false;

        emit OracleRemoved(oracle);
    }

    function submitRiskUpdate(uint256 bondId, uint16 riskScoreBps, bytes32 reportHash) external {
        require(isAuthorizedOracle[msg.sender], "oracle not authorized");

        IBondVault(bondVault).submitRiskUpdate(bondId, riskScoreBps, reportHash);

        emit RiskUpdateForwarded(bondId, riskScoreBps, reportHash, msg.sender);
    }
}
