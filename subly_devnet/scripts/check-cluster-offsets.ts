import { Connection, PublicKey } from "@solana/web3.js";
import { getClusterAccAddress, getMempoolAccAddress } from "@arcium-hq/client";

async function main() {
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");

  console.log("Checking different cluster offsets on devnet...\n");

  for (let offset = 0; offset <= 10; offset++) {
    const cluster = getClusterAccAddress(offset);
    const mempool = getMempoolAccAddress(offset);

    const clusterInfo = await conn.getAccountInfo(cluster);
    const mempoolInfo = await conn.getAccountInfo(mempool);

    if (clusterInfo || mempoolInfo) {
      console.log(`Offset ${offset}: *** FOUND ***`);
      console.log(`  Cluster: ${cluster.toString()} - ${clusterInfo ? "✅ EXISTS (" + clusterInfo.data.length + " bytes)" : "❌"}`);
      console.log(`  Mempool: ${mempool.toString()} - ${mempoolInfo ? "✅ EXISTS (" + mempoolInfo.data.length + " bytes)" : "❌"}`);
    } else {
      console.log(`Offset ${offset}: not found`);
    }
  }
}

main().catch(console.error);
