// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Test} from "forge-std/Test.sol";
import {LeaderRegistry} from "../src/LeaderRegistry.sol";

contract LeaderRegistryTest is Test {
    LeaderRegistry private registry;

    bytes32 private constant LEADER_ID = bytes32("leader_01");
    bytes32 private constant LEADER_ID_TWO = bytes32("leader_02");
    bytes32 private constant METADATA_HASH = keccak256("metadata");
    address private leaderWallet = makeAddr("leader");
    address private nonOwner = makeAddr("nonOwner");

    event LeaderRegistered(bytes32 indexed id, string venue, address indexed wallet, bytes32 metadataHash);
    event LeaderDeactivated(bytes32 indexed id);

    function setUp() public {
        registry = new LeaderRegistry();
    }

    function testRegisterLeader() public {
        vm.expectEmit(true, false, true, true, address(registry));
        emit LeaderRegistered(LEADER_ID, "Hyperliquid", leaderWallet, METADATA_HASH);

        registry.registerLeader(LEADER_ID, "Hyperliquid", leaderWallet, METADATA_HASH);

        LeaderRegistry.Leader memory leader = registry.getLeader(LEADER_ID);
        assertEq(leader.id, LEADER_ID);
        assertEq(leader.venue, "Hyperliquid");
        assertEq(leader.wallet, leaderWallet);
        assertEq(leader.metadataHash, METADATA_HASH);
        assertTrue(leader.active);
    }

    function testGetActiveLeaders() public {
        registry.registerLeader(LEADER_ID, "Hyperliquid", leaderWallet, METADATA_HASH);
        registry.registerLeader(LEADER_ID_TWO, "Hyperliquid", makeAddr("leaderTwo"), bytes32(0));

        bytes32[] memory activeLeaders = registry.getActiveLeaders();

        assertEq(activeLeaders.length, 2);
        assertEq(activeLeaders[0], LEADER_ID);
        assertEq(activeLeaders[1], LEADER_ID_TWO);
    }

    function testDeactivateLeader() public {
        registry.registerLeader(LEADER_ID, "Hyperliquid", leaderWallet, METADATA_HASH);

        vm.expectEmit(true, false, false, true, address(registry));
        emit LeaderDeactivated(LEADER_ID);

        registry.deactivateLeader(LEADER_ID);

        LeaderRegistry.Leader memory leader = registry.getLeader(LEADER_ID);
        bytes32[] memory activeLeaders = registry.getActiveLeaders();

        assertFalse(leader.active);
        assertEq(activeLeaders.length, 0);
    }

    function testRevertNonOwnerRegister() public {
        vm.prank(nonOwner);
        vm.expectRevert();

        registry.registerLeader(LEADER_ID, "Hyperliquid", leaderWallet, METADATA_HASH);
    }
}
