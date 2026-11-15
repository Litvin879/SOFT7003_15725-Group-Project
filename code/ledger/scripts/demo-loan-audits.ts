import { createHash } from "node:crypto";
import { network } from "hardhat";

const { viem } = await network.create();
const client = await viem.getPublicClient();
const loanAudit = await viem.deployContract("LoanAudit");

const applicationRef = "AL-TEST-001";
const digest = createHash("sha256")
  .update("Dummy underwriter approval for AL-TEST-001")
  .digest("hex");
const auditHash = `0x${digest}` as const;

const transactionHash = await loanAudit.write.recordAudit([
  applicationRef,
  auditHash,
]);
const receipt = await client.waitForTransactionReceipt({ hash: transactionHash });

const savedHash = await loanAudit.read.auditHashes([applicationRef]);
if (receipt.status !== "success" || savedHash !== auditHash) {
  throw new Error("Audit record could not be verified");
}

console.log("Contract address:", loanAudit.address);
console.log("Application reference:", applicationRef);
console.log("Audit hash read back:", savedHash);
console.log("Audit transaction hash:", transactionHash);