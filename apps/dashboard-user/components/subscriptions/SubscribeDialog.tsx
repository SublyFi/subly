'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { formatUSDC } from '@/lib/utils';
import { useMockData } from '@/providers/MockDataProvider';
import type { Plan } from '@/types/subscription';
import { Loader2, Shield, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface SubscribeDialogProps {
  plan: Plan;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function SubscribeDialog({ plan, open, onOpenChange }: SubscribeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { subscribe } = useMockData();
  const router = useRouter();

  const getBillingLabel = (cycle: string) => {
    const labels: Record<string, string> = {
      hourly: 'per hour',
      daily: 'per day',
      weekly: 'per week',
      monthly: 'per month',
      yearly: 'per year',
    };
    return labels[cycle] || `per ${cycle}`;
  };

  const handleSubscribe = async () => {
    setIsLoading(true);
    try {
      await subscribe(plan.id);
      toast.success(`Successfully subscribed to ${plan.name}`, {
        description: 'Your membership is now active.',
      });
      onOpenChange(false);
      router.push('/subscriptions');
    } catch (error) {
      toast.error('Subscription failed', {
        description: error instanceof Error ? error.message : 'Unknown error',
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Subscribe to {plan.name}</DialogTitle>
          <DialogDescription>
            You are about to subscribe to {plan.businessName}&apos;s service.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{plan.name}</p>
                <p className="text-sm text-muted-foreground">{plan.businessName}</p>
              </div>
              <div className="text-right">
                <p className="font-semibold">{formatUSDC(plan.priceUsdc)}</p>
                <p className="text-xs text-muted-foreground">{getBillingLabel(plan.billingCycle)}</p>
              </div>
            </div>
          </div>

          <div className="space-y-2 rounded-lg bg-secondary p-4">
            <div className="flex items-center gap-2 text-sm">
              <Shield className="h-4 w-4 text-primary" />
              <span>Your subscription is protected by ZK proofs</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Lock className="h-4 w-4 text-primary" />
              <span>The business cannot see your identity</span>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Cancel
          </Button>
          <Button onClick={handleSubscribe} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Subscribing...
              </>
            ) : (
              'Confirm Subscription'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
