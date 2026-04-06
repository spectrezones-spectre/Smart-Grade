import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { BookOpenCheck, Pencil, Plus, School, Trash2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Modal } from '@/components/Modal';
import { Loader } from '@/components/Loader';
import { StudentTable } from '@/components/StudentTable';
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

type Student = Tables<'students'>;
type ClassRow = Tables<'classes'>;
type SchoolYear = Tables<'school_years'>;

type StudentFormState = {
  firstName: string;
  lastName: string;
  identifier: string;
  classId: string;
};

type ClassFormState = {
  name: string;
  level: string;
  schoolYearId: string;
};

type SchoolYearFormState = {
  name: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
};

const EMPTY_STUDENT_FORM: StudentFormState = {
  firstName: '',
  lastName: '',
  identifier: '',
  classId: 'none',
};

const EMPTY_CLASS_FORM: ClassFormState = {
  name: '',
  level: '',
  schoolYearId: 'none',
};

const EMPTY_SCHOOL_YEAR_FORM: SchoolYearFormState = {
  name: '',
  startDate: '',
  endDate: '',
  isActive: false,
};

/**
 * Page de gestion des eleves.
 * Elle centralise aussi la gestion des classes et des annees scolaires
 * afin que les formulaires eleves puissent exploiter ces references en production.
 */
const Students = () => {
  const {
    user,
    students,
    classes,
    schoolYears,
    fetchStudents,
    fetchClasses,
    fetchSchoolYears,
  } = useGlobal();
  const navigate = useNavigate();

  const [pageLoading, setPageLoading] = useState(true);
  const [studentModalOpen, setStudentModalOpen] = useState(false);
  const [classModalOpen, setClassModalOpen] = useState(false);
  const [schoolYearModalOpen, setSchoolYearModalOpen] = useState(false);
  const [studentSubmitting, setStudentSubmitting] = useState(false);
  const [classSubmitting, setClassSubmitting] = useState(false);
  const [schoolYearSubmitting, setSchoolYearSubmitting] = useState(false);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('all');
  const [selectedClassId, setSelectedClassId] = useState('all');
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [editingClass, setEditingClass] = useState<ClassRow | null>(null);
  const [editingSchoolYear, setEditingSchoolYear] = useState<SchoolYear | null>(null);
  const [studentForm, setStudentForm] = useState<StudentFormState>(EMPTY_STUDENT_FORM);
  const [classForm, setClassForm] = useState<ClassFormState>(EMPTY_CLASS_FORM);
  const [schoolYearForm, setSchoolYearForm] = useState<SchoolYearFormState>(EMPTY_SCHOOL_YEAR_FORM);

  useEffect(() => {
    let mounted = true;

    /**
     * Charge les referentiels de la page en parallele pour afficher un ecran coherant.
     */
    Promise.all([fetchStudents(), fetchClasses(), fetchSchoolYears()]).finally(() => {
      if (mounted) {
        setPageLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [fetchStudents, fetchClasses, fetchSchoolYears]);

  const activeSchoolYear = useMemo(
    () => schoolYears.find((schoolYear) => schoolYear.is_active) ?? schoolYears[0] ?? null,
    [schoolYears],
  );

  const visibleClasses = useMemo(() => {
    if (selectedSchoolYearId === 'all') {
      return classes;
    }

    return classes.filter((classItem) => classItem.school_year_id === selectedSchoolYearId);
  }, [classes, selectedSchoolYearId]);

  const filteredStudents = useMemo(() => {
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

  const resetStudentForm = () => {
    setEditingStudent(null);
    setStudentForm({
      ...EMPTY_STUDENT_FORM,
      classId: activeSchoolYear ? visibleClasses[0]?.id ?? 'none' : 'none',
    });
  };

  const resetClassForm = () => {
    setEditingClass(null);
    setClassForm({
      ...EMPTY_CLASS_FORM,
      schoolYearId: activeSchoolYear?.id ?? 'none',
    });
  };

  const resetSchoolYearForm = () => {
    setEditingSchoolYear(null);
    setSchoolYearForm({
      ...EMPTY_SCHOOL_YEAR_FORM,
      isActive: schoolYears.length === 0,
    });
  };

  const openCreateStudentModal = () => {
    resetStudentForm();
    setStudentModalOpen(true);
  };

  const openEditStudentModal = (student: Student) => {
    setEditingStudent(student);
    setStudentForm({
      firstName: student.first_name,
      lastName: student.last_name,
      identifier: student.identifier ?? '',
      classId: student.class_id ?? 'none',
    });
    setStudentModalOpen(true);
  };

  const openCreateClassModal = () => {
    resetClassForm();
    setClassModalOpen(true);
  };

  const openEditClassModal = (classItem: ClassRow) => {
    setEditingClass(classItem);
    setClassForm({
      name: classItem.name,
      level: classItem.level ?? '',
      schoolYearId: classItem.school_year_id ?? 'none',
    });
    setClassModalOpen(true);
  };

  const openCreateSchoolYearModal = () => {
    resetSchoolYearForm();
    setSchoolYearModalOpen(true);
  };

  const openEditSchoolYearModal = (schoolYear: SchoolYear) => {
    setEditingSchoolYear(schoolYear);
    setSchoolYearForm({
      name: schoolYear.name,
      startDate: schoolYear.start_date ?? '',
      endDate: schoolYear.end_date ?? '',
      isActive: Boolean(schoolYear.is_active),
    });
    setSchoolYearModalOpen(true);
  };

  /**
   * Assure qu'une seule annee scolaire reste active a la fois.
   */
  const syncActiveSchoolYear = async (isActive: boolean, currentId?: string) => {
    if (!isActive || !user) return;

    let query = supabase
      .from('school_years')
      .update({ is_active: false })
      .eq('teacher_id', user.id)
      .eq('is_active', true);

    if (currentId) {
      query = query.neq('id', currentId);
    }

    const { error } = await query;
    if (error) {
      throw error;
    }
  };

  const handleCreateOrUpdateStudent = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setStudentSubmitting(true);

    const payload = {
      teacher_id: user.id,
      first_name: studentForm.firstName.trim(),
      last_name: studentForm.lastName.trim(),
      identifier: studentForm.identifier.trim() || null,
      class_id: studentForm.classId === 'none' ? null : studentForm.classId,
    };

    const request = editingStudent
      ? supabase.from('students').update(payload).eq('id', editingStudent.id)
      : supabase.from('students').insert(payload);

    const { error } = await request;

    if (error) {
      toast.error(error.message);
      setStudentSubmitting(false);
      return;
    }

    toast.success(editingStudent ? 'Eleve modifie avec succes.' : 'Eleve ajoute avec succes.');
    await fetchStudents();
    setStudentSubmitting(false);
    setStudentModalOpen(false);
    resetStudentForm();
  };

  const handleDeleteStudent = async (id: string) => {
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Eleve supprime.');
    await fetchStudents();
  };

  const handleCreateOrUpdateClass = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setClassSubmitting(true);

    const payload = {
      teacher_id: user.id,
      name: classForm.name.trim(),
      level: classForm.level.trim() || null,
      school_year_id: classForm.schoolYearId === 'none' ? null : classForm.schoolYearId,
    };

    const request = editingClass
      ? supabase.from('classes').update(payload).eq('id', editingClass.id)
      : supabase.from('classes').insert(payload);

    const { error } = await request;

    if (error) {
      toast.error(error.message);
      setClassSubmitting(false);
      return;
    }

    toast.success(editingClass ? 'Classe modifiee.' : 'Classe creee.');
    await fetchClasses();
    setClassSubmitting(false);
    setClassModalOpen(false);
    resetClassForm();
  };

  const handleDeleteClass = async (id: string) => {
    const { error } = await supabase.from('classes').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Classe supprimee.');
    await Promise.all([fetchClasses(), fetchStudents()]);
  };

  const handleCreateOrUpdateSchoolYear = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;

    setSchoolYearSubmitting(true);

    try {
      await syncActiveSchoolYear(schoolYearForm.isActive, editingSchoolYear?.id);

      const payload = {
        teacher_id: user.id,
        name: schoolYearForm.name.trim(),
        start_date: schoolYearForm.startDate || null,
        end_date: schoolYearForm.endDate || null,
        is_active: schoolYearForm.isActive,
      };

      const request = editingSchoolYear
        ? supabase.from('school_years').update(payload).eq('id', editingSchoolYear.id)
        : supabase.from('school_years').insert(payload);

      const { error } = await request;

      if (error) {
        throw error;
      }

      toast.success(editingSchoolYear ? 'Annee scolaire modifiee.' : 'Annee scolaire creee.');
      await fetchSchoolYears();
      setSchoolYearModalOpen(false);
      resetSchoolYearForm();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Impossible d enregistrer l annee scolaire.');
    } finally {
      setSchoolYearSubmitting(false);
    }
  };

  const handleDeleteSchoolYear = async (id: string) => {
    const { error } = await supabase.from('school_years').delete().eq('id', id);
    if (error) {
      toast.error(error.message);
      return;
    }

    toast.success('Annee scolaire supprimee.');
    await fetchSchoolYears();
  };

  if (pageLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Eleves</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Gere les eleves, leurs classes et les annees scolaires depuis un point central coherent.
          </p>
        </div>

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button variant="outline" onClick={openCreateSchoolYearModal}>
            <BookOpenCheck className="mr-2 h-4 w-4" />
            Nouvelle annee
          </Button>
          <Button variant="outline" onClick={openCreateClassModal}>
            <School className="mr-2 h-4 w-4" />
            Nouvelle classe
          </Button>
          <Button onClick={openCreateStudentModal}>
            <Plus className="mr-2 h-4 w-4" />
            Ajouter un eleve
          </Button>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eleves visibles</p>
          <p className="mt-2 text-3xl font-bold text-foreground tabular-nums">{filteredStudents.length}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classes</p>
          <p className="mt-2 text-3xl font-bold text-foreground tabular-nums">{visibleClasses.length}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Annees scolaires</p>
          <p className="mt-2 text-3xl font-bold text-foreground tabular-nums">{schoolYears.length}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Annee active</p>
          <p className="mt-2 text-lg font-semibold text-foreground">{activeSchoolYear?.name ?? 'Aucune'}</p>
        </div>
      </section>

      <section className="rounded-xl bg-card p-4 shadow-card sm:p-5">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <Label>Annee scolaire</Label>
            <Select
              value={selectedSchoolYearId}
              onValueChange={(value) => {
                setSelectedSchoolYearId(value);
                setSelectedClassId('all');
              }}
            >
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
                {visibleClasses.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[2fr_1fr]">
        <div className="space-y-4">
          <StudentTable
            data={filteredStudents}
            classes={classes}
            onView={(student) => navigate(`/students/${student.id}`)}
            onEdit={openEditStudentModal}
            onDelete={handleDeleteStudent}
          />
        </div>

        <div className="space-y-4">
          <div className="rounded-xl bg-card p-4 shadow-card sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Classes</h2>
                <p className="text-sm text-muted-foreground">Affectation des eleves et structure scolaire.</p>
              </div>
              <Button size="sm" variant="outline" onClick={openCreateClassModal}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {visibleClasses.length > 0 ? (
                visibleClasses.map((classItem) => (
                  <div key={classItem.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{classItem.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {classItem.level || 'Niveau non renseigne'} | {schoolYears.find((schoolYear) => schoolYear.id === classItem.school_year_id)?.name ?? 'Sans annee'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditClassModal(classItem)} title="Modifier la classe">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteClass(classItem.id)} title="Supprimer la classe">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Aucune classe pour ce filtre.</p>
              )}
            </div>
          </div>

          <div className="rounded-xl bg-card p-4 shadow-card sm:p-5">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h2 className="font-semibold text-foreground">Annees scolaires</h2>
                <p className="text-sm text-muted-foreground">Une seule annee peut rester active a la fois.</p>
              </div>
              <Button size="sm" variant="outline" onClick={openCreateSchoolYearModal}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>

            <div className="space-y-3">
              {schoolYears.length > 0 ? (
                schoolYears.map((schoolYear) => (
                  <div key={schoolYear.id} className="rounded-lg border border-border p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium text-foreground">{schoolYear.name}</p>
                        <p className="text-sm text-muted-foreground">
                          {schoolYear.start_date || 'Debut non renseigne'} - {schoolYear.end_date || 'Fin non renseignee'}
                        </p>
                        <p className="mt-1 text-xs text-primary">
                          {schoolYear.is_active ? 'Annee active' : 'Annee inactive'}
                        </p>
                      </div>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => openEditSchoolYearModal(schoolYear)} title="Modifier l annee scolaire">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => handleDeleteSchoolYear(schoolYear.id)} title="Supprimer l annee scolaire">
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Aucune annee scolaire disponible.</p>
              )}
            </div>
          </div>
        </div>
      </section>

      <Modal
        open={studentModalOpen}
        onOpenChange={setStudentModalOpen}
        title={editingStudent ? 'Modifier un eleve' : 'Ajouter un eleve'}
        description="Renseignez les informations d identite puis affectez l eleve a une classe si necessaire."
      >
        <form onSubmit={handleCreateOrUpdateStudent} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="firstName">Prenom</Label>
              <Input
                id="firstName"
                value={studentForm.firstName}
                onChange={(event) => setStudentForm((current) => ({ ...current, firstName: event.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="lastName">Nom</Label>
              <Input
                id="lastName"
                value={studentForm.lastName}
                onChange={(event) => setStudentForm((current) => ({ ...current, lastName: event.target.value }))}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="identifier">Identifiant</Label>
            <Input
              id="identifier"
              value={studentForm.identifier}
              onChange={(event) => setStudentForm((current) => ({ ...current, identifier: event.target.value }))}
              placeholder="Optionnel"
            />
          </div>

          <div className="space-y-2">
            <Label>Classe</Label>
            <Select
              value={studentForm.classId}
              onValueChange={(value) => setStudentForm((current) => ({ ...current, classId: value }))}
            >
              <SelectTrigger>
                <SelectValue placeholder="Aucune classe" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Aucune classe</SelectItem>
                {classes.map((classItem) => (
                  <SelectItem key={classItem.id} value={classItem.id}>
                    {classItem.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setStudentModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={studentSubmitting}>
              {studentSubmitting ? 'Enregistrement...' : editingStudent ? 'Mettre a jour' : 'Creer l eleve'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={classModalOpen}
        onOpenChange={setClassModalOpen}
        title={editingClass ? 'Modifier une classe' : 'Ajouter une classe'}
        description="Les classes sont rattachees a une annee scolaire pour garder une organisation propre."
      >
        <form onSubmit={handleCreateOrUpdateClass} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="className">Nom</Label>
            <Input
              id="className"
              value={classForm.name}
              onChange={(event) => setClassForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ex. 6e A"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="classLevel">Niveau</Label>
              <Input
                id="classLevel"
                value={classForm.level}
                onChange={(event) => setClassForm((current) => ({ ...current, level: event.target.value }))}
                placeholder="Ex. 6e"
              />
            </div>
            <div className="space-y-2">
              <Label>Annee scolaire</Label>
              <Select
                value={classForm.schoolYearId}
                onValueChange={(value) => setClassForm((current) => ({ ...current, schoolYearId: value }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Aucune annee" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Aucune annee</SelectItem>
                  {schoolYears.map((schoolYear) => (
                    <SelectItem key={schoolYear.id} value={schoolYear.id}>
                      {schoolYear.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setClassModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={classSubmitting}>
              {classSubmitting ? 'Enregistrement...' : editingClass ? 'Mettre a jour' : 'Creer la classe'}
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={schoolYearModalOpen}
        onOpenChange={setSchoolYearModalOpen}
        title={editingSchoolYear ? 'Modifier une annee scolaire' : 'Ajouter une annee scolaire'}
        description="La date de debut, la date de fin et le statut actif servent a organiser classes, notes et bulletins."
      >
        <form onSubmit={handleCreateOrUpdateSchoolYear} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="schoolYearName">Nom</Label>
            <Input
              id="schoolYearName"
              value={schoolYearForm.name}
              onChange={(event) => setSchoolYearForm((current) => ({ ...current, name: event.target.value }))}
              placeholder="Ex. 2025-2026"
              required
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="startDate">Date de debut</Label>
              <Input
                id="startDate"
                type="date"
                value={schoolYearForm.startDate}
                onChange={(event) => setSchoolYearForm((current) => ({ ...current, startDate: event.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="endDate">Date de fin</Label>
              <Input
                id="endDate"
                type="date"
                value={schoolYearForm.endDate}
                onChange={(event) => setSchoolYearForm((current) => ({ ...current, endDate: event.target.value }))}
              />
            </div>
          </div>

          <label className="flex items-center gap-3 rounded-lg border border-border p-3 text-sm text-foreground">
            <input
              type="checkbox"
              checked={schoolYearForm.isActive}
              onChange={(event) => setSchoolYearForm((current) => ({ ...current, isActive: event.target.checked }))}
            />
            Definir cette annee comme annee active
          </label>

          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <Button type="button" variant="outline" onClick={() => setSchoolYearModalOpen(false)}>
              Annuler
            </Button>
            <Button type="submit" disabled={schoolYearSubmitting}>
              {schoolYearSubmitting ? 'Enregistrement...' : editingSchoolYear ? 'Mettre a jour' : 'Creer l annee'}
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default Students;
