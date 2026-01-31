import { Connection, PublicKey } from "@solana/web3.js";
import {
  getClusterAccAddress,
  getMempoolAccAddress,
  getExecutingPoolAccAddress,
} from "@arcium-hq/client";

async function main() {
  const conn = new Connection("https://api.devnet.solana.com", "confirmed");

  console.log("Checking Arcium devnet cluster offsets...\n");

  const offsets = [123, 456]; // v0.5.4 and v0.6.3

  for (const offset of offsets) {
    console.log(`\n=== Cluster Offset ${offset} ===`);

    const cluster = getClusterAccAddress(offset);
    const mempool = getMempoolAccAddress(offset);
    const execPool = getExecutingPoolAccAddress(offset);

    const clusterInfo = await conn.getAccountInfo(cluster);
    const mempoolInfo = await conn.getAccountInfo(mempool);
    const execPoolInfo = await conn.getAccountInfo(execPool);

    console.log(`Cluster:      ${cluster.toString()}`);
    console.log(`  Status:     ${clusterInfo ? "✅ EXISTS (" + clusterInfo.data.length + " bytes)" : "❌ NOT FOUND"}`);

    console.log(`Mempool:      ${mempool.toString()}`);
    console.log(`  Status:     ${mempoolInfo ? "✅ EXISTS (" + mempoolInfo.data.length + " bytes)" : "❌ NOT FOUND"}`);

    console.log(`Exec Pool:    ${execPool.toString()}`);
    console.log(`  Status:     ${execPoolInfo ? "✅ EXISTS (" + execPoolInfo.data.length + " bytes)" : "❌ NOT FOUND"}`);
  }
}

main().catch(console.error);
