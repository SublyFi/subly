'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useMockData } from '@/providers/MockDataProvider';
import { formatUSDC, formatDate, shortenAddress } from '@/lib/utils';
import { Calendar, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

export function ScheduledTransferList() {
  const { scheduledTransfers, removeScheduledTransfer } = useMockData();

  const handleRemove = async (id: string, name: string) => {
    try {
      await removeScheduledTransfer(id);
      toast.success(`Removed scheduled transfer to ${name}`);
    } catch {
      toast.error('Failed to remove scheduled transfer');
    }
  };

  const getIntervalLabel = (interval: string) => {
    const labels: Record<string, string> = {
      hourly: 'Hourly',
      daily: 'Daily',
      weekly: 'Weekly',
      monthly: 'Monthly',
      yearly: 'Yearly',
    };
    return labels[interval] || interval;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Scheduled Transfers
        </CardTitle>
        <CardDescription>
          Recurring payments are automatically sent from your vault.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {scheduledTransfers.length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            No scheduled transfers yet.
          </p>
        ) : (
          <div className="space-y-3">
            {scheduledTransfers.map((transfer) => (
              <div
                key={transfer.id}
                className="flex items-center justify-between rounded-lg border p-4"
              >
                <div className="space-y-1">
                  <p className="font-medium">{transfer.recipientName}</p>
                  <p className="text-sm text-muted-foreground">
                    {shortenAddress(transfer.recipientAddress)}
                  </p>
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <Calendar className="h-3 w-3" />
                    <span>Next: {formatDate(transfer.nextExecutionAt)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <p className="font-semibold">{formatUSDC(transfer.amount)}</p>
                    <p className="text-xs text-muted-foreground">
                      {getIntervalLabel(transfer.interval)}
                    </p>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleRemove(transfer.id, transfer.recipientName)}
                    title="Remove"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
