import { Connection, PublicKey } from "@solana/web3.js";
import { getMXEAccAddress } from "@arcium-hq/client";

async function main() {
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");
  const programId = new PublicKey("2iPghUjvt1JKPP6Sht6cR576DVmAjciGprNJQZhc5avA");

  console.log("Checking MXE Account configuration on devnet...\n");

  const mxeAccount = getMXEAccAddress(programId);
  console.log("MXE Account:", mxeAccount.toString());

  const mxeInfo = await conn.getAccountInfo(mxeAccount);
  if (!mxeInfo) {
    console.log("Status: ❌ NOT FOUND");
    return;
  }

  console.log("Status: ✅ EXISTS");
  console.log("Size:", mxeInfo.data.length, "bytes");
  console.log("Owner:", mxeInfo.owner.toString());

  // Parse the MXE account data
  // MXE account structure (based on Arcium):
  // - cluster_offset: u64 (8 bytes) at offset 8 (after discriminator)
  const data = mxeInfo.data;

  // Print first 100 bytes as hex for debugging
  console.log("\nFirst 100 bytes (hex):");
  console.log(data.slice(0, 100).toString("hex"));

  // Try to extract cluster offset (assuming 8-byte discriminator + 8-byte cluster_offset)
  if (data.length >= 16) {
    const clusterOffset = data.readBigUInt64LE(8);
    console.log("\nExtracted cluster_offset:", clusterOffset.toString());
  }
}

main().catch(console.error);
