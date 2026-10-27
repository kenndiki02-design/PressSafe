create extension if not exists pgcrypto;

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 160),
  org_type text not null default 'MEDIA_BODY' check (org_type in ('NEWSROOM', 'MEDIA_BODY', 'ACADEMIC', 'INDEPENDENT')),
  country text not null default 'KE',
  created_at timestamptz not null default now()
);

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null unique,
  full_name text not null check (char_length(full_name) between 2 and 160),
  role text not null default 'JOURNALIST' check (role in ('JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'MEDIA_BODY', 'ADMIN')),
  organization_id uuid references public.organizations(id) on delete set null,
  preferred_locale text not null default 'en' check (preferred_locale in ('en', 'sw')),
  simplified_mode boolean not null default false,
  consented_at timestamptz,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check ((role = 'MEDIA_BODY' and organization_id is not null) or role <> 'MEDIA_BODY')
);

create table if not exists public.organization_invites (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid not null references public.organizations(id) on delete cascade,
  invite_hash text not null unique check (invite_hash ~ '^[a-f0-9]{64}$'),
  invite_role text not null check (invite_role in ('JOURNALIST', 'EDITOR', 'FACT_CHECKER', 'MEDIA_BODY')),
  max_uses integer not null default 1 check (max_uses between 1 and 500),
  uses integer not null default 0 check (uses between 0 and max_uses),
  expires_at timestamptz not null,
  created_by uuid not null references public.profiles(id),
  created_at timestamptz not null default now()
);

create table if not exists public.cases (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(title) between 2 and 200),
  description text,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CLOSED', 'ARCHIVED')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  submitted_by uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  input_type text not null check (input_type in ('TEXT', 'URL', 'IMAGE', 'VIDEO', 'DOCUMENT')),
  claim_text text not null check (char_length(claim_text) between 8 and 12000),
  topic text not null default 'General',
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_PROGRESS', 'VERIFIED', 'REQUIRES_FURTHER_REVIEW', 'UNVERIFIED')),
  ai_analysis jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.review_tasks (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null unique references public.verification_requests(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  assigned_to uuid references public.profiles(id) on delete set null,
  status text not null default 'PENDING' check (status in ('PENDING', 'IN_REVIEW', 'COMPLETED', 'REJECTED')),
  decision text check (decision in ('VERIFIED', 'REQUIRES_FURTHER_REVIEW', 'UNVERIFIED')),
  notes text,
  priority integer not null default 0,
  created_at timestamptz not null default now(),
  completed_at timestamptz
);

create table if not exists public.evidence_items (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  uploaded_by uuid not null references public.profiles(id) on delete cascade,
  case_id uuid references public.cases(id) on delete set null,
  object_key text not null unique,
  file_name text not null,
  sha256_hash text not null check (sha256_hash ~ '^[a-f0-9]{64}$'),
  encrypted boolean not null default false,
  encryption_metadata jsonb not null default '{}'::jsonb,
  size_bytes bigint not null check (size_bytes >= 0),
  mime_type text not null,
  created_at timestamptz not null default now()
);

create table if not exists public.incidents (
  id uuid primary key default gen_random_uuid(),
  organization_id uuid references public.organizations(id) on delete set null,
  reported_by uuid not null references public.profiles(id) on delete cascade,
  incident_type text not null check (incident_type in ('THREAT', 'HARASSMENT', 'PHYSICAL_ATTACK', 'ARREST_DETENTION', 'EQUIPMENT_SEIZURE', 'ONLINE_ABUSE_DOXXING', 'LEGAL_ACTION', 'OTHER')),
  severity text not null default 'MEDIUM' check (severity in ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL')),
  occurred_at timestamptz not null default now(),
  location_text text,
  description text not null check (char_length(description) between 8 and 12000),
  status text not null default 'SUBMITTED' check (status in ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'RESOLVED', 'ESCALATED')),
  consent_to_share boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.trusted_contacts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(name) between 2 and 160),
  email text,
  phone text,
  notify_on_sos boolean not null default true,
  notify_on_missed_checkin boolean not null default true,
  created_at timestamptz not null default now(),
  check (email is not null or phone is not null)
);

create table if not exists public.checkin_timers (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  label text,
  due_at timestamptz not null,
  status text not null default 'ACTIVE' check (status in ('ACTIVE', 'CHECKED_IN', 'TRIGGERED', 'CANCELLED')),
  created_at timestamptz not null default now(),
  checked_in_at timestamptz
);

create table if not exists public.sos_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  message text,
  latitude double precision check (latitude between -90 and 90),
  longitude double precision check (longitude between -180 and 180),
  location_shared boolean not null default false,
  status text not null default 'RECORDED' check (status in ('RECORDED', 'ACKNOWLEDGED', 'RESOLVED')),
  created_at timestamptz not null default now()
);

create table if not exists public.training_modules (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  title_en text not null,
  title_sw text not null,
  content_json jsonb not null default '{}'::jsonb,
  duration_minutes integer not null default 10,
  published boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists public.training_progress (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  module_id uuid not null references public.training_modules(id) on delete cascade,
  completed_at timestamptz,
  score integer,
  unique(user_id, module_id)
);

create table if not exists public.audit_logs (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  organization_id uuid references public.organizations(id) on delete set null,
  action text not null,
  resource_type text,
  resource_id text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create table if not exists public.privacy_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete set null,
  request_type text not null check (request_type in ('ACCESS', 'CORRECTION', 'DELETION', 'PORTABILITY')),
  details text check (char_length(details) <= 4000),
  status text not null default 'SUBMITTED' check (status in ('SUBMITTED', 'IN_REVIEW', 'COMPLETED', 'REJECTED')),
  created_at timestamptz not null default now(),
  resolved_at timestamptz,
  resolved_by uuid references public.profiles(id) on delete set null
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  organization_id uuid references public.organizations(id) on delete cascade,
  category text not null default 'SYSTEM',
  title text not null check (char_length(title) between 1 and 200),
  message text not null check (char_length(message) <= 2000),
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists profiles_org_role_idx on public.profiles (organization_id, role);
create index if not exists cases_owner_created_idx on public.cases (owner_id, created_at desc);
create index if not exists verification_org_status_idx on public.verification_requests (organization_id, status, created_at desc);
create index if not exists verification_user_created_idx on public.verification_requests (submitted_by, created_at desc);
create index if not exists incidents_org_created_idx on public.incidents (organization_id, created_at desc);
create index if not exists incidents_user_created_idx on public.incidents (reported_by, created_at desc);
create index if not exists checkin_org_due_idx on public.checkin_timers (organization_id, status, due_at);
create index if not exists evidence_user_created_idx on public.evidence_items (uploaded_by, created_at desc);
create index if not exists review_org_status_idx on public.review_tasks (organization_id, status, priority desc);
create index if not exists audit_org_created_idx on public.audit_logs (organization_id, created_at desc);

alter table public.organizations enable row level security;
alter table public.profiles enable row level security;
alter table public.organization_invites enable row level security;
alter table public.cases enable row level security;
alter table public.verification_requests enable row level security;
alter table public.review_tasks enable row level security;
alter table public.evidence_items enable row level security;
alter table public.incidents enable row level security;
alter table public.trusted_contacts enable row level security;
alter table public.checkin_timers enable row level security;
alter table public.sos_events enable row level security;
alter table public.training_modules enable row level security;
alter table public.training_progress enable row level security;
alter table public.audit_logs enable row level security;
alter table public.privacy_requests enable row level security;
alter table public.notifications enable row level security;

create policy "users read own profile" on public.profiles for select to authenticated using (id = auth.uid());
create policy "users read own cases" on public.cases for select to authenticated using (owner_id = auth.uid());
create policy "users manage own cases" on public.cases for all to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "users read own verifications" on public.verification_requests for select to authenticated using (submitted_by = auth.uid());
create policy "users create own verifications" on public.verification_requests for insert to authenticated with check (submitted_by = auth.uid());
create policy "users read own evidence" on public.evidence_items for select to authenticated using (uploaded_by = auth.uid());
create policy "users read own incidents" on public.incidents for select to authenticated using (reported_by = auth.uid());
create policy "users create own incidents" on public.incidents for insert to authenticated with check (reported_by = auth.uid());
create policy "users manage own contacts" on public.trusted_contacts for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users manage own checkins" on public.checkin_timers for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users read own sos events" on public.sos_events for select to authenticated using (user_id = auth.uid());
create policy "users create own sos events" on public.sos_events for insert to authenticated with check (user_id = auth.uid());
create policy "users read published training" on public.training_modules for select to authenticated using (published = true);
create policy "users manage own progress" on public.training_progress for all to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "users read own privacy requests" on public.privacy_requests for select to authenticated using (user_id = auth.uid());
create policy "users create own privacy requests" on public.privacy_requests for insert to authenticated with check (user_id = auth.uid());
create policy "users read own notifications" on public.notifications for select to authenticated using (user_id = auth.uid());
create policy "users update own notifications" on public.notifications for update to authenticated using (user_id = auth.uid()) with check (user_id = auth.uid());

revoke all on public.audit_logs from anon, authenticated;
revoke all on public.profiles from anon;
revoke all on public.organizations from anon, authenticated;
revoke all on public.organization_invites from anon, authenticated;
revoke all on public.review_tasks from anon, authenticated;
revoke all on public.sos_events from anon;
revoke all on public.privacy_requests from anon;
revoke all on public.notifications from anon;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('presssafe-evidence', 'presssafe-evidence', false, 26214400, array['application/octet-stream'])
on conflict (id) do update set public = false, file_size_limit = 26214400, allowed_mime_types = array['application/octet-stream'];

create or replace function public.redeem_org_invite(p_invite_hash text, p_role text)
returns table (org_id uuid, redeemed_role text)
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  update public.organization_invites as invite
     set uses = invite.uses + 1
   where invite.invite_hash = p_invite_hash
     and invite.invite_role = p_role
     and invite.expires_at > now()
     and invite.uses < invite.max_uses
  returning invite.organization_id, invite.invite_role;
end;
$$;

revoke all on function public.redeem_org_invite(text, text) from public, anon, authenticated;
grant execute on function public.redeem_org_invite(text, text) to service_role;