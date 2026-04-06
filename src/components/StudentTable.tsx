import React from 'react';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2 } from 'lucide-react';

type Student = Tables<'students'>;
type ClassRow = Tables<'classes'>;

interface StudentTableProps {
  data: Student[];
  classes: ClassRow[];
  onView: (student: Student) => void;
  onEdit: (student: Student) => void;
  onDelete: (id: string) => void;
}

/**
 * Tableau responsif des eleves.
 * Il bascule en cartes sur mobile pour garder les actions visibles sans scroll horizontal.
 */
export function StudentTable({ data, classes, onView, onEdit, onDelete }: StudentTableProps) {
  const getClassName = (classId: string | null) => classes.find((classItem) => classItem.id === classId)?.name ?? 'Non assignee';

  if (data.length === 0) {
    return (
      <div className="rounded-lg bg-card p-8 text-center text-muted-foreground shadow-card">
        Aucun eleve trouve. Ajoutez votre premier eleve.
      </div>
    );
  }

  return (
    <>
      <div className="hidden overflow-hidden rounded-lg bg-card shadow-card md:block">
        <table className="min-w-full">
          <thead>
            <tr className="bg-muted">
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eleve</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classe</th>
              <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Identifiant</th>
              <th className="px-6 py-3 text-right text-xs font-semibold uppercase tracking-wider text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody>
            {data.map((student, index) => (
              <tr key={student.id} className={`hover:bg-muted/50 ${index > 0 ? 'separator-shadow' : ''}`}>
                <td className="px-6 py-4 text-sm font-medium text-foreground">
                  {student.first_name} {student.last_name}
                </td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{getClassName(student.class_id)}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{student.identifier || '-'}</td>
                <td className="px-6 py-4 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button variant="ghost" size="icon" onClick={() => onView(student)} title="Voir la fiche">
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onEdit(student)} title="Modifier l eleve">
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => onDelete(student.id)} title="Supprimer l eleve">
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="grid gap-3 md:hidden">
        {data.map((student) => (
          <div key={student.id} className="rounded-xl bg-card p-4 shadow-card">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium text-foreground">{student.first_name} {student.last_name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{getClassName(student.class_id)}</p>
                <p className="mt-1 text-xs text-muted-foreground">Identifiant: {student.identifier || '-'}</p>
              </div>
              <div className="flex items-center gap-1">
                <Button variant="ghost" size="icon" onClick={() => onView(student)} title="Voir la fiche">
                  <Eye className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onEdit(student)} title="Modifier l eleve">
                  <Pencil className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" onClick={() => onDelete(student.id)} title="Supprimer l eleve">
                  <Trash2 className="h-4 w-4 text-destructive" />
                </Button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </>
  );
}
