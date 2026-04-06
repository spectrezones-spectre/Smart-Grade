import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Loader } from '@/components/Loader';
import { Progress } from '@/components/ui/progress';
import { useGlobal } from '@/context/GlobalContext';
import { supabase } from '@/integrations/supabase/client';
import type { Tables } from '@/integrations/supabase/types';

type Student = Tables<'students'>;
type Grade = Tables<'grades'>;

/**
 * Detail d un eleve.
 * Cette page affiche les informations d identite, la classe et l historique des notes.
 */
const StudentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { subjects, classes, fetchSubjects, fetchClasses } = useGlobal();

  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([fetchSubjects(), fetchClasses()]).catch(() => undefined);
  }, [fetchSubjects, fetchClasses]);

  useEffect(() => {
    if (!id) return;

    let mounted = true;

    /**
     * Charge la fiche eleve et son historique de notes en parallele.
     */
    Promise.all([
      supabase.from('students').select('*').eq('id', id).single(),
      supabase.from('grades').select('*').eq('student_id', id).order('exam_date', { ascending: false }),
    ]).then(([studentResponse, gradesResponse]) => {
      if (!mounted) return;
      if (studentResponse.data) setStudent(studentResponse.data);
      if (gradesResponse.data) setGrades(gradesResponse.data);
      setLoading(false);
    });

    return () => {
      mounted = false;
    };
  }, [id]);

  const className = useMemo(
    () => classes.find((classItem) => classItem.id === student?.class_id)?.name ?? 'Classe non assignee',
    [classes, student?.class_id],
  );

  const averageValue = useMemo(() => {
    if (grades.length === 0) return 0;
    return Number((grades.reduce((sum, grade) => sum + Number(grade.value), 0) / grades.length).toFixed(2));
  }, [grades]);

  const getSubjectName = (subjectId: string) => subjects.find((subject) => subject.id === subjectId)?.name ?? '-';

  if (loading) {
    return <Loader />;
  }

  if (!student) {
    return (
      <div className="space-y-4 rounded-lg bg-card p-8 text-center shadow-card">
        <p className="text-lg font-semibold text-foreground">Eleve introuvable.</p>
        <p className="text-sm text-muted-foreground">La fiche demandee n existe pas ou a deja ete supprimee.</p>
        <Button onClick={() => navigate('/students')}>Retour a la liste des eleves</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 sm:flex-row sm:items-center">
        <Button variant="ghost" size="icon" onClick={() => navigate('/students')} title="Retour a la liste">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{student.first_name} {student.last_name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {student.identifier ? `Identifiant: ${student.identifier}` : 'Aucun identifiant renseigne'} | {className}
          </p>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl bg-card p-4 shadow-card sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Moyenne generale</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">
            {grades.length > 0 ? `${averageValue.toFixed(2)}/20` : '-'}
          </p>
          <div className="mt-4 space-y-2">
            <Progress value={Math.round((averageValue / 20) * 100)} />
            <p className="text-xs text-muted-foreground">Lecture normalisee sur 20 pour suivre la progression de l eleve.</p>
          </div>
        </div>

        <div className="rounded-xl bg-card p-4 shadow-card sm:p-5">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Nombre de notes</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{grades.length}</p>
          <p className="mt-4 text-xs text-muted-foreground">Plus l historique est complet, plus l analyse est representative.</p>
        </div>
      </section>

      <section className="space-y-3">
        {grades.length > 0 ? (
          <>
            <div className="hidden overflow-hidden rounded-lg bg-card shadow-card md:block">
              <table className="min-w-full">
                <thead>
                  <tr className="bg-muted">
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Matiere</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Note</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-muted-foreground">Commentaire</th>
                  </tr>
                </thead>
                <tbody>
                  {grades.map((grade, index) => (
                    <tr key={grade.id} className={`hover:bg-muted/50 ${index > 0 ? 'separator-shadow' : ''}`}>
                      <td className="px-6 py-4 text-sm text-foreground">{getSubjectName(grade.subject_id)}</td>
                      <td className="px-6 py-4 text-sm font-semibold tabular-nums text-foreground">{Number(grade.value).toFixed(1)}/20</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{grade.exam_date || '-'}</td>
                      <td className="px-6 py-4 text-sm text-muted-foreground">{grade.comment || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="grid gap-3 md:hidden">
              {grades.map((grade) => (
                <div key={grade.id} className="rounded-xl bg-card p-4 shadow-card">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-foreground">{getSubjectName(grade.subject_id)}</p>
                      <p className="mt-1 text-sm text-muted-foreground">{grade.exam_date || '-'}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{grade.comment || 'Aucun commentaire'}</p>
                    </div>
                    <p className="text-lg font-semibold tabular-nums text-foreground">{Number(grade.value).toFixed(1)}/20</p>
                  </div>
                </div>
              ))}
            </div>
          </>
        ) : (
          <div className="rounded-lg bg-card p-8 text-center text-muted-foreground shadow-card">
            Aucune note pour le moment. Ajoutez-en depuis l onglet Notes pour suivre cette fiche.
          </div>
        )}
      </section>
    </div>
  );
};

export default StudentDetails;
