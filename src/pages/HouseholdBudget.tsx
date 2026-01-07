import React, { useState } from 'react';
import { useHousehold } from '@/hooks/useHousehold';
import { useSupportRelationships } from '@/hooks/useSupportRelationships';
import { useHouseholdTransactions } from '@/hooks/useHouseholdTransactions';
import { Layout } from '@/components/layout/Layout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Users, 
  Home, 
  Wallet, 
  ArrowRightLeft, 
  TrendingUp, 
  TrendingDown,
  Settings,
  UserPlus
} from 'lucide-react';
import { SupporterView } from '@/components/household/SupporterView';
import { RecipientPrivacySettings } from '@/components/household/RecipientPrivacySettings';
import { IncomeSourcesManager } from '@/components/household/IncomeSourcesManager';
import { useNavigate } from 'react-router-dom';

export default function HouseholdBudget() {
  const navigate = useNavigate();
  const { household, currentMember, members, isLoading, isOwner } = useHousehold();
  const { supportingRelationships, receivingRelationships } = useSupportRelationships();
  const { totals, transactions } = useHouseholdTransactions();
  
  const [activeTab, setActiveTab] = useState('overview');

  if (isLoading) {
    return (
      <Layout>
        <div className="p-6 space-y-6">
          <Skeleton className="h-12 w-64" />
          <div className="grid gap-4 md:grid-cols-3">
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
            <Skeleton className="h-32" />
          </div>
        </div>
      </Layout>
    );
  }

  if (!household) {
    return (
      <Layout>
        <div className="p-6">
          <Card>
            <CardContent className="pt-6">
              <div className="text-center py-12">
                <Home className="h-16 w-16 mx-auto text-muted-foreground mb-4" />
                <h2 className="text-2xl font-bold mb-2">Nessun Household</h2>
                <p className="text-muted-foreground mb-6">
                  Non fai parte di nessun gruppo familiare.
                </p>
                <Button onClick={() => navigate('/onboarding')}>
                  <UserPlus className="h-4 w-4 mr-2" />
                  Configura Household
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="p-6 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-2">
              <Home className="h-8 w-8" />
              {household.name}
            </h1>
            <p className="text-muted-foreground">
              {members.length} {members.length === 1 ? 'membro' : 'membri'}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm">
              {currentMember?.role === 'owner' ? 'Proprietario' : 
               currentMember?.role === 'admin' ? 'Admin' : 
               currentMember?.role === 'member' ? 'Membro' : 'Visualizzatore'}
            </Badge>
            {isOwner && (
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-1" />
                Impostazioni
              </Button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-green-100 dark:bg-green-900 rounded-full">
                  <TrendingUp className="h-6 w-6 text-green-600 dark:text-green-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Entrate</p>
                  <p className="text-2xl font-bold">€{totals.income.toFixed(2)}</p>
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
                  <p className="text-sm text-muted-foreground">Spese</p>
                  <p className="text-2xl font-bold">€{totals.expenses.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-blue-100 dark:bg-blue-900 rounded-full">
                  <ArrowRightLeft className="h-6 w-6 text-blue-600 dark:text-blue-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Trasferimenti</p>
                  <p className="text-2xl font-bold">€{totals.transfers.toFixed(2)}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-purple-100 dark:bg-purple-900 rounded-full">
                  <Wallet className="h-6 w-6 text-purple-600 dark:text-purple-300" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Saldo</p>
                  <p className="text-2xl font-bold">
                    €{(totals.income - totals.expenses).toFixed(2)}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-4 lg:w-auto lg:inline-flex">
            <TabsTrigger value="overview">Panoramica</TabsTrigger>
            <TabsTrigger value="income">Entrate</TabsTrigger>
            {supportingRelationships.length > 0 && (
              <TabsTrigger value="supporting">Supporto</TabsTrigger>
            )}
            {receivingRelationships.length > 0 && (
              <TabsTrigger value="privacy">Privacy</TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            {/* Members List */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Membri
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {members.map((member) => (
                    <div 
                      key={member.id}
                      className="flex items-center justify-between p-3 border rounded-lg"
                    >
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-lg font-semibold">
                            {member.display_name.charAt(0).toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <p className="font-medium">{member.display_name}</p>
                          <Badge variant="outline" className="text-xs">
                            {member.role === 'owner' ? 'Proprietario' : 
                             member.role === 'admin' ? 'Admin' : 
                             member.role === 'member' ? 'Membro' : 'Visualizzatore'}
                          </Badge>
                        </div>
                      </div>
                      {member.id === currentMember?.id && (
                        <Badge>Tu</Badge>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="income">
            <IncomeSourcesManager />
          </TabsContent>

          {supportingRelationships.length > 0 && (
            <TabsContent value="supporting" className="space-y-6">
              {supportingRelationships.map((rel) => (
                <SupporterView 
                  key={rel.id} 
                  recipientMemberId={rel.recipient_member_id} 
                />
              ))}
            </TabsContent>
          )}

          {receivingRelationships.length > 0 && (
            <TabsContent value="privacy">
              <RecipientPrivacySettings />
            </TabsContent>
          )}
        </Tabs>
      </div>
    </Layout>
  );
}
