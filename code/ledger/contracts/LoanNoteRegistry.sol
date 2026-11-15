// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

contract LoanNoteRegistry {
    struct LoanNote {
        uint256 principalEuro;
        uint256 aprBasisPoints;
        uint256 termMonths;
        string borrowerPublicId;
    }

    address public immutable issuer = msg.sender;
    mapping(string => LoanNote) public loanNotes;

    function createLoanNote(
        string calldata applicationRef,
        uint256 principalEuro,
        uint256 aprBasisPoints,
        uint256 termMonths,
        string calldata borrowerPublicId
    ) external {
        require(msg.sender == issuer, "Only the issuer can create loan notes");
        require(bytes(applicationRef).length > 0, "Application reference required");
        require(bytes(borrowerPublicId).length > 0, "Borrower identifier required");
        require(principalEuro > 0 && termMonths > 0, "Invalid loan terms");
        require(loanNotes[applicationRef].principalEuro == 0, "Loan note already exists");

        loanNotes[applicationRef] = LoanNote(
            principalEuro,
            aprBasisPoints,
            termMonths,
            borrowerPublicId
        );
    }
}