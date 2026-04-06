import React from 'react';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Pencil, Trash2 } from 'lucide-react';

type Grade = Tables<'grades'>;
type Subject = Tables<'subjects'>;
type Student = Tables<'students'>;
type ClassRow = Tables<'classes'>;
type SchoolYear = Tables<'school_years'>;

interface GradeTableProps {
  data: Grade[];
  subjects: Subject[];
  students: Student[];
  classes: ClassRow[];
  schoolYears: SchoolYear[];
  onEdit: (grade: Grade) => void;
  onDelete: (id: string) => void;
}

/**
 * Tableau responsif des notes.
 * La version mobile affiche des cartes pour conserver les informations essentielles visibles.
 */
export function GradeTable({ data, subjects, students, classes, schoolYears, onEdit, onDelete }: GradeTableProps) {
  const getSubjectName = (id: string) => subjects.find((subject) => subject.id === id)?.name ?? '-';
  const getStudent = (id: string) => students.find((student) => student.id === id) ?? null;
  const getStudentName = (id: string) => {
    const student = getStudent(id);
    return student ? `${student.first_name} ${student.last_name}` : '-';
  };
  const getClassName = (studentId: string) => {
    const student = getStudent(studentId);
    return classes.find((classItem) => classItem.id === student?.class_id)?.name ?? 'Non assignee';
  };
  const getSchoolYearName = (schoolYearId: string | null) => schoolYears.find((schoolYear) => schoolYear.id === schoolYearId)?.name ?? '-';

  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-card p-8 text-center text-muted-foreground shadow-card">
        Aucune note enregistree.
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg bg-card shadow-card lg:block">
        <table className="min-w-full">
          <thead>
            <tr className="bg-muted">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eleve</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classe</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matiere</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Annee</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((grade, index) => (
              <tr key={grade.id} className={`hover:bg-muted/50 ${index > 0 ? 'separator-shadow' : ''}`}>
                <td className="px-6 py-4 text-sm font-medium text-foreground">{getStudentName(grade.student_id)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{getClassName(grade.student_id)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{getSubjectName(grade.subject_id)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{getSchoolYearName(grade.school_year_id)}</td>
                <td className="px-6 py-4 text-sm font-semibold tabular-nums text-foreground">{Number(grade.value).toFixed(1)}/20</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{grade.exam_date || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onEdit(grade)} title="Modifier la note">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(grade.id)} title="Supprimer la note">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 lg:hidden">
        {data.map((grade) => (
          <div key={grade.id} className="rounded-xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div className="space-y-1">
                <p className="font-medium text-foreground">{getStudentName(grade.student_id)}</p>
                <p className="text-sm text-muted-foreground">{getClassName(grade.student_id)}</p>
                <p className="text-sm text-muted-foreground">{getSubjectName(grade.subject_id)}</p>
                <p className="text-xs text-muted-foreground">Annee: {getSchoolYearName(grade.school_year_id)}</p>
                <p className="text-xs text-muted-foreground">Date: {grade.exam_date || '-'}</p>
              </div>
              <div className="flex flex-col items-end gap-2">
                <p className="text-lg font-semibold tabular-nums text-foreground">{Number(grade.value).toFixed(1)}/20</p>
                <div className="flex items-center gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onEdit(grade)} title="Modifier la note">
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(grade.id)} title="Supprimer la note">
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
