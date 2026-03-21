-- =====================================================
-- CREATE updated_at trigger function (FONCTION UNIVERSELLE)
-- =====================================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
-- Crée/remplace fonction qui met à jour updated_at automatiquement
RETURNS TRIGGER AS $$ 
-- Retourne un "trigger" (déclencheur)
BEGIN
  NEW.updated_at = now();  -- NEW = nouvelle ligne, now() = timestamp actuel UTC
  RETURN NEW;              -- Renvoie la ligne modifiée
END;
$$ LANGUAGE plpgsql SET search_path = public;
-- Langage PL/pgSQL, cherche dans schema "public"

-- =====================================================
-- PROFILES TABLE (1:1 avec auth.users Supabase)
-- =====================================================
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  -- id = même UUID que auth.users, supprimé si user supprimé
  full_name TEXT NOT NULL DEFAULT '',
  -- Nom complet, obligatoire, vide par défaut
  email TEXT,
  -- Email (optionnel, déjà dans auth.users)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  -- Créé maintenant en UTC
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  -- Modifié maintenant en UTC
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- Active RLS = sécurité par ligne (personne ne voit rien sans politique)

-- Politiques RLS pour profiles
CREATE POLICY "Users can view own profile" ON public.profiles 
FOR SELECT USING (auth.uid() = id);
-- SELECT OK si auth.uid() (user connecté) = id du profile

CREATE POLICY "Users can update own profile" ON public.profiles 
FOR UPDATE USING (auth.uid() = id);
-- UPDATE OK si c'est SON profile

CREATE POLICY "Users can insert own profile" ON public.profiles 
FOR INSERT WITH CHECK (auth.uid() = id);
-- INSERT OK si id = auth.uid()

-- Trigger pour auto-update updated_at sur profiles
CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
-- À CHAQUE UPDATE → updated_at = now()

-- =====================================================
-- AUTO-CREATE PROFILE ON SIGNUP (MAGIE AUTOMATIQUE)
-- =====================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email)
  -- Crée profile automatiquement
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', ''), NEW.email);
  -- NEW.id = UUID user, full_name du metadata ou vide, email user
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;
-- SECURITY DEFINER = exécuté avec droits owner

CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
-- À CHAQUE NOUVEAU USER → profile auto-créé !

-- =====================================================
-- SCHOOL YEARS (Années scolaires par prof)
-- =====================================================
CREATE TABLE public.school_years (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- UUID auto-généré
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  -- Prof propriétaire, supprimé si prof supprimé
  name TEXT NOT NULL,        -- "2025-2026"
  start_date DATE,           -- 2025-09-01
  end_date DATE,             -- 2026-06-30
  is_active BOOLEAN DEFAULT true,
  -- Année active/courante
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.school_years ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own school years" ON public.school_years 
FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);
-- Prof NE voit QUE SES années scolaires (SELECT/INSERT/UPDATE/DELETE)

-- =====================================================
-- CLASSES (par prof, liée à année scolaire)
-- =====================================================
CREATE TABLE public.classes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_year_id UUID REFERENCES public.school_years(id) ON DELETE SET NULL,
  -- Si année supprimée → classe reste (NULL)
  name TEXT NOT NULL,     -- "6ème A"
  level TEXT,             -- "Collège", "Lycée"
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own classes" ON public.classes 
FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- =====================================================
-- SUBJECTS (Matières par prof)
-- =====================================================
CREATE TABLE public.subjects (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,              -- "Maths", "Français"
  coefficient DECIMAL NOT NULL DEFAULT 1.0 CHECK (coefficient > 0),
  -- Coef > 0 (pour calcul moyenne pondérée)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own subjects" ON public.subjects 
FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- =====================================================
-- STUDENTS (Élèves par classe)
-- =====================================================
CREATE TABLE public.students (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  class_id UUID REFERENCES public.classes(id) ON DELETE SET NULL,
  -- Si classe supprimée → élève reste
  first_name TEXT NOT NULL,    -- "Jean"
  last_name TEXT NOT NULL,     -- "Dupont"
  identifier TEXT,             -- "2025-JD001" (matricule)
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.students ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own students" ON public.students 
FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- =====================================================
-- GRADES (Notes - CŒUR MÉTIER)
-- =====================================================
CREATE TABLE public.grades (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES public.students(id) ON DELETE CASCADE,
  subject_id UUID NOT NULL REFERENCES public.subjects(id) ON DELETE CASCADE,
  teacher_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  school_year_id UUID REFERENCES public.school_years(id) ON DELETE SET NULL,
  value DECIMAL NOT NULL CHECK (value >= 0 AND value <= 20),
  -- Note 0-20 obligatoire
  comment TEXT,                -- "Très bon travail"
  exam_date DATE DEFAULT CURRENT_DATE,  -- Date du jour par défaut
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Teachers manage own grades" ON public.grades 
FOR ALL USING (auth.uid() = teacher_id) WITH CHECK (auth.uid() = teacher_id);

-- =====================================================
-- INDEXES (PERFORMANCE)
-- =====================================================
CREATE INDEX idx_grades_student ON public.grades(student_id);
-- Optimise "notes par élève"
CREATE INDEX idx_grades_subject ON public.grades(subject_id);
-- Optimise "notes par matière"
CREATE INDEX idx_grades_school_year ON public.grades(school_year_id);
CREATE INDEX idx_students_class ON public.students(class_id);
-- Optimise "élèves par classe"
CREATE INDEX idx_students_teacher ON public.students(teacher_id);
CREATE INDEX idx_classes_teacher ON public.classes(teacher_id);
