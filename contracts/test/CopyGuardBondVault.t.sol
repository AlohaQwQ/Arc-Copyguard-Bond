// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LeaderRegistry} from "../src/LeaderRegistry.sol";
import {CopyGuardBondVault} from "../src/CopyGuardBondVault.sol";
import {RiskOracleAdapter} from "../src/RiskOracleAdapter.sol";

contract CopyGuardBondVaultTest is Test {
    LeaderRegistry private registry;
    CopyGuardBondVault private vault;
    RiskOracleAdapter private adapter;

    bytes32 private constant LEADER_ID = bytes32("leader_01");
    uint256 private constant BOND_AMOUNT = 1e18;
    uint16 private constant THRESHOLD_BPS = 7000;

    address private follower = makeAddr("follower");
    address private leaderWallet = makeAddr("leader");
    address private oracle = makeAddr("oracle");
    address private nonOwner = makeAddr("nonOwner");

    event BondCreated(uint256 indexed bondId, address indexed follower, bytes32 indexed leaderId, uint256 amount);
    event RiskUpdated(uint256 indexed bondId, uint16 riskScoreBps, bytes32 reportHash);
    event BondWarned(uint256 indexed bondId, uint16 riskScoreBps);
    event BondSlashed(uint256 indexed bondId, uint256 slashedAmount);
    event BondRefunded(uint256 indexed bondId, uint256 amount);
    event BondSettled(uint256 indexed bondId);

    receive() external payable {}

    function setUp() public {
        registry = new LeaderRegistry();
        vault = new CopyGuardBondVault(address(registry));
        adapter = new RiskOracleAdapter(address(vault));

        vault.setRiskOracleAdapter(address(adapter));
        registry.registerLeader(LEADER_ID, "Hyperliquid", leaderWallet, bytes32(0));
        adapter.addOracle(oracle);

        deal(follower, 10 ether);
    }

    function testCreateBond() public {
        uint256 expiry = block.timestamp + 30 days;

        vm.expectEmit(true, true, true, true, address(vault));
        emit BondCreated(1, follower, LEADER_ID, BOND_AMOUNT);

        _createBond(expiry);

        (
            uint256 id,
            address bondFollower,
            ,
            uint256 amount,
            ,
            ,
            ,
            ,
            ,
            CopyGuardBondVault.BondState state
        ) = vault.bonds(1);

        assertEq(id, 1);
        assertEq(bondFollower, follower);
        assertEq(amount, BOND_AMOUNT);
        assertEq(uint256(state), uint256(CopyGuardBondVault.BondState.Active));
        assertEq(vault.nextBondId(), 2);
    }

    function testRevertCreateBondZeroValue() public {
        vm.prank(follower);
        vm.expectRevert("amount required");

        vault.createBond{value: 0}(LEADER_ID, THRESHOLD_BPS, block.timestamp + 30 days);
    }

    function testSubmitRiskUpdate() public {
        _createBond(block.timestamp + 30 days);
        bytes32 reportHash = keccak256("report-1");

        vm.expectEmit(true, false, false, true, address(vault));
        emit RiskUpdated(1, 5000, reportHash);

        vm.prank(oracle);
        adapter.submitRiskUpdate(1, 5000, reportHash);

        (, , , , , , , uint16 lastRiskScoreBps, bytes32 lastReportHash, ) = vault.bonds(1);
        assertEq(lastRiskScoreBps, 5000);
        assertEq(lastReportHash, reportHash);
    }

    function testAutoWarnOnHighRisk() public {
        _createBond(block.timestamp + 30 days);
        bytes32 reportHash = keccak256("report-high-risk");

        vm.expectEmit(true, false, false, true, address(vault));
        emit RiskUpdated(1, 8000, reportHash);
        vm.expectEmit(true, false, false, true, address(vault));
        emit BondWarned(1, 8000);

        vm.prank(oracle);
        adapter.submitRiskUpdate(1, 8000, reportHash);

        (, , , , , , , , , CopyGuardBondVault.BondState state) = vault.bonds(1);
        assertEq(uint256(state), uint256(CopyGuardBondVault.BondState.Warned));
    }

    function testNoWarnOnLowRisk() public {
        _createBond(block.timestamp + 30 days);

        vm.prank(oracle);
        adapter.submitRiskUpdate(1, 5000, keccak256("report-low-risk"));

        (, , , , , , , , , CopyGuardBondVault.BondState state) = vault.bonds(1);
        assertEq(uint256(state), uint256(CopyGuardBondVault.BondState.Active));
    }

    function testRevertDirectSubmitRiskUpdate() public {
        _createBond(block.timestamp + 30 days);

        vm.prank(nonOwner);
        vm.expectRevert("not risk oracle");

        vault.submitRiskUpdate(1, 5000, keccak256("report"));
    }

    function testSlashBond() public {
        _createBond(block.timestamp + 30 days);
        uint256 ownerBalanceBefore = address(this).balance;
        uint256 slashedAmount = 0.5e18;

        vm.expectEmit(true, false, false, true, address(vault));
        emit BondSlashed(1, slashedAmount);

        vault.slashBond(1, 5000);

        (, , , uint256 amount, , , , , , CopyGuardBondVault.BondState state) = vault.bonds(1);
        assertEq(amount, 0.5e18);
        assertEq(uint256(state), uint256(CopyGuardBondVault.BondState.Slashed));
        assertEq(address(this).balance, ownerBalanceBefore + slashedAmount);
    }

    function testRefundBondActive() public {
        _createBond(block.timestamp + 30 days);
        uint256 followerBalanceBefore = follower.balance;

        vm.expectEmit(true, false, false, true, address(vault));
        emit BondRefunded(1, BOND_AMOUNT);

        vault.refundBond(1);

        (, , , uint256 amount, , , , , , CopyGuardBondVault.BondState state) = vault.bonds(1);
        assertEq(amount, 0);
        assertEq(uint256(state), uint256(CopyGuardBondVault.BondState.Refunded));
        assertEq(follower.balance, followerBalanceBefore + BOND_AMOUNT);
    }

    function testRefundBondWarned() public {
        _createBond(block.timestamp + 30 days);

        vm.prank(oracle);
        adapter.submitRiskUpdate(1, 8000, keccak256("report-high-risk"));

        uint256 followerBalanceBefore = follower.balance;

        vm.prank(follower);
        vault.refundBond(1);

        (, , , uint256 amount, , , , , , CopyGuardBondVault.BondState state) = vault.bonds(1);
        assertEq(amount, 0);
        assertEq(uint256(state), uint256(CopyGuardBondVault.BondState.Refunded));
        assertEq(follower.balance, followerBalanceBefore + BOND_AMOUNT);
    }

    function testRevertRefundBondSlashed() public {
        _createBond(block.timestamp + 30 days);
        vault.slashBond(1, 5000);

        vm.expectRevert("bond not refundable");
        vault.refundBond(1);
    }

    function testRevertSettleBondBeforeExpiry() public {
        _createBond(block.timestamp + 30 days);

        vm.expectRevert("bond not expired");
        vault.settleBond(1);
    }

    function testSettleBondAfterExpiry() public {
        uint256 expiry = block.timestamp + 30 days;
        _createBond(expiry);
        vm.warp(expiry + 1);

        vm.expectEmit(true, false, false, true, address(vault));
        emit BondSettled(1);

        vault.settleBond(1);

        (, , , , , , , , , CopyGuardBondVault.BondState state) = vault.bonds(1);
        assertEq(uint256(state), uint256(CopyGuardBondVault.BondState.Settled));
    }

    function testRevertNonOwnerSlashBond() public {
        _createBond(block.timestamp + 30 days);

        vm.prank(nonOwner);
        vm.expectRevert();

        vault.slashBond(1, 5000);
    }

    function testTriggerWarningByOracle() public {
        _createBond(block.timestamp + 30 days);

        vm.expectEmit(true, false, false, true, address(vault));
        emit BondWarned(1, 0);

        vm.prank(address(adapter));
        vault.triggerWarning(1);

        (, , , , , , , , , CopyGuardBondVault.BondState state) = vault.bonds(1);
        assertEq(uint256(state), uint256(CopyGuardBondVault.BondState.Warned));
    }

    function testRevertInvalidRiskScore() public {
        _createBond(block.timestamp + 30 days);

        vm.prank(oracle);
        vm.expectRevert("invalid risk score");

        adapter.submitRiskUpdate(1, 10001, keccak256("report"));
    }

    function _createBond(uint256 expiry) private {
        vm.prank(follower);
        vault.createBond{value: BOND_AMOUNT}(LEADER_ID, THRESHOLD_BPS, expiry);
    }
}
