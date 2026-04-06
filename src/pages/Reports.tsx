import React, { useEffect } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { FileText } from 'lucide-react';

/**
 * Page des bulletins.
 * Elle prépare l'affichage de la liste d'élèves en attendant la génération PDF.
 */
const Reports = () => {
  const { students, fetchStudents } = useGlobal();

  useEffect(() => {
    // Les bulletins s'appuient d'abord sur la liste courante des élèves.
    fetchStudents();
  }, [fetchStudents]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Bulletins</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Préparez des <strong className="text-foreground">bulletins PDF</strong> pour vos élèves.
        </p>
      </div>

      <div className="bg-card shadow-card rounded-lg p-8 text-center">
        <FileText className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <h2 className="text-lg font-semibold text-foreground mb-2">Génération de bulletins</h2>
        <p className="text-sm text-muted-foreground max-w-md mx-auto mb-4">
          La génération de bulletins PDF sera disponible prochainement.
          En attendant, vous pouvez déjà <strong className="text-foreground">préparer votre liste d’élèves</strong>.
        </p>
        {students.length > 0 ? (
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3 max-w-2xl mx-auto mt-6">
            {students.map((student) => (
              <div key={student.id} className="bg-muted rounded-md p-3 text-sm text-foreground">
                {student.first_name} {student.last_name}
              </div>
            ))}
          </div>
        ) : (
          // État de secours utile quand aucun élève n'a encore été créé.
          <p className="text-sm text-muted-foreground">
            Ajoutez des élèves pour pouvoir générer des bulletins.
          </p>
        )}
      </div>
    </div>
  );
};

export default Reports;
