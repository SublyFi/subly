"use client";

import { useWallet } from "@solana/wallet-adapter-react";
import { SDKCodeBlock, CopyableText } from "@/components/merchant/SDKCodeBlock";
import { PROGRAM_ID } from "@/lib/constants";

export default function SDKGuidePage() {
  const { publicKey, connected } = useWallet();

  const installCode = `npm install @subly/sdk @solana/web3.js @coral-xyz/anchor`;

  const initializeCode = `import { SublySDK } from '@subly/sdk';
import { Connection, PublicKey } from '@solana/web3.js';

// Initialize SDK
const connection = new Connection('https://api.devnet.solana.com');
const sdk = new SublySDK({
  connection,
  programId: '${PROGRAM_ID.toBase58()}',
});`;

  const checkSubscriptionCode = `import { SublySDK } from '@subly/sdk';
import { PublicKey } from '@solana/web3.js';

// Check if a user has an active subscription to your plan
async function checkUserSubscription(
  sdk: SublySDK,
  userWallet: PublicKey,
  planId: bigint
): Promise<boolean> {
  const subscription = await sdk.getUserSubscription(
    userWallet,
    planId
  );

  if (!subscription) {
    return false;
  }

  // Check if subscription is active and not expired
  const now = Math.floor(Date.now() / 1000);
  return subscription.isActive && subscription.nextPaymentDate > now;
}

// Usage example
const merchantWallet = new PublicKey('${publicKey?.toBase58() || "YOUR_MERCHANT_WALLET"}');
const planId = BigInt(1); // Your plan ID
const userWallet = new PublicKey('USER_WALLET_ADDRESS');

const isSubscribed = await checkUserSubscription(sdk, userWallet, planId);
console.log('User subscription status:', isSubscribed);`;

  const verifySubscriptionServerCode = `// Server-side verification (Node.js / Edge Runtime)
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider } from '@coral-xyz/anchor';

const PROGRAM_ID = new PublicKey('${PROGRAM_ID.toBase58()}');

async function verifySubscription(
  connection: Connection,
  userWallet: string,
  merchantWallet: string,
  planId: number
): Promise<{ isValid: boolean; expiresAt: number | null }> {
  const user = new PublicKey(userWallet);
  const merchant = new PublicKey(merchantWallet);

  // Derive UserSubscription PDA
  const [subscriptionPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from('user_subscription'),
      user.toBuffer(),
      merchant.toBuffer(),
      new BigUint64Array([BigInt(planId)]).buffer,
    ],
    PROGRAM_ID
  );

  // Fetch account
  const accountInfo = await connection.getAccountInfo(subscriptionPda);
  if (!accountInfo) {
    return { isValid: false, expiresAt: null };
  }

  // Parse account data (simplified - use Anchor IDL for proper parsing)
  // Check is_active flag and next_payment_date
  const now = Math.floor(Date.now() / 1000);

  return {
    isValid: true, // Implement proper parsing
    expiresAt: now + 30 * 24 * 60 * 60, // Placeholder
  };
}`;

  const webhookExampleCode = `// Webhook endpoint for subscription events (optional)
// POST /api/subscriptions/webhook

export async function POST(request: Request) {
  const body = await request.json();
  const { event, data } = body;

  switch (event) {
    case 'subscription.created':
      // Handle new subscription
      await grantAccess(data.userWallet, data.planId);
      break;

    case 'subscription.renewed':
      // Handle renewal
      await extendAccess(data.userWallet, data.planId);
      break;

    case 'subscription.cancelled':
      // Handle cancellation
      await revokeAccess(data.userWallet, data.planId);
      break;
  }

  return Response.json({ received: true });
}`;

  return (
    <div className="flex-1 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white">SDK Integration Guide</h1>
          <p className="text-gray-400 mt-2">
            Integrate Subly subscriptions into your application
          </p>
        </div>

        {/* Merchant Info */}
        {connected && publicKey && (
          <div className="mb-8 space-y-3">
            <h2 className="text-xl font-semibold mb-4">Your Integration Details</h2>
            <CopyableText
              label="Merchant Wallet Address"
              value={publicKey.toBase58()}
              truncate={false}
            />
            <CopyableText
              label="Program ID"
              value={PROGRAM_ID.toBase58()}
              truncate={false}
            />
          </div>
        )}

        {!connected && (
          <div className="mb-8 p-4 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
            <p className="text-yellow-300">
              Connect your wallet to see your merchant wallet address for integration.
            </p>
          </div>
        )}

        {/* Installation */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">1. Installation</h2>
          <p className="text-gray-400 mb-4">
            Install the Subly SDK and its peer dependencies:
          </p>
          <SDKCodeBlock
            title="Install dependencies"
            code={installCode}
            language="bash"
          />
        </section>

        {/* Initialization */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">2. Initialize SDK</h2>
          <p className="text-gray-400 mb-4">
            Create an SDK instance with your connection:
          </p>
          <SDKCodeBlock
            title="Initialize SublySDK"
            code={initializeCode}
            language="typescript"
          />
        </section>

        {/* Check Subscription */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">3. Check User Subscription</h2>
          <p className="text-gray-400 mb-4">
            Verify if a user has an active subscription to your plan:
          </p>
          <SDKCodeBlock
            title="Check subscription status"
            code={checkSubscriptionCode}
            language="typescript"
          />
        </section>

        {/* Server-side Verification */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">4. Server-side Verification</h2>
          <p className="text-gray-400 mb-4">
            For secure verification, check subscription status on your server:
          </p>
          <SDKCodeBlock
            title="Server-side verification"
            code={verifySubscriptionServerCode}
            language="typescript"
          />
        </section>

        {/* Webhook (Optional) */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">5. Webhook Integration (Optional)</h2>
          <p className="text-gray-400 mb-4">
            Set up a webhook endpoint to receive subscription events:
          </p>
          <SDKCodeBlock
            title="Webhook handler"
            code={webhookExampleCode}
            language="typescript"
          />
        </section>

        {/* Best Practices */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold mb-4">Best Practices</h2>
          <div className="bg-gray-800 rounded-lg p-6 space-y-4">
            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Always verify on-chain</h3>
                <p className="text-gray-400 text-sm">
                  For security-critical features, always verify subscription status on-chain rather than relying on cached data.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Cache subscription status</h3>
                <p className="text-gray-400 text-sm">
                  For better UX, cache subscription status locally but refresh periodically and on page load.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Handle expiration gracefully</h3>
                <p className="text-gray-400 text-sm">
                  Provide clear messaging when subscriptions are about to expire or have expired.
                </p>
              </div>
            </div>

            <div className="flex items-start space-x-3">
              <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                <svg className="w-4 h-4 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <h3 className="font-medium">Privacy-first approach</h3>
                <p className="text-gray-400 text-sm">
                  Subscription amounts are encrypted via Arcium MPC. Only the subscriber and merchant can decrypt the payment details.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Support */}
        <section className="mb-10">
          <h2 className="text-xl font-semibold text-white mb-4">Need Help?</h2>
          <div className="bg-gray-800 rounded-lg p-6">
            <p className="text-gray-400 mb-4">
              If you have questions about integrating Subly subscriptions, check out these resources:
            </p>
            <ul className="space-y-2 text-gray-300">
              <li>
                <span className="text-gray-500">•</span>{" "}
                <a href="#" className="text-blue-400 hover:underline">
                  API Documentation
                </a>
              </li>
              <li>
                <span className="text-gray-500">•</span>{" "}
                <a href="#" className="text-blue-400 hover:underline">
                  Example Projects
                </a>
              </li>
              <li>
                <span className="text-gray-500">•</span>{" "}
                <a href="#" className="text-blue-400 hover:underline">
                  Discord Community
                </a>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
}
