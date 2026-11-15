import { network } from "hardhat";

const { viem } = await network.create();
const client = await viem.getPublicClient();
const registry = await viem.deployContract("LoanNoteRegistry");

const applicationRef = "AL-TEST-001";
const principalEuro = 240_000n;
const aprBasisPoints = 425n;
const termMonths = 300n;
const borrowerPublicId = "BORROWER-DEMO-001";

const transactionHash = await registry.write.createLoanNote([
  applicationRef,
  principalEuro,
  aprBasisPoints,
  termMonths,
  borrowerPublicId,
]);

const receipt = await client.waitForTransactionReceipt({ hash: transactionHash });
const [savedPrincipal, savedApr, savedTerm, savedBorrower] =
  await registry.read.loanNotes([applicationRef]);

if (
  receipt.status !== "success" ||
  savedPrincipal !== principalEuro ||
  savedApr !== aprBasisPoints ||
  savedTerm !== termMonths ||
  savedBorrower !== borrowerPublicId
) {
  throw new Error("Loan note could not be verified");
}

console.log("Application reference:", applicationRef);
console.log("Principal (EUR):", savedPrincipal.toString());
console.log("APR (%):", Number(savedApr) / 100);
console.log("Term (months):", savedTerm.toString());
console.log("Borrower public identifier:", savedBorrower);
console.log("Loan note transaction hash:", transactionHash);