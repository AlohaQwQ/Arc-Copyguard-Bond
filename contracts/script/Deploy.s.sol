// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Script} from "forge-std/Script.sol";
import {console2} from "forge-std/console2.sol";
import {LeaderRegistry} from "../src/LeaderRegistry.sol";
import {CopyGuardBondVault} from "../src/CopyGuardBondVault.sol";
import {RiskOracleAdapter} from "../src/RiskOracleAdapter.sol";
import {ReportPayment} from "../src/ReportPayment.sol";

contract Deploy is Script {
    function run() external {
        uint256 deployerPrivateKey = vm.envUint("DEPLOYER_PRIVATE_KEY");
        address oracleAddress = vm.envAddress("ORACLE_ADDRESS");
        address deployer = vm.addr(deployerPrivateKey);

        require(block.chainid == 5042002, "wrong chain");
        require(oracleAddress != address(0), "invalid oracle");

        vm.startBroadcast(deployerPrivateKey);

        LeaderRegistry leaderRegistry = new LeaderRegistry();
        CopyGuardBondVault bondVault = new CopyGuardBondVault(address(leaderRegistry));
        RiskOracleAdapter adapter = new RiskOracleAdapter(address(bondVault));
        bondVault.setRiskOracleAdapter(address(adapter));
        ReportPayment reportPayment = new ReportPayment();

        _registerMockLeaders(leaderRegistry);
        adapter.addOracle(oracleAddress);

        vm.stopBroadcast();

        console2.log("chainId", block.chainid);
        console2.log("deployer", deployer);
        console2.log("oracleAddress", oracleAddress);
        console2.log("LeaderRegistry", address(leaderRegistry));
        console2.log("CopyGuardBondVault", address(bondVault));
        console2.log("RiskOracleAdapter", address(adapter));
        console2.log("ReportPayment", address(reportPayment));
    }

    function _registerMockLeaders(LeaderRegistry leaderRegistry) private {
        leaderRegistry.registerLeader(
            bytes32("hl_leader_01"),
            "Hyperliquid",
            0x1111111111111111111111111111111111111111,
            bytes32(0)
        );
        leaderRegistry.registerLeader(
            bytes32("hl_leader_02"),
            "Hyperliquid",
            0x2222222222222222222222222222222222222222,
            bytes32(0)
        );
        leaderRegistry.registerLeader(
            bytes32("hl_leader_03"),
            "Hyperliquid",
            0x3333333333333333333333333333333333333333,
            bytes32(0)
        );
        leaderRegistry.registerLeader(
            bytes32("hl_leader_04"),
            "Hyperliquid",
            0x4444444444444444444444444444444444444444,
            bytes32(0)
        );
        leaderRegistry.registerLeader(
            bytes32("hl_leader_05"),
            "Hyperliquid",
            0x5555555555555555555555555555555555555555,
            bytes32(0)
        );
    }
}
