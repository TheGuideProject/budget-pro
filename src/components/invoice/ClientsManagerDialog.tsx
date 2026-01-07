import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Users, Pencil, Trash2, Star, Plus, X, Save } from 'lucide-react';
import { useUserClients, UserClient, CreateClientData } from '@/hooks/useUserClients';
import { cn } from '@/lib/utils';

interface ClientsManagerDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ClientsManagerDialog({ open, onOpenChange }: ClientsManagerDialogProps) {
  const { clients, loading, addClient, updateClient, deleteClient, toggleFavorite } = useUserClients();
  const [editingClient, setEditingClient] = useState<UserClient | null>(null);
  const [deletingClient, setDeletingClient] = useState<UserClient | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newClient, setNewClient] = useState<CreateClientData>({ name: '' });
  const [saving, setSaving] = useState(false);

  const handleAddClient = async () => {
    if (!newClient.name.trim()) return;
    setSaving(true);
    const result = await addClient(newClient);
    setSaving(false);
    if (result) {
      setNewClient({ name: '' });
      setShowAddForm(false);
    }
  };

  const handleUpdateClient = async () => {
    if (!editingClient) return;
    setSaving(true);
    const success = await updateClient(editingClient.id, {
      name: editingClient.name,
      address: editingClient.address || undefined,
      vat: editingClient.vat || undefined,
      email: editingClient.email || undefined,
      phone: editingClient.phone || undefined,
      notes: editingClient.notes || undefined,
    });
    setSaving(false);
    if (success) {
      setEditingClient(null);
    }
  };

  const handleDeleteClient = async () => {
    if (!deletingClient) return;
    await deleteClient(deletingClient.id);
    setDeletingClient(null);
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              I Miei Clienti
            </DialogTitle>
            <DialogDescription>
              Gestisci i tuoi clienti privati. Questi dati sono visibili solo a te.
            </DialogDescription>
          </DialogHeader>

          <div className="flex-1 overflow-auto">
            {/* Add Client Form */}
            {showAddForm ? (
              <div className="p-4 mb-4 border rounded-lg bg-muted/30 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Nuovo Cliente</Label>
                  <Button variant="ghost" size="icon" onClick={() => setShowAddForm(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={newClient.name}
                      onChange={(e) => setNewClient(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Nome cliente o azienda"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>P.IVA / C.F.</Label>
                    <Input
                      value={newClient.vat || ''}
                      onChange={(e) => setNewClient(prev => ({ ...prev, vat: e.target.value }))}
                      placeholder="Partita IVA o Codice Fiscale"
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Indirizzo</Label>
                    <Input
                      value={newClient.address || ''}
                      onChange={(e) => setNewClient(prev => ({ ...prev, address: e.target.value }))}
                      placeholder="Indirizzo completo"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={newClient.email || ''}
                      onChange={(e) => setNewClient(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="email@esempio.com"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input
                      value={newClient.phone || ''}
                      onChange={(e) => setNewClient(prev => ({ ...prev, phone: e.target.value }))}
                      placeholder="+39 ..."
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setShowAddForm(false)}>
                    Annulla
                  </Button>
                  <Button onClick={handleAddClient} disabled={!newClient.name.trim() || saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Salva Cliente
                  </Button>
                </div>
              </div>
            ) : (
              <Button onClick={() => setShowAddForm(true)} className="mb-4">
                <Plus className="h-4 w-4 mr-2" />
                Aggiungi Cliente
              </Button>
            )}

            {/* Edit Client Form */}
            {editingClient && (
              <div className="p-4 mb-4 border rounded-lg bg-primary/5 space-y-4">
                <div className="flex items-center justify-between">
                  <Label className="text-base font-medium">Modifica Cliente</Label>
                  <Button variant="ghost" size="icon" onClick={() => setEditingClient(null)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome *</Label>
                    <Input
                      value={editingClient.name}
                      onChange={(e) => setEditingClient(prev => prev ? { ...prev, name: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>P.IVA / C.F.</Label>
                    <Input
                      value={editingClient.vat || ''}
                      onChange={(e) => setEditingClient(prev => prev ? { ...prev, vat: e.target.value } : null)}
                    />
                  </div>
                  <div className="col-span-2 space-y-2">
                    <Label>Indirizzo</Label>
                    <Input
                      value={editingClient.address || ''}
                      onChange={(e) => setEditingClient(prev => prev ? { ...prev, address: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Email</Label>
                    <Input
                      type="email"
                      value={editingClient.email || ''}
                      onChange={(e) => setEditingClient(prev => prev ? { ...prev, email: e.target.value } : null)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefono</Label>
                    <Input
                      value={editingClient.phone || ''}
                      onChange={(e) => setEditingClient(prev => prev ? { ...prev, phone: e.target.value } : null)}
                    />
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setEditingClient(null)}>
                    Annulla
                  </Button>
                  <Button onClick={handleUpdateClient} disabled={!editingClient.name.trim() || saving}>
                    <Save className="h-4 w-4 mr-2" />
                    Salva Modifiche
                  </Button>
                </div>
              </div>
            )}

            {/* Clients Table */}
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Caricamento...</div>
            ) : clients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nessun cliente salvato. Aggiungi il tuo primo cliente!
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10"></TableHead>
                    <TableHead>Nome</TableHead>
                    <TableHead>P.IVA</TableHead>
                    <TableHead>Indirizzo</TableHead>
                    <TableHead className="text-right">Azioni</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {clients.map((client) => (
                    <TableRow key={client.id}>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => toggleFavorite(client.id)}
                        >
                          <Star
                            className={cn(
                              'h-4 w-4',
                              client.is_favorite ? 'fill-yellow-400 text-yellow-400' : 'text-muted-foreground'
                            )}
                          />
                        </Button>
                      </TableCell>
                      <TableCell className="font-medium">{client.name}</TableCell>
                      <TableCell className="text-muted-foreground">{client.vat || '-'}</TableCell>
                      <TableCell className="text-muted-foreground max-w-[200px] truncate">
                        {client.address || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => setEditingClient(client)}
                        >
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 text-destructive hover:text-destructive"
                          onClick={() => setDeletingClient(client)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deletingClient} onOpenChange={() => setDeletingClient(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Eliminare questo cliente?</AlertDialogTitle>
            <AlertDialogDescription>
              Stai per eliminare "{deletingClient?.name}". Questa azione non può essere annullata.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annulla</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Elimina
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
