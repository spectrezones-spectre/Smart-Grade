import React, { useEffect, useState } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Subjects = () => {
  const { user, subjects, fetchSubjects } = useGlobal();
  const [modalOpen, setModalOpen] = useState(false);
  const [name, setName] = useState('');
  const [coefficient, setCoefficient] = useState('1');

  useEffect(() => {
    // Recharge la configuration pour éviter d'afficher une liste périmée.
    fetchSubjects();
  }, [fetchSubjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const coef = parseFloat(coefficient);
    // On bloque les coefficients nuls ou invalides pour préserver les calculs de moyenne.
    if (isNaN(coef) || coef <= 0) {
      toast.error('Le coefficient doit être supérieur à 0. ⚠️');
      return;
    }
    const { error } = await supabase.from('subjects').insert({
      teacher_id: user.id,
      name: name.trim(),
      coefficient: coef,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Matière ajoutée. ✅');
      setName('');
      setCoefficient('1');
      setModalOpen(false);
      fetchSubjects();
    }
  };

  const handleDelete = async (id: string) => {
    // La suppression reste volontairement directe: une matière est identifiée par son id.
    const { error } = await supabase.from('subjects').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Matière supprimée. 🗑️');
      fetchSubjects();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Matières</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {subjects.length} matière(s) configurée(s). <strong className="text-foreground">Des noms clairs</strong> facilitent le suivi.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une matière
        </Button>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {subjects.map((subject) => (
          <div key={subject.id} className="bg-card shadow-card rounded-lg p-5 flex items-center justify-between">
            <div>
              <p className="font-medium text-foreground">{subject.name}</p>
              <p className="text-sm text-muted-foreground">Coefficient : {Number(subject.coefficient)}</p>
            </div>
            <Button variant="ghost" size="icon" onClick={() => handleDelete(subject.id)}>
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
        {subjects.length === 0 && (
          <div className="col-span-full bg-card shadow-card rounded-lg p-8 text-center text-muted-foreground space-y-2">
            <p className="text-base font-medium text-foreground">Aucune matière pour le moment.</p>
            <p>Ajoutez-en une pour démarrer la saisie des notes et organiser vos calculs.</p>
          </div>
        )}
      </div>

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Ajouter une matière"
        description="Renseignez un nom explicite et un coefficient supérieur à 0 pour garder des calculs cohérents."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="subjectName">Nom</Label>
            <Input id="subjectName" value={name} onChange={(e) => setName(e.target.value)} placeholder="Ex. Mathématiques" required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="coefficient">Coefficient</Label>
            <Input id="coefficient" type="number" step="0.1" min="0.1" value={coefficient} onChange={(e) => setCoefficient(e.target.value)} required />
            <p className="text-xs text-muted-foreground">Exemple : 1, 1.5, 2. Plus le coefficient est élevé, plus la matière pèse dans les calculs.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit">Créer la matière</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Subjects;
