import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { supabase } from '@/integrations/supabase/client';
import type { Session, User } from '@supabase/supabase-js';
import type { Tables } from '@/integrations/supabase/types';

type Student = Tables<'students'>;
type Subject = Tables<'subjects'>;
type Grade = Tables<'grades'>;
type SchoolYear = Tables<'school_years'>;
type ClassRow = Tables<'classes'>;
type Profile = Tables<'profiles'>;

interface GlobalContextType {
  user: User | null;
  session: Session | null;
  profile: Profile | null;
  loading: boolean;
  students: Student[];
  subjects: Subject[];
  grades: Grade[];
  schoolYears: SchoolYear[];
  classes: ClassRow[];
  fetchStudents: (page?: number) => Promise<void>;
  fetchSubjects: () => Promise<void>;
  fetchGrades: (studentId?: string) => Promise<void>;
  fetchSchoolYears: () => Promise<void>;
  fetchClasses: () => Promise<void>;
  signOut: () => Promise<void>;
}

const GlobalContext = createContext<GlobalContextType | undefined>(undefined);

export function GlobalProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [students, setStudents] = useState<Student[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [grades, setGrades] = useState<Grade[]>([]);
  const [schoolYears, setSchoolYears] = useState<SchoolYear[]>([]);
  const [classes, setClasses] = useState<ClassRow[]>([]);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setLoading(false);
    });

    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (user) {
      supabase.from('profiles').select('*').eq('id', user.id).single().then(({ data }) => {
        if (data) setProfile(data);
      });
    } else {
      setProfile(null);
    }
  }, [user]);

  const fetchStudents = useCallback(async (page = 1) => {
    const limit = 50;
    const from = (page - 1) * limit;
    const to = from + limit - 1;
    const { data } = await supabase.from('students').select('*').range(from, to).order('last_name');
    if (data) setStudents(data);
  }, []);

  const fetchSubjects = useCallback(async () => {
    const { data } = await supabase.from('subjects').select('*').order('name');
    if (data) setSubjects(data);
  }, []);

  const fetchGrades = useCallback(async (studentId?: string) => {
    let query = supabase.from('grades').select('*').order('exam_date', { ascending: false }).limit(50);
    if (studentId) query = query.eq('student_id', studentId);
    const { data } = await query;
    if (data) setGrades(data);
  }, []);

  const fetchSchoolYears = useCallback(async () => {
    const { data } = await supabase.from('school_years').select('*').order('created_at', { ascending: false });
    if (data) setSchoolYears(data);
  }, []);

  const fetchClasses = useCallback(async () => {
    const { data } = await supabase.from('classes').select('*').order('name');
    if (data) setClasses(data);
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
  }, []);

  return (
    <GlobalContext.Provider value={{
      user, session, profile, loading,
      students, subjects, grades, schoolYears, classes,
      fetchStudents, fetchSubjects, fetchGrades, fetchSchoolYears, fetchClasses,
      signOut,
    }}>
      {children}
    </GlobalContext.Provider>
  );
}

export function useGlobal() {
  const ctx = useContext(GlobalContext);
  if (!ctx) throw new Error('useGlobal must be used within GlobalProvider');
  return ctx;
}
