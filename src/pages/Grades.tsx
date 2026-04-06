import React, { useEffect, useState } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { GradeTable } from '@/components/GradeTable';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

/**
 * Page de gestion des notes.
 * Elle charge les référentiels au montage, puis permet de créer ou supprimer
 * une note tout en gardant la vue synchronisée avec la base.
 */
const Grades = () => {
  const { user, grades, students, subjects, fetchGrades, fetchStudents, fetchSubjects } = useGlobal();
  const [modalOpen, setModalOpen] = useState(false);
  const [studentId, setStudentId] = useState('');
  const [subjectId, setSubjectId] = useState('');
  const [value, setValue] = useState('');
  const [comment, setComment] = useState('');
  const [examDate, setExamDate] = useState(new Date().toISOString().split('T')[0]);

  useEffect(() => {
    fetchGrades();
    fetchStudents();
    fetchSubjects();
  }, [fetchGrades, fetchStudents, fetchSubjects]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // La note est saisie comme texte, puis convertie pour valider le barème /20.
    const numVal = parseFloat(value);
    if (isNaN(numVal) || numVal < 0 || numVal > 20) {
      toast.error('La note doit être comprise entre 0 et 20. ⚠️');
      return;
    }
    const { error } = await supabase.from('grades').insert({
      teacher_id: user.id,
      student_id: studentId,
      subject_id: subjectId,
      value: numVal,
      comment: comment.trim() || null,
      exam_date: examDate,
    });
    if (error) toast.error(error.message);
    else {
      toast.success('Note ajoutée. ✅');
      // On nettoie le formulaire pour éviter de réutiliser une saisie précédente.
      setStudentId('');
      setSubjectId('');
      setValue('');
      setComment('');
      setModalOpen(false);
      fetchGrades();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('grades').delete().eq('id', id);
    if (error) toast.error(error.message);
    else {
      toast.success('Note supprimée. 🗑️');
      // Le rafraîchissement immédiat garde la table fidèle à l'état serveur.
      fetchGrades();
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notes</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {grades.length} note(s) enregistrée(s). <strong className="text-foreground">La régularité</strong> rend le suivi plus fiable.
          </p>
        </div>
        <Button onClick={() => setModalOpen(true)} disabled={students.length === 0 || subjects.length === 0}>
          <Plus className="h-4 w-4 mr-2" />
          Ajouter une note
        </Button>
      </div>

      {(students.length === 0 || subjects.length === 0) && (
        <div className="bg-card shadow-card rounded-lg p-4 text-sm text-muted-foreground">
          Ajoutez d'abord des <strong className="text-foreground">élèves</strong> et des <strong className="text-foreground">matières</strong> avant de saisir des notes.
        </div>
      )}

      <GradeTable data={grades} subjects={subjects} students={students} onDelete={handleDelete} />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title="Ajouter une note"
        description="Sélectionnez un élève et une matière, puis saisissez une note sur 20 avec la date correspondante."
      >
        <form onSubmit={handleCreate} className="space-y-4">
          <div className="space-y-2">
            <Label>Élève</Label>
            <Select value={studentId} onValueChange={setStudentId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner un élève" /></SelectTrigger>
              <SelectContent>
                {students.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.first_name} {s.last_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Matière</Label>
            <Select value={subjectId} onValueChange={setSubjectId}>
              <SelectTrigger><SelectValue placeholder="Sélectionner une matière" /></SelectTrigger>
              <SelectContent>
                {subjects.map(s => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="gradeValue">Note (/20)</Label>
              <Input id="gradeValue" type="number" step="0.5" min="0" max="20" value={value} onChange={(e) => setValue(e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examDate">Date</Label>
              <Input id="examDate" type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire (optionnel)</Label>
            <Input id="comment" value={comment} onChange={(e) => setComment(e.target.value)} />
            <p className="text-xs text-muted-foreground">Ajoutez une précision utile si la note mérite un contexte particulier.</p>
          </div>
          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>Annuler</Button>
            <Button type="submit" disabled={!studentId || !subjectId || !value}>Créer la note</Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Grades;
