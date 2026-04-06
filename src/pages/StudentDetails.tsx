import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useGlobal } from '@/context/GlobalContext';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Loader } from '@/components/Loader';
import { ArrowLeft } from 'lucide-react';
import type { Tables } from '@/integrations/supabase/types';

type Student = Tables<'students'>;
type Grade = Tables<'grades'>;

const StudentDetails = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { subjects, fetchSubjects } = useGlobal();
  const [student, setStudent] = useState<Student | null>(null);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Les matières servent à afficher le nom lisible associé à chaque note.
    fetchSubjects();
  }, [fetchSubjects]);

  useEffect(() => {
    if (!id) return;
    const load = async () => {
      // Les deux requêtes sont indépendantes, donc on les charge en parallèle.
      const [studentRes, gradesRes] = await Promise.all([
        supabase.from('students').select('*').eq('id', id).single(),
        supabase.from('grades').select('*').eq('student_id', id).order('exam_date', { ascending: false }),
      ]);
      if (studentRes.data) setStudent(studentRes.data);
      if (gradesRes.data) setGrades(gradesRes.data);
      setLoading(false);
    };
    load();
  }, [id]);

  if (loading) return <Loader />;
  if (!student) {
    return (
      <div className="bg-card shadow-card rounded-lg p-8 text-center space-y-4">
        <p className="text-lg font-semibold text-foreground">Élève introuvable. 🔎</p>
        <p className="text-sm text-muted-foreground">La fiche demandée n’existe pas ou a été supprimée.</p>
        <Button onClick={() => navigate('/students')}>Retour à la liste des élèves</Button>
      </div>
    );
  }

  const getSubjectName = (sid: string) => subjects.find(s => s.id === sid)?.name || '—';
  // La moyenne est calculée sur 20, puis normalisée pour alimenter la barre de progression.
  const avgValue = grades.length > 0
    ? Number((grades.reduce((s, g) => s + Number(g.value), 0) / grades.length).toFixed(2))
    : 0;
  const avg = grades.length > 0 ? avgValue.toFixed(2) : '—';
  const progressValue = grades.length > 0 ? Math.round((avgValue / 20) * 100) : 0;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/students')} title="Retour à la liste">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold text-foreground">{student.first_name} {student.last_name}</h1>
          <p className="text-sm text-muted-foreground">
            {student.identifier ? `Identifiant : ${student.identifier}` : "Aucun identifiant renseigné"}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="bg-card shadow-card rounded-lg p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Moyenne générale</p>
          <p className="text-3xl font-bold text-foreground tabular-nums mt-1">{avg}</p>
          <div className="mt-4 space-y-2">
            <Progress value={progressValue} />
            <p className="text-xs text-muted-foreground">
              Score moyen calculé sur 20. <strong className="text-foreground">100%</strong> correspond à 20/20.
            </p>
          </div>
        </div>
        <div className="bg-card shadow-card rounded-lg p-5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Nombre de notes</p>
          <p className="text-3xl font-bold text-foreground tabular-nums mt-1">{grades.length}</p>
          <p className="mt-4 text-xs text-muted-foreground">
            Plus la liste est complète, plus le suivi de progression est fiable.
          </p>
        </div>
      </div>

      <div className="bg-card shadow-card rounded-lg overflow-hidden">
        <table className="min-w-full">
          <thead>
            <tr className="bg-muted">
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Matière</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Note</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Date</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-muted-foreground uppercase tracking-wider">Commentaire</th>
            </tr>
          </thead>
          <tbody>
            {grades.map((grade, i) => (
              <tr key={grade.id} className={`hover:bg-muted/50 ${i > 0 ? 'separator-shadow' : ''}`}>
                <td className="px-6 py-4 text-sm text-foreground">{getSubjectName(grade.subject_id)}</td>
                <td className="px-6 py-4 text-sm font-semibold text-foreground tabular-nums">{Number(grade.value).toFixed(1)}/20</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{grade.exam_date || '—'}</td>
                <td className="px-6 py-4 text-sm text-muted-foreground">{grade.comment || '—'}</td>
              </tr>
            ))}
            {grades.length === 0 && (
              <tr>
                <td colSpan={4} className="px-6 py-8 text-center text-sm text-muted-foreground">
                  Aucune note pour le moment. Ajoutez-en une depuis l’onglet <strong className="text-foreground">Notes</strong> pour suivre cette fiche.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default StudentDetails;
