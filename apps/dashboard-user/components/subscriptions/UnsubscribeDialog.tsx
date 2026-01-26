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
import { useMockData } from '@/providers/MockDataProvider';
import type { Subscription } from '@/types/subscription';
import { Loader2, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { useRouter } from 'next/navigation';

interface UnsubscribeDialogProps {
  subscription: Subscription;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function UnsubscribeDialog({ subscription, open, onOpenChange }: UnsubscribeDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { unsubscribe } = useMockData();
  const router = useRouter();

  const handleUnsubscribe = async () => {
    setIsLoading(true);
    try {
      await unsubscribe(subscription.id);
      toast.success(`Successfully unsubscribed from ${subscription.plan.name}`);
      onOpenChange(false);
      router.push('/subscriptions');
    } catch (error) {
      toast.error('Unsubscription failed', {
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
          <DialogTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-destructive" />
            Cancel Subscription
          </DialogTitle>
          <DialogDescription>
            Are you sure you want to cancel your subscription to {subscription.plan.name}?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4">
            <p className="text-sm">
              This action will immediately cancel your subscription. You will lose access to{' '}
              {subscription.plan.businessName}&apos;s services.
            </p>
          </div>

          <div className="rounded-lg bg-secondary p-4">
            <p className="text-sm text-muted-foreground">
              Any associated scheduled payments will need to be cancelled separately in the Vault
              section.
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isLoading}>
            Keep Subscription
          </Button>
          <Button variant="destructive" onClick={handleUnsubscribe} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Cancelling...
              </>
            ) : (
              'Cancel Subscription'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
