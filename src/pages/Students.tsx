import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGlobal } from '@/context/GlobalContext';
import { StudentTable } from '@/components/StudentTable';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Students = () => {
  const { user, students, fetchStudents } = useGlobal();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(false);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [identifier, setIdentifier] = useState('');

  useEffect(() => {
    // Re-synchronise la liste au montage pour partir de l'état serveur le plus récent.
    fetchStudents();
  }, [fetchStudents]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const { error } = await supabase.from('students').insert({
      teacher_id: user.id,
      first_name: firstName.trim(),
      last_name: lastName.trim(),
      identifier: identifier.trim() || null,
    });
    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Élève ajouté');
      setFirstName('');
      setLastName('');
      setIdentifier('');
      setModalOpen(false);
      fetchStudents();
    }
  };

  const handleDelete = async (id: string) => {
    // La suppression cible la clé primaire de la ligne pour rester explicite.
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Élève supprimé');
      fetchStudents();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Élèves</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {students.length} élève(s) dans votre liste. <strong className="text-foreground">Gardez un suivi clair</strong> au fil du temps.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter un élève
        </Button>
      </div>

      <StudentTable
        data={students}
        onView={(s) => navigate(`/students/${s.id}`)}
        onDelete={handleDelete}
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Ajouter un élève"
        description="Le prénom et le nom sont obligatoires. L'identifiant reste optionnel si vous souhaitez le renseigner."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">Prénom</Label>
            <Input id="firstName" value={firstName} onChange={(e) => setFirstName(e.target.value)} placeholder="Ex. Spectre" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Nom</Label>
            <Input id="lastName" value={lastName} onChange={(e) => setLastName(e.target.value)} placeholder="Ex. Admin" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="identifier">Identifiant (optionnel)</Label>
            <Input id="identifier" value={identifier} onChange={(e) => setIdentifier(e.target.value)} placeholder="Ex. A24-001" />
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit">Créer l’élève</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Students;
