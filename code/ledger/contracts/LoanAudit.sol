// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LoanAudit {
    mapping(string => bytes32) public auditHashes;

    function recordAudit(string calldata applicationRef, bytes32 auditHash) external {
        require(auditHash != bytes32(0), "Audit hash is required");
        require(auditHashes[applicationRef] == bytes32(0), "Audit already recorded");

        auditHashes[applicationRef] = auditHash;
    }
}