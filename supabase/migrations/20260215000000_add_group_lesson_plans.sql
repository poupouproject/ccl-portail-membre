-- ==============================================================================
-- MIGRATION: Add Group Lesson Plans Table
-- Description: Adds table for coaches to manage their lesson plans per group
-- ==============================================================================

-- ==============================================================================
-- TABLE GROUP_LESSON_PLANS (Plans de cours des groupes)
-- ==============================================================================

CREATE TABLE public.group_lesson_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    session_date DATE,
    duration_minutes INTEGER,
    objectives TEXT,
    materials TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_group_lesson_plans_group_id ON public.group_lesson_plans(group_id);
CREATE INDEX idx_group_lesson_plans_author_id ON public.group_lesson_plans(author_id);
CREATE INDEX idx_group_lesson_plans_session_date ON public.group_lesson_plans(session_date);

-- RLS
ALTER TABLE public.group_lesson_plans ENABLE ROW LEVEL SECURITY;

-- Policies: Coaches and admins can view lesson plans for their groups
CREATE POLICY "Staff can view lesson plans for their groups"
ON public.group_lesson_plans FOR SELECT
USING (
    EXISTS (
        SELECT 1 FROM public.group_staff gs
        JOIN public.profiles p ON p.auth_user_id = auth.uid()
        WHERE gs.group_id = group_lesson_plans.group_id
        AND gs.profile_id = p.id
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'admin'
    )
);

-- Policies: Coaches and admins can insert lesson plans
CREATE POLICY "Staff can insert lesson plans"
ON public.group_lesson_plans FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.group_staff gs
        JOIN public.profiles p ON p.auth_user_id = auth.uid()
        WHERE gs.group_id = group_lesson_plans.group_id
        AND gs.profile_id = p.id
    )
    OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'admin'
    )
);

-- Policies: Coaches can update their own lesson plans, admins can update any
CREATE POLICY "Authors can update their lesson plans"
ON public.group_lesson_plans FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND (p.id = group_lesson_plans.author_id OR p.role = 'admin')
    )
);

-- Policies: Coaches can delete their own lesson plans, admins can delete any
CREATE POLICY "Authors can delete their lesson plans"
ON public.group_lesson_plans FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND (p.id = group_lesson_plans.author_id OR p.role = 'admin')
    )
);
