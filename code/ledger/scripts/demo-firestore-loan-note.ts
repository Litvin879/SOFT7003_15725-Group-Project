import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore } from "firebase-admin/firestore";
import { network } from "hardhat";

const projectId = process.env.AL_FIREBASE_PROJECT_ID;
const contractAddress = process.env.AL_LOAN_NOTE_ADDRESS;

if (!projectId || !contractAddress || !/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
  throw new Error("Set the Firebase project ID and the deployed contract address.");
}

const firebase = initializeApp({
  projectId,
  credential: applicationDefault(),
});

const application = getFirestore(firebase).collection("application").doc("AL-TEST-02");
const loan = (await application.get()).data();

if (!loan) {
  throw new Error(`Could not find ${application.path} in Firestore.`);
}
if (loan.loanNoteTransactionHash) {
  throw new Error(`${application.path} already has a saved loan-note transaction.`);
}

const { principalEuro, "APR(%)": aprPercent, mortgageTermYears } = loan.financialDetails ?? {};
const borrowerPublicId = loan.borrowerPublicId;

const aprBasisPoints =
  typeof aprPercent === "number" ? Math.round(aprPercent * 100) : NaN;

if (
  !Number.isSafeInteger(principalEuro) || principalEuro <= 0 ||
  !Number.isSafeInteger(aprBasisPoints) || aprBasisPoints < 0 ||
  !Number.isSafeInteger(mortgageTermYears) || mortgageTermYears <= 0 ||
  typeof borrowerPublicId !== "string" || !borrowerPublicId.trim()
) {
  throw new Error("Check the loan fields in Firestore. Enter APR as 425 for 4.25%.");
}

const principal = BigInt(principalEuro);
const apr = BigInt(aprBasisPoints);
const months = BigInt(mortgageTermYears) * 12n;

const { viem } = await network.create();
const client = await viem.getPublicClient();
const registry = await viem.getContractAt(
  "LoanNoteRegistry",
  contractAddress as `0x${string}`,
);

const transactionHash = await registry.write.createLoanNote([
  application.id,
  principal,
  apr,
  months,
  borrowerPublicId,
]);
console.log("Hardhat transaction hash:", transactionHash);

const receipt = await client.waitForTransactionReceipt({ hash: transactionHash });
if (receipt.status !== "success") {
  throw new Error("The loan-note transaction failed.");
}

const [savedPrincipal, savedApr, savedMonths, savedBorrower] =
  await registry.read.loanNotes([application.id]);

if (
  savedPrincipal !== principal ||
  savedApr !== apr ||
  savedMonths !== months ||
  savedBorrower !== borrowerPublicId
) {
  throw new Error("The Hardhat loan note does not match Firestore.");
}

await application.update({
  loanNoteReference: application.id,
  loanNoteContractAddress: registry.address,
  loanNoteTransactionHash: transactionHash,
});

console.log("Saved verified loan note to:", application.path);