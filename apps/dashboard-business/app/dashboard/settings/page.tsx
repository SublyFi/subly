'use client';

import { useWallet } from '@solana/wallet-adapter-react';
import { useBusiness } from '@/hooks/use-business';
import { PROGRAM_ID, SOLANA_NETWORK } from '@/lib/constants';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Copy, Check } from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
  const { publicKey } = useWallet();
  const { business } = useBusiness();
  const [copied, setCopied] = useState<string | null>(null);

  const copyToClipboard = async (text: string, key: string) => {
    await navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  const walletAddress = publicKey?.toBase58() || '';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">設定</h1>
        <p className="text-gray-500">SDK統合情報・事業者プロフィール</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>事業者プロフィール</CardTitle>
          <CardDescription>登録済みの事業者情報</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">事業者名</p>
            <p className="font-medium">{business?.name}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">ウォレットアドレス</p>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded break-all">
                {walletAddress}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(walletAddress, 'wallet')}
              >
                {copied === 'wallet' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">登録日</p>
            <p>
              {business?.createdAt
                ? new Date(business.createdAt).toLocaleDateString('ja-JP')
                : '-'}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>SDK統合情報</CardTitle>
          <CardDescription>
            アプリケーションにSublyを統合するための情報
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-gray-500">Program ID</p>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded break-all">
                {PROGRAM_ID}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => copyToClipboard(PROGRAM_ID, 'programId')}
              >
                {copied === 'programId' ? (
                  <Check className="h-4 w-4 text-green-600" />
                ) : (
                  <Copy className="h-4 w-4" />
                )}
              </Button>
            </div>
          </div>
          <div>
            <p className="text-sm text-gray-500">ネットワーク</p>
            <p className="font-medium capitalize">{SOLANA_NETWORK}</p>
          </div>
          <div>
            <p className="text-sm text-gray-500">事業者ID (Business PDA)</p>
            <div className="flex items-center gap-2">
              <code className="text-sm bg-gray-100 px-2 py-1 rounded break-all">
                {business?.id || '-'}
              </code>
              {business?.id && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => copyToClipboard(business.id, 'businessId')}
                >
                  {copied === 'businessId' ? (
                    <Check className="h-4 w-4 text-green-600" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>開発者向け情報</CardTitle>
          <CardDescription>
            SDKの使用方法とドキュメント
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-600">
            詳細なSDKドキュメントと統合ガイドは、後続リリースで提供予定です。
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
