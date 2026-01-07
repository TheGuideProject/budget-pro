import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { 
  ArrowLeft, 
  Search, 
  Users, 
  Shield,
  Crown,
  User,
  CreditCard
} from 'lucide-react';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { useAdminUsers, useSubscriptionPlans, useAssignRole, useAssignSubscription, UserWithProfile } from '@/hooks/useAdminData';
import { format } from 'date-fns';
import { it } from 'date-fns/locale';

export default function AdminUsers() {
  const navigate = useNavigate();
  const { isAdmin, isSuperAdmin, isLoading: authLoading } = useAdminAuth();
  const { data: users, isLoading: usersLoading } = useAdminUsers();
  const { data: plans } = useSubscriptionPlans();
  const assignRole = useAssignRole();
  const assignSubscription = useAssignSubscription();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedUser, setSelectedUser] = useState<UserWithProfile | null>(null);
  const [dialogMode, setDialogMode] = useState<'role' | 'subscription' | null>(null);
  const [selectedRole, setSelectedRole] = useState<string>('');
  const [selectedPlan, setSelectedPlan] = useState<string>('');

  useEffect(() => {
    if (!authLoading && !isAdmin) {
      navigate('/');
    }
  }, [isAdmin, authLoading, navigate]);

  const filteredUsers = users?.filter(user => 
    user.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    user.id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAssignRole = async () => {
    if (!selectedUser || !selectedRole) return;
    await assignRole.mutateAsync({ 
      userId: selectedUser.id, 
      role: selectedRole as 'admin' | 'super_admin' | 'user' 
    });
    setDialogMode(null);
    setSelectedUser(null);
  };

  const handleAssignSubscription = async () => {
    if (!selectedUser || !selectedPlan) return;
    await assignSubscription.mutateAsync({ 
      userId: selectedUser.id, 
      planId: selectedPlan 
    });
    setDialogMode(null);
    setSelectedUser(null);
  };

  const getRoleBadge = (role: string | null) => {
    switch (role) {
      case 'super_admin':
        return <Badge className="bg-purple-500/20 text-purple-700 border-purple-500/30"><Crown className="h-3 w-3 mr-1" />Super Admin</Badge>;
      case 'admin':
        return <Badge className="bg-blue-500/20 text-blue-700 border-blue-500/30"><Shield className="h-3 w-3 mr-1" />Admin</Badge>;
      default:
        return <Badge variant="outline"><User className="h-3 w-3 mr-1" />Utente</Badge>;
    }
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-500/20 text-green-700 border-green-500/30">Attivo</Badge>;
      case 'trial':
        return <Badge className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">Trial</Badge>;
      case 'cancelled':
        return <Badge className="bg-red-500/20 text-red-700 border-red-500/30">Cancellato</Badge>;
      case 'expired':
        return <Badge className="bg-gray-500/20 text-gray-700 border-gray-500/30">Scaduto</Badge>;
      default:
        return <Badge variant="outline">Nessuno</Badge>;
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary" />
      </div>
    );
  }

  if (!isAdmin) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20">
      {/* Header */}
      <header className="sticky top-0 z-50 backdrop-blur-xl bg-background/80 border-b border-border/50">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                <ArrowLeft className="h-5 w-5" />
              </Button>
              <div className="p-2 rounded-xl bg-primary/10">
                <Users className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold">Gestione Utenti</h1>
                <p className="text-sm text-muted-foreground">{users?.length || 0} utenti registrati</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        {/* Search */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Cerca per nome o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>Lista Utenti</CardTitle>
          </CardHeader>
          <CardContent>
            {usersLoading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4, 5].map((i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            ) : filteredUsers && filteredUsers.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Utente</TableHead>
                      <TableHead>Ruolo</TableHead>
                      <TableHead>Piano</TableHead>
                      <TableHead>Stato</TableHead>
                      <TableHead>Data Registrazione</TableHead>
                      <TableHead className="text-right">Azioni</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.map((user) => (
                      <TableRow key={user.id}>
                        <TableCell>
                          <div>
                            <p className="font-medium">{user.display_name || 'Senza nome'}</p>
                            <p className="text-xs text-muted-foreground truncate max-w-[200px]">{user.id}</p>
                          </div>
                        </TableCell>
                        <TableCell>{getRoleBadge(user.role)}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{user.plan_name || 'Free'}</Badge>
                        </TableCell>
                        <TableCell>{getStatusBadge(user.subscription_status)}</TableCell>
                        <TableCell>
                          {format(new Date(user.created_at), 'dd MMM yyyy', { locale: it })}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex gap-2 justify-end">
                            {isSuperAdmin && (
                              <Button 
                                variant="outline" 
                                size="sm"
                                onClick={() => {
                                  setSelectedUser(user);
                                  setSelectedRole(user.role || 'user');
                                  setDialogMode('role');
                                }}
                              >
                                <Shield className="h-4 w-4 mr-1" />
                                Ruolo
                              </Button>
                            )}
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedUser(user);
                                setDialogMode('subscription');
                              }}
                            >
                              <CreditCard className="h-4 w-4 mr-1" />
                              Piano
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <p className="text-center text-muted-foreground py-8">
                Nessun utente trovato
              </p>
            )}
          </CardContent>
        </Card>
      </main>

      {/* Role Assignment Dialog */}
      <Dialog open={dialogMode === 'role'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Modifica Ruolo</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Utente: <strong>{selectedUser?.display_name}</strong>
            </p>
            <Select value={selectedRole} onValueChange={setSelectedRole}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona ruolo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="user">Utente</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
                <SelectItem value="super_admin">Super Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Annulla</Button>
            <Button onClick={handleAssignRole} disabled={assignRole.isPending}>
              {assignRole.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Assignment Dialog */}
      <Dialog open={dialogMode === 'subscription'} onOpenChange={() => setDialogMode(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Assegna Piano</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-sm text-muted-foreground mb-4">
              Utente: <strong>{selectedUser?.display_name}</strong>
            </p>
            <Select value={selectedPlan} onValueChange={setSelectedPlan}>
              <SelectTrigger>
                <SelectValue placeholder="Seleziona piano" />
              </SelectTrigger>
              <SelectContent>
                {plans?.map((plan) => (
                  <SelectItem key={plan.id} value={plan.id}>
                    {plan.name} - €{plan.price}/{plan.billing_period === 'yearly' ? 'anno' : 'mese'}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogMode(null)}>Annulla</Button>
            <Button onClick={handleAssignSubscription} disabled={assignSubscription.isPending}>
              {assignSubscription.isPending ? 'Salvataggio...' : 'Salva'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
