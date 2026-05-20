// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";

interface ILeaderRegistry {
    struct Leader {
        bytes32 id;
        string venue;
        address wallet;
        bytes32 metadataHash;
        bool active;
    }

    function getLeader(bytes32 id) external view returns (Leader memory);
}

contract CopyGuardBondVault is Ownable, ReentrancyGuard {
    enum BondState {
        Active,
        Warned,
        Slashed,
        Refunded,
        Settled
    }

    struct Bond {
        uint256 id;
        address follower;
        bytes32 leaderId;
        uint256 amount;
        uint256 createdAt;
        uint256 expiry;
        uint16 riskThresholdBps;
        uint16 lastRiskScoreBps;
        bytes32 lastReportHash;
        BondState state;
    }

    mapping(uint256 => Bond) public bonds;
    uint256 public nextBondId;
    address public riskOracleAdapter;
    address public leaderRegistry;

    event BondCreated(uint256 indexed bondId, address indexed follower, bytes32 indexed leaderId, uint256 amount);
    event RiskUpdated(uint256 indexed bondId, uint16 riskScoreBps, bytes32 reportHash);
    event BondWarned(uint256 indexed bondId, uint16 riskScoreBps);
    event BondSlashed(uint256 indexed bondId, uint256 slashedAmount);
    event BondRefunded(uint256 indexed bondId, uint256 amount);
    event BondSettled(uint256 indexed bondId);

    modifier onlyRiskOracle() {
        require(msg.sender == riskOracleAdapter, "not risk oracle");
        _;
    }

    constructor(address leaderRegistry_) Ownable(msg.sender) {
        require(leaderRegistry_ != address(0), "invalid registry");

        leaderRegistry = leaderRegistry_;
        nextBondId = 1;
    }

    function createBond(bytes32 leaderId, uint16 riskThresholdBps, uint256 expiry) external payable nonReentrant {
        require(msg.value > 0, "amount required");
        require(riskThresholdBps <= 10000, "invalid threshold");
        require(expiry > block.timestamp, "invalid expiry");
        require(ILeaderRegistry(leaderRegistry).getLeader(leaderId).active, "leader not active");

        uint256 bondId = nextBondId;
        nextBondId++;

        bonds[bondId] = Bond({
            id: bondId,
            follower: msg.sender,
            leaderId: leaderId,
            amount: msg.value,
            createdAt: block.timestamp,
            expiry: expiry,
            riskThresholdBps: riskThresholdBps,
            lastRiskScoreBps: 0,
            lastReportHash: bytes32(0),
            state: BondState.Active
        });

        emit BondCreated(bondId, msg.sender, leaderId, msg.value);
    }

    function setRiskOracleAdapter(address adapter) external onlyOwner {
        require(adapter != address(0), "invalid adapter");

        riskOracleAdapter = adapter;
    }

    function submitRiskUpdate(uint256 bondId, uint16 riskScoreBps, bytes32 reportHash) external onlyRiskOracle {
        require(riskScoreBps <= 10000, "invalid risk score");

        Bond storage bond = _requireExistingBond(bondId);
        require(bond.state == BondState.Active || bond.state == BondState.Warned, "bond not updatable");

        bond.lastRiskScoreBps = riskScoreBps;
        bond.lastReportHash = reportHash;

        emit RiskUpdated(bondId, riskScoreBps, reportHash);

        if (riskScoreBps > bond.riskThresholdBps && bond.state == BondState.Active) {
            bond.state = BondState.Warned;
            emit BondWarned(bondId, riskScoreBps);
        }
    }

    function triggerWarning(uint256 bondId) external onlyRiskOracle {
        Bond storage bond = _requireExistingBond(bondId);
        require(bond.state == BondState.Active, "bond not active");

        bond.state = BondState.Warned;

        emit BondWarned(bondId, bond.lastRiskScoreBps);
    }

    function slashBond(uint256 bondId, uint16 slashBps) external onlyOwner nonReentrant {
        require(slashBps <= 10000, "invalid slash bps");

        Bond storage bond = _requireExistingBond(bondId);
        require(bond.state == BondState.Active || bond.state == BondState.Warned, "bond not slashable");

        uint256 slashedAmount = (bond.amount * slashBps) / 10000;
        bond.amount -= slashedAmount;
        bond.state = BondState.Slashed;

        (bool success, ) = owner().call{value: slashedAmount}("");
        require(success, "slash transfer failed");

        emit BondSlashed(bondId, slashedAmount);
    }

    function refundBond(uint256 bondId) external nonReentrant {
        Bond storage bond = _requireExistingBond(bondId);
        require(msg.sender == owner() || msg.sender == bond.follower, "not authorized");
        require(bond.state == BondState.Active || bond.state == BondState.Warned, "bond not refundable");

        uint256 refundAmount = bond.amount;
        bond.amount = 0;
        bond.state = BondState.Refunded;

        (bool success, ) = bond.follower.call{value: refundAmount}("");
        require(success, "refund transfer failed");

        emit BondRefunded(bondId, refundAmount);
    }

    function settleBond(uint256 bondId) external onlyOwner {
        Bond storage bond = _requireExistingBond(bondId);
        require(block.timestamp >= bond.expiry, "bond not expired");
        require(bond.state == BondState.Active || bond.state == BondState.Warned, "bond not settleable");

        bond.state = BondState.Settled;

        emit BondSettled(bondId);
    }

    function _requireExistingBond(uint256 bondId) internal view returns (Bond storage bond) {
        bond = bonds[bondId];
        require(bond.id != 0, "bond not found");
    }
}
