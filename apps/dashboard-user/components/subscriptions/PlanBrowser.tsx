'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { PlanCard } from './PlanCard';
import { SubscribeDialog } from './SubscribeDialog';
import { useMockData } from '@/providers/MockDataProvider';
import type { Plan } from '@/types/subscription';
import { Search } from 'lucide-react';

export function PlanBrowser() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [showSubscribeDialog, setShowSubscribeDialog] = useState(false);
  const { plans, subscriptions } = useMockData();

  const subscribedPlanIds = subscriptions.filter((s) => s.isActive).map((s) => s.planId);

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch =
      plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.businessName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch && plan.isActive;
  });

  const handleSubscribe = (planId: string) => {
    const plan = plans.find((p) => p.id === planId);
    if (plan) {
      setSelectedPlan(plan);
      setShowSubscribeDialog(true);
    }
  };

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Browse Plans</CardTitle>
          <CardDescription>Discover subscription plans from various services.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search plans..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>

          {filteredPlans.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              No plans found matching your search.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {filteredPlans.map((plan) => (
                <PlanCard
                  key={plan.id}
                  plan={plan}
                  isSubscribed={subscribedPlanIds.includes(plan.id)}
                  onSubscribe={handleSubscribe}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {selectedPlan && (
        <SubscribeDialog
          plan={selectedPlan}
          open={showSubscribeDialog}
          onOpenChange={setShowSubscribeDialog}
        />
      )}
    </>
  );
}
