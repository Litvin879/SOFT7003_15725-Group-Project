import { applicationDefault, initializeApp } from "firebase-admin/app";
import { getFirestore, Timestamp } from "firebase-admin/firestore";
import type { DocumentData } from "firebase-admin/firestore";
import { network } from "hardhat";

type Hex = `0x${string}`;

const projectId = process.env.AL_FIREBASE_PROJECT_ID;
const contractAddress = process.env.AL_LOAN_NOTE_ADDRESS;
const applicationId = process.env.AL_APPROVAL_APPLICATION_ID;

if (!projectId || !contractAddress || !/^0x[0-9a-fA-F]{40}$/.test(contractAddress)) {
  throw new Error("Set AL_FIREBASE_PROJECT_ID and AL_LOAN_NOTE_ADDRESS.");
}
if (!applicationId || applicationId.includes("/")) {
  throw new Error("Set AL_APPROVAL_APPLICATION_ID to a fresh test document's ID.");
}

const firebase = initializeApp({ projectId, credential: applicationDefault() });
const database = getFirestore(firebase);
const application = database.collection("application").doc(applicationId);
const approvedStatus = "Underwriter Approved";
const { viem } = await network.create();
const client = await viem.getPublicClient();
const registry = await viem.getContractAt("LoanNoteRegistry", contractAddress as Hex);

if (!(await client.getCode({ address: registry.address }))) {
  throw new Error("Deploy LoanNoteRegistry on the running Hardhat node first.");
}

function readLoanDetails(loan: DocumentData) {
  const { principalEuro, mortgageTermYears, "APR(%)": aprPercent } =
    loan.financialDetails ?? {};
  const aprBasisPoints = typeof aprPercent === "number" ? Math.round(aprPercent * 100) : NaN;
  const borrowerPublicId = loan.borrowerPublicId;

  if (
    !Number.isSafeInteger(principalEuro) || principalEuro <= 0 ||
    !Number.isSafeInteger(aprBasisPoints) || aprPercent < 0 ||
    !Number.isSafeInteger(mortgageTermYears) || mortgageTermYears <= 0 ||
    typeof borrowerPublicId !== "string" || !borrowerPublicId.trim()
  ) {
    throw new Error("Check principalEuro, APR(%), mortgageTermYears and borrowerPublicId.");
  }

  return [BigInt(principalEuro), BigInt(aprBasisPoints), BigInt(mortgageTermYears) * 12n, borrowerPublicId] as const;
}

async function claimApproval() {
  return database.runTransaction(async (transaction) => {
    const loan = (await transaction.get(application)).data();
    if (!loan || loan.loanNoteTransactionHash || loan.status === approvedStatus) return;

    const requester = loan.approvalRequestedBy;
    const requestedAt = loan.approvalRequestedAt;
    if (typeof requester !== "string" || !requester || requester.includes("/") ||
        !(requestedAt instanceof Timestamp)) return;

    const ledger = loan.approvalLedger;
    if (ledger?.state === "processing") {
      console.warn(`${application.path} already has an approval in progress. Check the previous run's log if it stopped.`);
      return;
    }
    if (ledger?.state === "failed") {
      console.warn(`${application.path} has a failed approval. Check approvalLedger.error before retrying.`);
      return;
    }

    const profile = await transaction.get(database.collection("users").doc(requester));
    if (profile.get("role") !== "Underwriter") {
      throw new Error(`Approval requires an Underwriter profile at users/${requester}.`);
    }

    const details = readLoanDetails(loan);
    if (ledger) {
      if (ledger.state !== "submitted" || ledger.contractAddress !== registry.address ||
          !/^0x[0-9a-fA-F]{64}$/.test(ledger.transactionHash) ||
          ledger.requester !== requester || !requestedAt.isEqual(ledger.requestedAt)) {
        throw new Error("The saved approval attempt does not match this request and contract.");
      }
      return { details, transactionHash: ledger.transactionHash as Hex };
    }

    transaction.update(application, {
      approvalLedger: {
        state: "processing",
        requester,
        requestedAt,
        contractAddress: registry.address,
      },
    });
    return { details };
  });
}

async function processApproval() {
    const approval = await claimApproval();
  if (!approval) return;

  const [principal, apr, months, borrower] = approval.details;
  let transactionHash = approval.transactionHash;

  try {
    if (!transactionHash) {
      const [existingPrincipal] = await registry.read.loanNotes([application.id]);
      if (existingPrincipal !== 0n) {
        throw new Error("A loan note already exists on Hardhat. Check its original transaction before retrying.");
      }

      transactionHash = await registry.write.createLoanNote([
        application.id, principal, apr, months, borrower,
      ]);
      console.log("Hardhat approval transaction:", transactionHash);
      await application.update({
        "approvalLedger.state": "submitted",
        "approvalLedger.transactionHash": transactionHash,
      });
    }

    const receipt = await client.waitForTransactionReceipt({ hash: transactionHash });
    if (receipt.status !== "success") {
      const message = "Hardhat rejected the approval transaction.";
      await application.update({
        "approvalLedger.state": "failed",
        "approvalLedger.error": message,
      });
      throw new Error(message);
    }

    const [savedPrincipal, savedApr, savedMonths, savedBorrower] =
      await registry.read.loanNotes([application.id]);
    if (savedPrincipal !== principal || savedApr !== apr || savedMonths !== months || savedBorrower !== borrower) {
      throw new Error("The loan note on Hardhat does not match the Firestore application.");
    }

    await application.update({
      status: approvedStatus,
      loanNoteReference: application.id,
      loanNoteContractAddress: registry.address,
      loanNoteTransactionHash: transactionHash,
      "approvalLedger.state": "confirmed",
      "approvalLedger.transactionHash": transactionHash,
    });
    console.log("Saved approved loan note to:", application.path, transactionHash);
  } catch (error) {
    if (transactionHash) {
      console.error("Check this transaction before retrying:", transactionHash);
    } else {
      await application.update({
        "approvalLedger.state": "failed",
        "approvalLedger.error": error instanceof Error ? error.message : String(error),
      });
    }
    throw error;
  }
}

let processing = false;
console.log("Listening for approval requests on:", application.path);
application.onSnapshot(async (snapshot) => {
  const loan = snapshot.data();
  if (processing || !loan?.approvalRequestedBy || !loan.approvalRequestedAt ||
      loan.loanNoteTransactionHash || loan.status === approvedStatus) return;

  processing = true;
  try {
    await processApproval();
  } catch (error) {
    console.error("Could not process approval for", application.path, error);
  } finally {
    processing = false;
  }
}, (error) => {
  console.error("Firestore listener stopped:", error);
  process.exitCode = 1;
});
