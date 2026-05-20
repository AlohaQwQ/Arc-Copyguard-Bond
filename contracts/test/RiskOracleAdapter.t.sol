// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LeaderRegistry} from "../src/LeaderRegistry.sol";
import {CopyGuardBondVault} from "../src/CopyGuardBondVault.sol";
import {RiskOracleAdapter} from "../src/RiskOracleAdapter.sol";

contract RiskOracleAdapterTest is Test {
    LeaderRegistry private registry;
    CopyGuardBondVault private vault;
    RiskOracleAdapter private adapter;

    bytes32 private constant LEADER_ID = bytes32("leader_01");
    address private follower = makeAddr("follower");
    address private leaderWallet = makeAddr("leader");
    address private oracle = makeAddr("oracle");
    address private unauthorizedOracle = makeAddr("unauthorizedOracle");

    function setUp() public {
        registry = new LeaderRegistry();
        vault = new CopyGuardBondVault(address(registry));
        adapter = new RiskOracleAdapter(address(vault));

        vault.setRiskOracleAdapter(address(adapter));
        registry.registerLeader(LEADER_ID, "Hyperliquid", leaderWallet, bytes32(0));

        deal(follower, 10 ether);
        vm.prank(follower);
        vault.createBond{value: 1e18}(LEADER_ID, 7000, block.timestamp + 30 days);
    }

    function testAddOracle() public {
        adapter.addOracle(oracle);

        assertTrue(adapter.isAuthorizedOracle(oracle));
    }

    function testRemoveOracle() public {
        adapter.addOracle(oracle);
        adapter.removeOracle(oracle);

        assertFalse(adapter.isAuthorizedOracle(oracle));
    }

    function testAuthorizedOracleSubmitRiskUpdate() public {
        bytes32 reportHash = keccak256("report-1");
        adapter.addOracle(oracle);

        vm.prank(oracle);
        adapter.submitRiskUpdate(1, 8000, reportHash);

        (, , , , , , , uint16 lastRiskScoreBps, bytes32 lastReportHash, CopyGuardBondVault.BondState state) =
            vault.bonds(1);
        assertEq(lastRiskScoreBps, 8000);
        assertEq(lastReportHash, reportHash);
        assertEq(uint256(state), uint256(CopyGuardBondVault.BondState.Warned));
    }

    function testRevertUnauthorizedSubmitRiskUpdate() public {
        vm.prank(unauthorizedOracle);
        vm.expectRevert("oracle not authorized");

        adapter.submitRiskUpdate(1, 5000, keccak256("report"));
    }
}
