// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {ReportPayment} from "../src/ReportPayment.sol";

contract ReportPaymentTest is Test {
    ReportPayment private payment;

    bytes32 private constant LEADER_ID = bytes32("leader_01");
    address private user = makeAddr("user");

    event ReportPurchased(address indexed user, bytes32 indexed leaderId, uint256 amount, uint256 timestamp);

    function setUp() public {
        payment = new ReportPayment();
        deal(user, 10 ether);
    }

    function testPurchaseReport() public {
        uint256 reportFee = payment.REPORT_FEE();

        vm.expectEmit(true, true, false, true, address(payment));
        emit ReportPurchased(user, LEADER_ID, reportFee, block.timestamp);

        vm.prank(user);
        payment.purchaseReport{value: reportFee}(LEADER_ID);

        assertTrue(payment.hasPurchased(user, LEADER_ID));
    }

    function testRevertPurchaseReportZeroValue() public {
        vm.prank(user);
        vm.expectRevert("invalid report fee");

        payment.purchaseReport{value: 0}(LEADER_ID);
    }

    function testRevertPurchaseReportWrongValue() public {
        vm.prank(user);
        vm.expectRevert("invalid report fee");

        payment.purchaseReport{value: 2e18}(LEADER_ID);
    }

    function testRevertDuplicatePurchase() public {
        uint256 reportFee = payment.REPORT_FEE();

        vm.startPrank(user);
        payment.purchaseReport{value: reportFee}(LEADER_ID);

        vm.expectRevert("report already purchased");
        payment.purchaseReport{value: reportFee}(LEADER_ID);
        vm.stopPrank();
    }
}
