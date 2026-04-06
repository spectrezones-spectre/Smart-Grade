import React, { useEffect, useMemo, useState } from 'react';
import { useGlobal } from '@/context/GlobalContext';
import { ChartCard } from '@/components/ChartCard';
import { Loader } from '@/components/Loader';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { cn } from '@/lib/utils';
import type { Tables } from '@/integrations/supabase/types';
import { BookOpen, ClipboardList, Filter, Info, Sparkles, TrendingUp, Users } from 'lucide-react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, XAxis, YAxis } from 'recharts';

type Student = Tables<'students'>;
type Subject = Tables<'subjects'>;
type Grade = Tables<'grades'>;
type ClassRow = Tables<'classes'>;
type SchoolYear = Tables<'school_years'>;
type PeriodFilter = 'all' | '30' | '90';
type GradeBucket = { label: string; min: number; max: number; count: number; studentCount: number; color: string; tone: string };

/**
 * Labels affiches dans le select de periode.
 * Ils pilotent uniquement la lecture des donnees deja chargees.
 */
const PERIOD_LABELS: Record<PeriodFilter, string> = {
  all: 'Toutes les donnees',
  '30': '30 derniers jours',
  '90': '90 derniers jours',
};

/**
 * Tranches homogenes utilisees pour la distribution des notes.
 * Le pas constant de 4 points evite les biais visuels.
 */
const BUCKETS = [
  { label: '0-4', min: 0, max: 4, color: 'hsl(0 84% 60%)', tone: 'A renforcer' },
  { label: '4-8', min: 4, max: 8, color: 'hsl(24 95% 53%)', tone: 'Fragile' },
  { label: '8-12', min: 8, max: 12, color: 'hsl(43 96% 56%)', tone: 'En progression' },
  { label: '12-16', min: 12, max: 16, color: 'hsl(var(--primary))', tone: 'Solide' },
  { label: '16-20', min: 16, max: 20, color: 'hsl(var(--success))', tone: 'Excellent' },
] as const;

/**
 * Formate une date brute issue de Supabase pour l'affichage du dashboard.
 */
const formatDate = (value: string | null) => {
  if (!value) return 'Date non renseignee';
  const parsed = new Date(value);
  return Number.isNaN(parsed.getTime())
    ? 'Date non renseignee'
    : new Intl.DateTimeFormat('fr-FR', { day: '2-digit', month: 'short', year: 'numeric' }).format(parsed);
};

/**
 * Associe un message de lecture rapide a une moyenne sur 20.
 */
const getPerformanceText = (average: number) => {
  if (average >= 16) return 'Niveau d excellence';
  if (average >= 12) return 'Bon equilibre global';
  if (average >= 10) return 'Base correcte a consolider';
  if (average > 0) return 'Zone de vigilance';
  return 'Aucune donnee exploitable';
};

/**
 * Dashboard connecte au contexte global.
 */
const Dashboard = () => {
  const {
    loading,
    students,
    subjects,
    grades,
    classes,
    schoolYears,
    fetchStudents,
    fetchSubjects,
    fetchGrades,
    fetchClasses,
    fetchSchoolYears,
  } = useGlobal();

  const [bootstrapping, setBootstrapping] = useState(true);
  const [classFilter, setClassFilter] = useState('all');
  const [subjectFilter, setSubjectFilter] = useState('all');
  const [periodFilter, setPeriodFilter] = useState<PeriodFilter>('all');
  const [activeBucketLabel, setActiveBucketLabel] = useState<string | null>(null);

  useEffect(() => {
    let mounted = true;

    // Charge toutes les ressources necessaires au dashboard en une seule passe.
    Promise.all([fetchStudents(), fetchSubjects(), fetchGrades(), fetchClasses(), fetchSchoolYears()]).finally(() => {
      if (mounted) setBootstrapping(false);
    });
    return () => {
      mounted = false;
    };
  }, [fetchStudents, fetchSubjects, fetchGrades, fetchClasses, fetchSchoolYears]);

  const studentMap = useMemo(() => new Map<string, Student>(students.map((item) => [item.id, item])), [students]);
  const subjectMap = useMemo(() => new Map<string, Subject>(subjects.map((item) => [item.id, item])), [subjects]);
  const classMap = useMemo(() => new Map<string, ClassRow>(classes.map((item) => [item.id, item])), [classes]);
  const activeSchoolYear = useMemo<SchoolYear | null>(() => schoolYears.find((item) => item.is_active) ?? schoolYears[0] ?? null, [schoolYears]);

  // On normalise les filtres "all" en `null` pour simplifier les libelles et les calculs plus bas.
  const selectedClass = classFilter === 'all' ? null : classMap.get(classFilter) ?? null;
  const selectedSubject = subjectFilter === 'all' ? null : subjectMap.get(subjectFilter) ?? null;

  /**
   * Notes visibles apres application des filtres de classe, matiere et periode.
   * Le typage explicite permet d'utiliser concretement l'alias Grade.
   */
  const filteredGrades = useMemo<Grade[]>(() => {
    const now = Date.now();
    const periodDays = periodFilter === 'all' ? null : Number(periodFilter);

    return grades.filter((grade) => {
      const student = studentMap.get(grade.student_id);
      if (!student) return false;
      if (classFilter !== 'all' && student.class_id !== classFilter) return false;
      if (subjectFilter !== 'all' && grade.subject_id !== subjectFilter) return false;
      if (periodDays !== null) {
        const timestamp = new Date(grade.exam_date ?? grade.created_at).getTime();
        if (Number.isNaN(timestamp) || now - timestamp > periodDays * 86400000) return false;
      }
      return true;
    });
  }, [grades, studentMap, classFilter, subjectFilter, periodFilter]);

  const filteredStudents = useMemo(() => {
    // On limite d'abord la population par classe, puis on la croise avec les notes visibles si besoin.
    const pool = classFilter === 'all' ? students : students.filter((item) => item.class_id === classFilter);
    if (subjectFilter === 'all' && periodFilter === 'all') return pool;
    // Quand un filtre de matiere ou de periode est actif, on ne conserve que les eleves qui ont au moins une note visible.
    const ids = new Set(filteredGrades.map((item) => item.student_id));
    return pool.filter((item) => ids.has(item.id));
  }, [students, classFilter, subjectFilter, periodFilter, filteredGrades]);

  const averageValue = useMemo(() => {
    if (filteredGrades.length === 0) return 0;
    const total = filteredGrades.reduce((sum, item) => sum + Number(item.value), 0);
    return Number((total / filteredGrades.length).toFixed(1));
  }, [filteredGrades]);

  /**
   * Distribution des notes par tranches homogenes.
   * Chaque segment conserve le nombre de notes et le nombre d'eleves concernes.
   */
  const gradeDistribution = useMemo<GradeBucket[]>(() => BUCKETS.map((bucket, index) => {
    const bucketGrades: Grade[] = filteredGrades.filter((grade) => {
      const value = Number(grade.value);
      return index === BUCKETS.length - 1 ? value >= bucket.min && value <= bucket.max : value >= bucket.min && value < bucket.max;
    });
    return { ...bucket, count: bucketGrades.length, studentCount: new Set(bucketGrades.map((item) => item.student_id)).size };
  }), [filteredGrades]);

  useEffect(() => {
    // Si la tranche active devient vide apres un filtre, on se repositionne sur une tranche utile.
    const current = gradeDistribution.find((item) => item.label === activeBucketLabel);
    if (current && current.count > 0) return;
    setActiveBucketLabel(gradeDistribution.find((item) => item.count > 0)?.label ?? gradeDistribution[0]?.label ?? null);
  }, [gradeDistribution, activeBucketLabel]);

  // La tranche active sert de point d'entree au panneau detaille; on la resout depuis son libelle.
  const activeBucket = useMemo(() => gradeDistribution.find((item) => item.label === activeBucketLabel) ?? null, [gradeDistribution, activeBucketLabel]);

  const activeBucketStudents = useMemo(() => {
    if (!activeBucket) return [];

    // Notes incluses dans la tranche actuellement selectionnee.
    const bucketGrades: Grade[] = filteredGrades.filter((grade) => {
      const value = Number(grade.value);
      return activeBucket.label === '16-20' ? value >= activeBucket.min && value <= activeBucket.max : value >= activeBucket.min && value < activeBucket.max;
    });
    const grouped = new Map<string, { id: string; name: string; className: string; gradeCount: number; average: number }>();

    bucketGrades.forEach((grade) => {
      const student = studentMap.get(grade.student_id);
      if (!student) return;
      // La moyenne est calculee sur l'ensemble des notes visibles de l'eleve, pas seulement sur la tranche en cours.
      const studentGrades = filteredGrades.filter((item) => item.student_id === student.id);
      const average = studentGrades.length === 0 ? 0 : Number((studentGrades.reduce((sum, item) => sum + Number(item.value), 0) / studentGrades.length).toFixed(1));
      const current = grouped.get(student.id);
      if (current) {
        current.gradeCount += 1;
        return;
      }
      grouped.set(student.id, {
        id: student.id,
        name: `${student.first_name} ${student.last_name}`,
        className: student.class_id ? classMap.get(student.class_id)?.name ?? 'Classe non assignee' : 'Classe non assignee',
        gradeCount: 1,
        average,
      });
    });

    return Array.from(grouped.values()).sort((a, b) => b.average - a.average || a.name.localeCompare(b.name));
  }, [activeBucket, filteredGrades, studentMap, classMap]);

  const subjectPerformance = useMemo(() => {
    // Agrégation par matiere pour produire une lecture simple par discipline.
    const grouped = new Map<string, { id: string; name: string; average: number; gradeCount: number }>();
    filteredGrades.forEach((grade) => {
      const subject = subjectMap.get(grade.subject_id);
      if (!subject) return;
      const current = grouped.get(subject.id);
      if (current) {
        current.average += Number(grade.value);
        current.gradeCount += 1;
        return;
      }
      grouped.set(subject.id, { id: subject.id, name: subject.name, average: Number(grade.value), gradeCount: 1 });
    });
    return Array.from(grouped.values())
      .map((item) => ({ ...item, average: Number((item.average / item.gradeCount).toFixed(1)) }))
      .sort((a, b) => b.average - a.average || b.gradeCount - a.gradeCount);
  }, [filteredGrades, subjectMap]);

  const latestGradeDate = useMemo(() => {
    if (filteredGrades.length === 0) return null;

    // La date la plus recente est affichee comme repere contextuel dans le dashboard.
    return [...filteredGrades]
      .sort((a, b) => new Date(b.exam_date ?? b.created_at).getTime() - new Date(a.exam_date ?? a.created_at).getTime())[0]?.exam_date
      ?? [...filteredGrades].sort((a, b) => new Date(b.exam_date ?? b.created_at).getTime() - new Date(a.exam_date ?? a.created_at).getTime())[0]?.created_at
      ?? null;
  }, [filteredGrades]);

  const summaryText = [
    selectedClass ? `Classe ${selectedClass.name}` : 'Toutes les classes',
    selectedSubject ? selectedSubject.name : 'Toutes les matieres',
    PERIOD_LABELS[periodFilter],
  ].join(' | ');

  const visibleSubjectCount = subjectFilter !== 'all'
    ? (selectedSubject ? 1 : 0)
    : new Set(filteredGrades.map((item) => item.subject_id)).size;

  const stats = [
    { label: 'Eleves suivis', value: filteredStudents.length, helper: classFilter === 'all' ? 'Nombre d\'eleves suivis' : `Classe ${selectedClass?.name ?? 'selectionnee'}`, icon: Users },
    { label: 'Matieres visibles', value: visibleSubjectCount, helper: subjectFilter === 'all' ? 'Matieres couvertes par les notes analysees' : 'Matiere actuellement selectionnee', icon: BookOpen },
    { label: 'Notes analysees', value: filteredGrades.length, helper: latestGradeDate ? `Derniere note le ${formatDate(latestGradeDate)}` : 'Aucune note actuellement', icon: ClipboardList },
    { label: 'Moyenne generale', value: filteredGrades.length > 0 ? `${averageValue.toFixed(1)}/20` : '-', helper: 'Moyenne globale des notes', icon: TrendingUp },
  ];

  // On garde le loader tant que toutes les ressources du dashboard ne sont pas hydratees.
  if (loading || bootstrapping) return <Loader />;
  return (
    <div className="space-y-6">
      <section className="rounded-2xl bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center gap-2">
              {activeSchoolYear ? <Badge variant="outline" className="rounded-full px-3 py-1">Annee : {activeSchoolYear.name}</Badge> : null}
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground sm:text-3xl">Tableau de bord</h1>
              <p className="mt-2 max-w-3xl text-sm leading-6 text-muted-foreground">Lecture consolidee des resultats par classe, matiere et periode.</p>
            </div>
          </div>

        </div>
      </section>

      <section className="rounded-2xl bg-card p-5 shadow-card sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <p className="text-sm font-semibold text-foreground">Filtres d'analyse</p>
          </div>
        </div>
        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Classe</label>
            <Select value={classFilter} onValueChange={setClassFilter}>
              <SelectTrigger><SelectValue placeholder="Toutes les classes" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les classes</SelectItem>
                {classes.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Matiere</label>
            <Select value={subjectFilter} onValueChange={setSubjectFilter}>
              <SelectTrigger><SelectValue placeholder="Toutes les matieres" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les matieres</SelectItem>
                {subjects.map((item) => <SelectItem key={item.id} value={item.id}>{item.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground">Periode</label>
            <Select value={periodFilter} onValueChange={(value) => setPeriodFilter(value as PeriodFilter)}>
              <SelectTrigger><SelectValue placeholder="Toutes les donnees" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les donnees</SelectItem>
                <SelectItem value="30">30 derniers jours</SelectItem>
                <SelectItem value="90">90 derniers jours</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map(({ label, value, helper, icon: Icon }) => (
          <div key={label} className="rounded-2xl bg-card p-4 shadow-card sm:p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
                  {label === 'Moyenne generale' ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <button type="button" className="inline-flex h-5 w-5 items-center justify-center rounded-full text-muted-foreground hover:bg-accent hover:text-foreground" aria-label="Comprendre la moyenne">
                          <Info className="h-3.5 w-3.5" />
                        </button>
                      </TooltipTrigger>
                      <TooltipContent className="max-w-xs text-sm leading-5">Cette valeur represente la moyenne globale des notes apres filtrage.</TooltipContent>
                    </Tooltip>
                  ) : null}
                </div>
                <p className="mt-3 text-3xl font-bold text-foreground tabular-nums">{value}</p>
              </div>
              <div className="rounded-xl bg-primary/10 p-3 text-primary"><Icon className="h-5 w-5" /></div>
            </div>
            <p className="mt-4 text-sm leading-6 text-muted-foreground">{helper}</p>
            {label === 'Moyenne generale' ? (
              <div className="mt-4 space-y-3">
                <Progress value={Math.round((averageValue / 20) * 100)} />
                <div className="flex items-center justify-between text-xs text-muted-foreground"><span>0</span><span>{getPerformanceText(averageValue)}</span><span>20</span></div>
              </div>
            ) : null}
          </div>
        ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.8fr)_minmax(320px,1fr)]">
        <ChartCard title="Distribution des notes" description="">
          {filteredGrades.length > 0 ? (
            <div className="space-y-6">
              <div className="rounded-2xl border border-border bg-muted/30 p-4 sm:p-5">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="text-sm font-medium text-foreground">Moyenne du perimetre</p>
                    <p className="mt-1 text-sm text-muted-foreground">{averageValue.toFixed(1)}/20 sur {filteredGrades.length} note{filteredGrades.length > 1 ? 's' : ''}.</p>
                  </div>
                  <Badge variant="outline" className="w-fit rounded-full px-3 py-1 text-foreground">{getPerformanceText(averageValue)}</Badge>
                </div>
                <div className="mt-4">
                  <div className="relative h-3 overflow-visible rounded-full bg-[linear-gradient(90deg,hsl(0_84%_60%)_0%,hsl(24_95%_53%)_25%,hsl(43_96%_56%)_50%,hsl(var(--primary))_75%,hsl(var(--success))_100%)]">
                    <span className="absolute left-0 top-1/2 block h-5 w-5 -translate-y-1/2 -translate-x-1/2 rounded-full border-2 border-card bg-foreground shadow-md" style={{ left: `${Math.min(Math.max((averageValue / 20) * 100, 0), 100)}%` }} />
                  </div>
                  <div className="mt-1 flex items-center justify-between text-xs text-muted-foreground"><span>0</span><span>Repere visuel de la moyenne</span><span>20</span></div>
                </div>
              </div>

              <ResponsiveContainer width="100%" height={320}>
                <BarChart data={gradeDistribution} barCategoryGap={24}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
                  <XAxis dataKey="label" tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <YAxis allowDecimals={false} tick={{ fontSize: 13, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <RechartsTooltip
                    cursor={{ fill: 'hsl(var(--muted) / 0.45)' }}
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const bucket = payload[0].payload as GradeBucket;
                      return (
                        <div className="rounded-xl border border-border bg-card p-3 text-sm shadow-elevated">
                          <p className="font-semibold text-foreground">Tranche {bucket.label}</p>
                          <p className="mt-1 text-muted-foreground">{bucket.count} note{bucket.count > 1 ? 's' : ''} | {bucket.studentCount} eleve{bucket.studentCount > 1 ? 's' : ''}</p>
                          <p className="mt-1 text-muted-foreground">{bucket.tone}</p>
                        </div>
                      );
                    }}
                  />
                  <Bar dataKey="count" radius={[10, 10, 0, 0]} onClick={(_, index) => setActiveBucketLabel(gradeDistribution[index]?.label ?? null)}>
                    {gradeDistribution.map((bucket) => <Cell key={bucket.label} cursor="pointer" fill={bucket.color} fillOpacity={bucket.label === activeBucketLabel ? 1 : 0.82} stroke={bucket.label === activeBucketLabel ? 'hsl(var(--foreground))' : bucket.color} strokeWidth={bucket.label === activeBucketLabel ? 1.5 : 0} />)}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>

              <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 xl:grid-cols-5">
                {gradeDistribution.map((bucket) => (
                  <button key={bucket.label} type="button" onClick={() => setActiveBucketLabel(bucket.label)} className={cn('rounded-xl border p-3 text-left transition-all sm:p-4', bucket.label === activeBucketLabel ? 'border-foreground/20 bg-accent shadow-sm' : 'border-border bg-background hover:bg-accent/60')}>
                    <div className="flex items-center justify-between gap-3"><span className="text-sm font-semibold text-foreground">{bucket.label}</span><span className="h-3 w-3 rounded-full" style={{ backgroundColor: bucket.color }} aria-hidden="true" /></div>
                    <p className="mt-2 text-xl font-bold text-foreground tabular-nums sm:text-2xl">{bucket.count}</p>
                    <p className="mt-1 text-xs text-muted-foreground sm:text-sm">{bucket.tone}</p>
                  </button>
                ))}
              </div>
            </div>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">Aucune note ne correspond au perimetre choisi.</p>}
        </ChartCard>

        <ChartCard title="Segment selectionne" description={activeBucket ? `Eleves associes a la tranche ${activeBucket.label}.` : 'Selectionnez une tranche pour afficher le detail.'}>
          {activeBucket && activeBucketStudents.length > 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-border bg-muted/30 p-3 sm:p-4">
                <div className="flex items-center justify-between gap-3">
                  <div><p className="text-sm font-semibold text-foreground">{activeBucket.label}</p><p className="mt-1 text-sm text-muted-foreground">{activeBucket.tone}</p></div>
                  <Badge variant="secondary" className="rounded-full px-3 py-1">{activeBucket.studentCount} eleve{activeBucket.studentCount > 1 ? 's' : ''}</Badge>
                </div>
              </div>
              <div className="space-y-3">
                {activeBucketStudents.slice(0, 6).map((student) => (
                  <div key={student.id} className="rounded-xl border border-border bg-background p-3 sm:p-4">
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                      <div><p className="font-medium text-foreground">{student.name}</p><p className="mt-1 text-sm text-muted-foreground">{student.className}</p></div>
                      <div className="text-left sm:text-right"><p className="text-base font-semibold text-foreground sm:text-lg">{student.average.toFixed(1)}/20</p><p className="text-xs text-muted-foreground">{student.gradeCount} note{student.gradeCount > 1 ? 's' : ''} dans la tranche</p></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">Aucun eleve ne correspond a cette tranche.</p>}
        </ChartCard>
      </section>

      <section>
        <ChartCard title="Performance par matiere" description="">
          {subjectPerformance.length > 0 ? (
            <div className="space-y-4">
              {subjectPerformance.slice(0, 6).map((item) => (
                <div key={item.id} className="rounded-xl border border-border bg-background p-3 sm:p-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div><p className="font-medium text-foreground">{item.name}</p><p className="mt-1 text-sm text-muted-foreground">{item.gradeCount} note{item.gradeCount > 1 ? 's' : ''}</p></div>
                    <div className="text-left sm:text-right"><p className="text-base font-semibold text-foreground sm:text-lg">{item.average.toFixed(1)}/20</p><p className="text-xs text-muted-foreground">{getPerformanceText(item.average)}</p></div>
                  </div>
                  <div className="mt-4"><Progress value={Math.round((item.average / 20) * 100)} /></div>
                </div>
              ))}
            </div>
          ) : <p className="py-8 text-center text-sm text-muted-foreground">Les matieres apparaitront ici des qu'une note sera disponible.</p>}
        </ChartCard>
      </section>
    </div>
  );
};

export default Dashboard;
