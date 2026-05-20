// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

contract ReportPayment {
    uint256 public constant REPORT_FEE = 1e18;

    mapping(address => mapping(bytes32 => bool)) public hasPurchased;

    event ReportPurchased(address indexed user, bytes32 indexed leaderId, uint256 amount, uint256 timestamp);

    function purchaseReport(bytes32 leaderId) external payable {
        require(msg.value == REPORT_FEE, "invalid report fee");
        require(!hasPurchased[msg.sender][leaderId], "report already purchased");

        hasPurchased[msg.sender][leaderId] = true;

        emit ReportPurchased(msg.sender, leaderId, msg.value, block.timestamp);
    }
}
