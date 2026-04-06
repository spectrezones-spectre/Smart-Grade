import React, { useEffect, useMemo, useState } from 'react';
import { FileText } from 'lucide-react';
import { Loader } from '@/components/Loader';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useGlobal } from '@/context/GlobalContext';

/**
 * Page de preparation des bulletins.
 * Elle exploite eleves, classes, notes et annees scolaires pour donner un apercu exploitable.
 */
const Reports = () => {
  const {
    students,
    grades,
    classes,
    schoolYears,
    fetchStudents,
    fetchGrades,
    fetchClasses,
    fetchSchoolYears,
  } = useGlobal();

  const [pageLoading, setPageLoading] = useState(true);
  const [selectedSchoolYearId, setSelectedSchoolYearId] = useState('all');

  useEffect(() => {
    let mounted = true;

    Promise.all([fetchStudents(), fetchGrades(), fetchClasses(), fetchSchoolYears()]).finally(() => {
      if (mounted) {
        setPageLoading(false);
      }
    });

    return () => {
      mounted = false;
    };
  }, [fetchStudents, fetchGrades, fetchClasses, fetchSchoolYears]);

  const activeSchoolYear = useMemo(
    () => schoolYears.find((schoolYear) => schoolYear.is_active) ?? schoolYears[0] ?? null,
    [schoolYears],
  );

  const reportRows = useMemo(() => {
    return students
      .map((student) => {
        const classItem = classes.find((item) => item.id === student.class_id);
        const studentGrades = grades.filter((grade) => {
          if (grade.student_id !== student.id) {
            return false;
          }

          if (selectedSchoolYearId !== 'all' && grade.school_year_id !== selectedSchoolYearId) {
            return false;
          }

          return true;
        });

        const average = studentGrades.length > 0
          ? Number((studentGrades.reduce((sum, grade) => sum + Number(grade.value), 0) / studentGrades.length).toFixed(2))
          : null;

        return {
          id: student.id,
          fullName: `${student.first_name} ${student.last_name}`,
          className: classItem?.name ?? 'Non assignee',
          gradeCount: studentGrades.length,
          average,
        };
      })
      .filter((row) => row.gradeCount > 0 || selectedSchoolYearId === 'all')
      .sort((a, b) => (b.average ?? -1) - (a.average ?? -1) || a.fullName.localeCompare(b.fullName));
  }, [students, classes, grades, selectedSchoolYearId]);

  if (pageLoading) {
    return <Loader />;
  }

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Bulletins</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Preparez les bulletins a partir des notes disponibles, des classes et de l annee scolaire selectionnee.
          </p>
        </div>

        <div className="w-full max-w-xs space-y-2">
          <span className="text-sm font-medium text-foreground">Annee scolaire</span>
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
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Eleves</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{reportRows.length}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Classes</p>
          <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{classes.length}</p>
        </div>
        <div className="rounded-xl bg-card p-4 shadow-card sm:col-span-2">
          <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Contexte</p>
          <p className="mt-2 text-sm text-foreground">
            {selectedSchoolYearId === 'all' ? `Annee active: ${activeSchoolYear?.name ?? 'Aucune'}` : `Filtre: ${schoolYears.find((schoolYear) => schoolYear.id === selectedSchoolYearId)?.name ?? 'Inconnue'}`}
          </p>
        </div>
      </section>

      <section className="rounded-xl bg-card p-5 shadow-card">
        <div className="mb-4 flex items-center gap-3">
          <FileText className="h-5 w-5 text-primary" />
          <div>
            <h2 className="font-semibold text-foreground">Preparation des bulletins</h2>
            <p className="text-sm text-muted-foreground">La generation PDF pourra s appuyer sur cette base de synthese.</p>
          </div>
        </div>

        {reportRows.length > 0 ? (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {reportRows.map((row) => (
              <div key={row.id} className="rounded-xl border border-border p-4">
                <p className="font-medium text-foreground">{row.fullName}</p>
                <p className="mt-1 text-sm text-muted-foreground">{row.className}</p>
                <div className="mt-4 flex items-end justify-between gap-3">
                  <div>
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Notes</p>
                    <p className="text-lg font-semibold text-foreground">{row.gradeCount}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs uppercase tracking-wider text-muted-foreground">Moyenne</p>
                    <p className="text-lg font-semibold text-foreground">
                      {row.average !== null ? `${row.average.toFixed(2)}/20` : '-'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Aucune donnee exploitable pour ce filtre.</p>
        )}
      </section>
    </div>
  );
};

export default Reports;
