import React from 'react';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Trash2 } from 'lucide-react';

type Grade = Tables<'grades'>;

interface GradeTableProps {
  data: Grade[];
  subjects: Tables<'subjects'>[];
  students: Tables<'students'>[];
  onDelete: (id: string) => void;
}

export function GradeTable({ data, subjects, students, onDelete }: GradeTableProps) {
  const getSubjectName = (id: string) => subjects.find(s => s.id === id)?.name || '—';
  const getStudentName = (id: string) => {
    const s = students.find(st => st.id === id);
    return s ? `${s.first_name} ${s.last_name}` : '—';
  };

  if (data.length === 0) {
    return (
      <div className="bg-card shadow-card rounded-lg p-8 text-center text-muted-foreground">
        Aucune note enregistrée.
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-card shadow-card rounded-lg">
      <table className="min-w-full">
        <thead>
          <tr className="bg-muted">
            <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Élève</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matière</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Note</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((grade, index) => (
            <tr key={grade.id} className={`hover:bg-muted/50 ${index > 0 ? 'separator-shadow' : ''}`}>
              <td className="px-6 py-4 text-sm font-medium text-foreground">
                {getStudentName(grade.student_id)}
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {getSubjectName(grade.subject_id)}
              </td>
              <td className="px-6 py-4 text-sm font-semibold text-foreground tabular-nums">
                {Number(grade.value).toFixed(1)}/20
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {grade.exam_date || '—'}
              </td>
              <td className="px-6 py-4 text-right">
                <Button variant="ghost" size="icon" onClick={() => onDelete(grade.id)}>
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
