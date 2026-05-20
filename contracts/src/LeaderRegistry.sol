// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

contract LeaderRegistry is Ownable {
    struct Leader {
        bytes32 id;
        string venue;
        address wallet;
        bytes32 metadataHash;
        bool active;
    }

    mapping(bytes32 => Leader) public leaders;
    bytes32[] private activeLeaderIds;

    event LeaderRegistered(bytes32 indexed id, string venue, address indexed wallet, bytes32 metadataHash);
    event LeaderDeactivated(bytes32 indexed id);

    constructor() Ownable(msg.sender) {}

    function registerLeader(
        bytes32 id,
        string calldata venue,
        address wallet,
        bytes32 metadataHash
    ) external onlyOwner {
        require(!leaders[id].active, "leader already active");

        leaders[id] = Leader({
            id: id,
            venue: venue,
            wallet: wallet,
            metadataHash: metadataHash,
            active: true
        });
        activeLeaderIds.push(id);

        emit LeaderRegistered(id, venue, wallet, metadataHash);
    }

    function deactivateLeader(bytes32 id) external onlyOwner {
        require(leaders[id].active, "leader not active");

        leaders[id].active = false;

        uint256 length = activeLeaderIds.length;
        for (uint256 index = 0; index < length; index++) {
            if (activeLeaderIds[index] == id) {
                activeLeaderIds[index] = activeLeaderIds[length - 1];
                activeLeaderIds.pop();
                break;
            }
        }

        emit LeaderDeactivated(id);
    }

    function getLeader(bytes32 id) external view returns (Leader memory) {
        return leaders[id];
    }

    function getActiveLeaders() external view returns (bytes32[] memory) {
        return activeLeaderIds;
    }
}
