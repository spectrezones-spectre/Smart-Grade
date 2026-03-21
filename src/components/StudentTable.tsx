import React from 'react';
import type { Tables } from '@/integrations/supabase/types';
import { Button } from '@/components/ui/button';
import { Eye, Trash2 } from 'lucide-react';

type Student = Tables<'students'>;

interface StudentTableProps {
  data: Student[];
  onView: (student: Student) => void;
  onDelete: (id: string) => void;
}

export function StudentTable({ data, onView, onDelete }: StudentTableProps) {
  if (data.length === 0) {
    return (
      <div className="bg-card shadow-card rounded-lg p-8 text-center text-muted-foreground">
        Aucun élève trouvé. Ajoutez votre premier élève.
      </div>
    );
  }

  return (
    <div className="overflow-hidden bg-card shadow-card rounded-lg">
      <table className="min-w-full">
        <thead>
          <tr className="bg-muted">
            <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Élève</th>
            <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Identifiant</th>
            <th className="px-6 py-3 text-right text-xs font-semibold text-muted-foreground uppercase tracking-wider">Actions</th>
          </tr>
        </thead>
        <tbody>
          {data.map((student, index) => (
            <tr key={student.id} className={`hover:bg-muted/50 ${index > 0 ? 'separator-shadow' : ''}`}>
              <td className="px-6 py-4 text-sm font-medium text-foreground">
                {student.first_name} {student.last_name}
              </td>
              <td className="px-6 py-4 text-sm text-muted-foreground">
                {student.identifier || '—'}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="flex items-center justify-end gap-1">
                  <Button variant="ghost" size="icon" onClick={() => onView(student)}>
                    <Eye className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" onClick={() => onDelete(student.id)}>
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
