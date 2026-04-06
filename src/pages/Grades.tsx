import React, { useEffect, useMemo, useState } from 'react';
import { Plus } from 'lucide-react';
import { toast } from 'sonner';
import { GradeTable } from '@/components/GradeTable';
import { Loader } from '@/components/Loader';
import { Modal } from '@/components/Modal';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useGlobal } from '@/context/GlobalContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Grade = Tables<'grades'>;
type SchoolYear = Tables<'school_years'>;

type GradeFormState = {
  studentId: string;
  subjectId: string;
  schoolYearId: string;
  value: string;
  comment: string;
  examDate: string;
};

const today = new Date().toISOString().split('T')[0];

const EMPTY_GRADE_FORM: GradeFormState = {
  studentId: '',
  subjectId: '',
  schoolYearId: '',
  value: '',
  comment: '',
  examDate: today,
};

/**
 * Page de gestion des notes.
 * Elle relie les notes a l eleve, la matiere, la classe et l annee scolaire.
 */
const Grades = () => {
  const {
    user,
    grades,
    students,
    subjects,
    classes,
    schoolYears,
    fetchGrades,
    fetchStudents,
    fetchSubjects,
    fetchClasses,
    fetchSchoolYears,
  } = useGlobal();

  const [pageLoading, setPageLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [editingGrade, setEditingGrade] = useState<Grade | null>(null);
  const [form, setForm] = useState<GradeFormState>(EMPTY_GRADE_FORM);

  useEffect(() => {
    let mounted = true;

    Promise.all([
      fetchGrades(),
      fetchStudents(),
      fetchSubjects(),
      fetchClasses(),
      fetchSchoolYears(),
    ]).finally(() => {
      if (mounted) {
        setPageLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [fetchGrades, fetchStudents, fetchSubjects, fetchClasses, fetchSchoolYears]);

  const activeSchoolYear = useMemo<SchoolYear | null>(
    () => schoolYears.find((schoolYear) => schoolYear.is_active) ?? schoolYears[0] ?? null,
    [schoolYears],
  );

  const visibleStudents = useMemo(() => {
    return students.filter((student) => {
      if (selectedClassId !== 'all' && student.class_id !== selectedClassId) {
        return false;
      }

      if (selectedSchoolYearId !== 'all') {
        const classItem = classes.find((item) => item.id === student.class_id);
        if (classItem?.school_year_id !== selectedSchoolYearId) {
          return false;
        }
      }

      return true;
    });
  }, [students, classes, selectedClassId, selectedSchoolYearId]);

  const filteredGrades = useMemo(() => {
    return grades.filter((grade) => {
      if (selectedSchoolYearId !== 'all' && grade.school_year_id !== selectedSchoolYearId) {
        return false;
      }

      if (selectedClassId !== 'all') {
        const student = students.find((item) => item.id === grade.student_id);
        if (student?.class_id !== selectedClassId) {
          return false;
        }
      }

      return true;
    });
  }, [grades, students, selectedSchoolYearId, selectedClassId]);

  const resetForm = () => {
    setEditingGrade(null);
    setForm({
      ...EMPTY_GRADE_FORM,
      schoolYearId: activeSchoolYear?.id ?? '',
      examDate: today,
    });
  };

  const openCreateModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = (grade: Grade) => {
    setEditingGrade(grade);
    setForm({
      studentId: grade.student_id,
      subjectId: grade.subject_id,
      schoolYearId: grade.school_year_id ?? '',
      value: String(grade.value),
      comment: grade.comment ?? '',
      examDate: grade.exam_date ?? today,
    });
    setModalOpen(true);
  };

  const handleCreateOrUpdate = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    const numericValue = parseFloat(form.value);
    if (Number.isNaN(numericValue) || numericValue < 0 || numericValue > 20) {
      toast.error('La note doit etre comprise entre 0 et 20.');
      return;
    }

    setSubmitting(true);

    const payload = {
      teacher_id: user.id,
      student_id: form.studentId,
      subject_id: form.subjectId,
      school_year_id: form.schoolYearId || null,
      value: numericValue,
      comment: form.comment.trim() || null,
      exam_date: form.examDate || null,
    };

    const request = editingGrade
      ? supabase.from('grades').update(payload).eq('id', editingGrade.id)
      : supabase.from('grades').insert(payload);

    const { error } = await request;

    if (error) {
      toast.error(error.message);
      setSubmitting(false);
      return;
    }

    toast.success(editingGrade ? 'Note modifiee.' : 'Note ajoutee.');
    await fetchGrades();
    setSubmitting(false);
    setModalOpen(false);
    resetForm();
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from('grades').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Note supprimee.');
    await fetchGrades();
  };

  if (pageLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Notes</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere les notes avec leur contexte complet: eleve, classe, matiere et annee scolaire.
          </p>
        </div>
        <Button
          onClick={openCreateModal}
          disabled={students.length === 0 || subjects.length === 0 || schoolYears.length === 0}
        >
          <Plus className="mr-2 h-4 w-4" />
          Ajouter une note
        </Button>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Notes visibles</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{filteredGrades.length}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eleves visibles</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{visibleStudents.length}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matieres</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{subjects.length}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Annee active</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{activeSchoolYear?.name ?? 'Aucune'}</p>
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 shadow-card sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Annee scolaire</Label>
            <Select value={selectedSchoolYearId} onValueChange={setSelectedSchoolYearId}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les annees" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les annees</SelectItem>
                {schoolYears.map((schoolYear) => (
                  <SelectItem key={schoolYear.id} value={schoolYear.id}>
                    {schoolYear.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Classe</Label>
            <Select value={selectedClassId} onValueChange={setSelectedClassId}>
              <SelectTrigger>
                <SelectValue placeholder="Toutes les classes" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {(students.length === 0 || subjects.length === 0 || schoolYears.length === 0) && (
        <div className="rounded-lg bg-card p-4 text-sm text-muted-foreground shadow-card">
          Il faut au moins des eleves, des matieres et une annee scolaire avant de saisir des notes.
        </div>
      )}

      <GradeTable
        data={filteredGrades}
        subjects={subjects}
        students={students}
        classes={classes}
        schoolYears={schoolYears}
        onEdit={openEditModal}
        onDelete={handleDelete}
      />

      <Modal
        open={modalOpen}
        onOpenChange={setModalOpen}
        title={editingGrade ? 'Modifier une note' : 'Ajouter une note'}
        description="Renseignez la note, puis rattachez-la a l eleve, la matiere et l annee scolaire correspondants."
      >
        <form onSubmit={handleCreateOrUpdate} className="space-y-4">
          <div className="space-y-2">
            <Label>Eleve</Label>
            <Select
              value={form.studentId}
              onValueChange={(value) => setForm((current) => ({ ...current, studentId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Selectionner un eleve" />
              </SelectTrigger>
              <SelectContent>
                {students.map((student) => (
                  <SelectItem key={student.id} value={student.id}>
                    {student.first_name} {student.last_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Matiere</Label>
              <Select
                value={form.subjectId}
                onValueChange={(value) => setForm((current) => ({ ...current, subjectId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une matiere" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Annee scolaire</Label>
              <Select
                value={form.schoolYearId}
                onValueChange={(value) => setForm((current) => ({ ...current, schoolYearId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selectionner une annee" />
                </SelectTrigger>
                <SelectContent>
                  {schoolYears.map((schoolYear) => (
                    <SelectItem key={schoolYear.id} value={schoolYear.id}>
                      {schoolYear.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="gradeValue">Note (/20)</Label>
              <Input
                id="gradeValue"
                type="number"
                step="0.5"
                min="0"
                max="20"
                value={form.value}
                onChange={(event) => setForm((current) => ({ ...current, value: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="examDate">Date</Label>
              <Input
                id="examDate"
                type="date"
                value={form.examDate}
                onChange={(event) => setForm((current) => ({ ...current, examDate: event.target.value }))}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="comment">Commentaire</Label>
            <Input
              id="comment"
              value={form.comment}
              onChange={(event) => setForm((current) => ({ ...current, comment: event.target.value }))}
              placeholder="Optionnel"
            />
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={submitting || !form.studentId || !form.subjectId || !form.schoolYearId || !form.value}
            >
              {submitting ? 'Enregistrement...' : editingGrade ? 'Mettre a jour' : 'Creer la note'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Grades;
