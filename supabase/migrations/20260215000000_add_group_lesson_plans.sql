-- ==============================================================================
-- MIGRATION: Add Lesson Plan Templates and Group Lesson Plans
-- Description: Adds tables for admin-defined lesson plan templates that can be
--              applied to groups with optional customization per group
-- ==============================================================================

-- ==============================================================================
-- TABLE LESSON_PLAN_TEMPLATES (Plans de cours modèles - définis par les admins)
-- ==============================================================================

CREATE TABLE public.lesson_plan_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    author_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    duration_minutes INTEGER,
    objectives TEXT,
    materials TEXT,
    category public.group_category,
    level_min INTEGER DEFAULT 1,
    level_max INTEGER DEFAULT 10,
    sort_order INTEGER DEFAULT 0,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_lesson_plan_templates_author_id ON public.lesson_plan_templates(author_id);
CREATE INDEX idx_lesson_plan_templates_category ON public.lesson_plan_templates(category);
CREATE INDEX idx_lesson_plan_templates_active ON public.lesson_plan_templates(is_active);

-- RLS
ALTER TABLE public.lesson_plan_templates ENABLE ROW LEVEL SECURITY;

-- Policies: Anyone authenticated can view active templates
CREATE POLICY "Authenticated users can view templates"
ON public.lesson_plan_templates FOR SELECT
USING (
    auth.uid() IS NOT NULL
    AND (is_active = TRUE OR EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'admin'
    ))
);

-- Policies: Only admins can manage templates
CREATE POLICY "Admins can insert templates"
ON public.lesson_plan_templates FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'admin'
    )
);

CREATE POLICY "Admins can update templates"
ON public.lesson_plan_templates FOR UPDATE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'admin'
    )
);

CREATE POLICY "Admins can delete templates"
ON public.lesson_plan_templates FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'admin'
    )
);

-- ==============================================================================
-- TABLE GROUP_LESSON_PLANS (Plans de cours appliqués aux groupes)
-- ==============================================================================

CREATE TABLE public.group_lesson_plans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID NOT NULL REFERENCES public.groups(id) ON DELETE CASCADE,
    template_id UUID REFERENCES public.lesson_plan_templates(id) ON DELETE SET NULL,
    applied_by UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    session_date DATE,
    -- Override fields (NULL means use template value)
    title_override TEXT,
    content_override TEXT,
    duration_override INTEGER,
    objectives_override TEXT,
    materials_override TEXT,
    -- Status
    is_cancelled BOOLEAN DEFAULT FALSE,
    cancellation_reason TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Index
CREATE INDEX idx_group_lesson_plans_group_id ON public.group_lesson_plans(group_id);
CREATE INDEX idx_group_lesson_plans_template_id ON public.group_lesson_plans(template_id);
CREATE INDEX idx_group_lesson_plans_session_date ON public.group_lesson_plans(session_date);
CREATE INDEX idx_group_lesson_plans_applied_by ON public.group_lesson_plans(applied_by);

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

-- Policies: Only admins can apply lesson plans to groups
CREATE POLICY "Admins can insert lesson plans"
ON public.group_lesson_plans FOR INSERT
WITH CHECK (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'admin'
    )
);

-- Policies: Coaches can update lesson plans for their groups (customize), admins can update any
CREATE POLICY "Staff can update lesson plans"
ON public.group_lesson_plans FOR UPDATE
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

-- Policies: Only admins can delete lesson plans
CREATE POLICY "Admins can delete lesson plans"
ON public.group_lesson_plans FOR DELETE
USING (
    EXISTS (
        SELECT 1 FROM public.profiles p
        WHERE p.auth_user_id = auth.uid()
        AND p.role = 'admin'
    )
);
