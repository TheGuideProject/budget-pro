import React from 'react';
import { useHousehold } from '@/hooks/useHousehold';
import { useSupportRelationships } from '@/hooks/useSupportRelationships';
import { useHouseholdTransactions } from '@/hooks/useHouseholdTransactions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Users, TrendingUp, TrendingDown, ArrowRightLeft, Eye, EyeOff } from 'lucide-react';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

interface SupporterViewProps {
  recipientMemberId: string;
}

export function SupporterView({ recipientMemberId }: SupporterViewProps) {
  const { members } = useHousehold();
  const { canViewDetails, getPrivacyModeFor, supportingRelationships } = useSupportRelationships();
  const { transactions, getMemberSummary } = useHouseholdTransactions();

  const recipient = members.find(m => m.id === recipientMemberId);
  const privacyMode = getPrivacyModeFor(recipientMemberId);
  const canSeeDetails = canViewDetails(recipientMemberId);
  const summary = getMemberSummary(recipientMemberId);

  // Get transfers sent to this recipient
  const transfersToRecipient = transactions.filter(
    t => t.type === 'transfer' && 
         t.notes?.includes(recipient?.display_name || '')
  );

  const totalTransferred = transfersToRecipient.reduce((sum, t) => sum + t.amount, 0);

  // Get recipient's expenses (only if we can see them)
  const recipientExpenses = canSeeDetails 
    ? transactions.filter(
        t => t.type === 'expense' && t.scope_owner_id === recipientMemberId
      )
    : [];

  if (!recipient) {
    return <Skeleton className="h-64 w-full" />;
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5" />
                Supporto a {recipient.display_name}
              </CardTitle>
              <CardDescription>
                Panoramica del supporto economico
              </CardDescription>
            </div>
            <Badge variant={canSeeDetails ? 'default' : 'secondary'} className="flex items-center gap-1">
              {canSeeDetails ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3" />}
              {privacyMode === 'detailed' ? 'Dettagli visibili' : 'Solo riepilogo'}
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                <ArrowRightLeft className="h-6 w-6 text-blue-600 dark:text-blue-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Trasferito questo mese</p>
                <p className="text-2xl font-bold">€{totalTransferred.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-red-100 dark:bg-red-900 rounded-full">
                <TrendingDown className="h-6 w-6 text-red-600 dark:text-red-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Speso da {recipient.display_name}</p>
                <p className="text-2xl font-bold">€{summary.total_amount.toFixed(2)}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-300" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Rimanente</p>
                <p className="text-2xl font-bold">
                  €{(totalTransferred - summary.total_amount).toFixed(2)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Category Breakdown */}
      {canSeeDetails && summary.by_category && summary.by_category.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Spese per Categoria</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {summary.by_category.map((cat) => (
                <div key={cat.category} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full bg-primary" />
                    <span>{cat.category}</span>
                  </div>
                  <div className="text-right">
                    <span className="font-medium">€{cat.amount.toFixed(2)}</span>
                    <span className="text-muted-foreground ml-2">
                      ({cat.percentage.toFixed(0)}%)
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Transaction List - Only if detailed view */}
      {canSeeDetails && recipientExpenses.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Ultime Transazioni</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {recipientExpenses.slice(0, 10).map((expense) => (
                <div 
                  key={expense.id} 
                  className="flex items-center justify-between py-2 border-b last:border-0"
                >
                  <div>
                    <p className="font-medium">{expense.merchant || expense.description}</p>
                    <p className="text-sm text-muted-foreground">
                      {expense.category_parent}
                      {expense.category_child && ` • ${expense.category_child}`}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-medium text-red-600">-€{expense.amount.toFixed(2)}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(expense.date), 'd MMM', { locale: it })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Only View */}
      {!canSeeDetails && (
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <EyeOff className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="font-medium mb-2">Dettagli non disponibili</h3>
              <p className="text-sm text-muted-foreground">
                {recipient.display_name} ha scelto di non condividere i dettagli delle spese.
                <br />
                Puoi vedere solo il totale speso nel periodo.
              </p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
