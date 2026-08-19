-- MADDOX Management — Etapa 6
-- Schema inicial: tabelas, relacionamentos, RLS e Storage.
--
-- COMO USAR (veja o passo a passo completo no README.md):
-- 1. Abra seu projeto em https://supabase.com/dashboard
-- 2. Vá em "SQL Editor" -> "New query"
-- 3. Cole todo o conteúdo deste arquivo e clique em "Run"
--
-- Este script é seguro para rodar em um projeto novo/vazio. Ele NÃO apaga
-- nenhuma tabela existente (usa CREATE TABLE IF NOT EXISTS em tudo).

-- =========================================================================
-- 1. FUNÇÃO AUXILIAR: manter "updated_at" sempre atualizado sozinho
-- =========================================================================

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- =========================================================================
-- 2. PROFILES — dados do DJ / contratado (1 linha por usuário)
-- =========================================================================

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  artistic_name text not null default 'DJ MADDOX',
  full_name text,
  document text,
  phone text,
  email text,
  postal_code text,
  address text,
  address_number text,
  neighborhood text,
  city text,
  state text,
  default_forum text not null default 'Rio Verde - Goiás',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

drop trigger if exists set_profiles_updated_at on public.profiles;
create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

alter table public.profiles enable row level security;

drop policy if exists "profiles: select own" on public.profiles;
create policy "profiles: select own" on public.profiles
  for select using (id = auth.uid());

drop policy if exists "profiles: insert own" on public.profiles;
create policy "profiles: insert own" on public.profiles
  for insert with check (id = auth.uid());

drop policy if exists "profiles: update own" on public.profiles;
create policy "profiles: update own" on public.profiles
  for update using (id = auth.uid());

-- Cria automaticamente uma linha em profiles assim que um usuário é criado
-- no Supabase Auth (inclusive quando você cria o usuário manualmente pelo
-- painel) — assim o app nunca encontra um perfil "inexistente".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =========================================================================
-- 3. EVENTS (precisa existir antes de "quotes" por causa do FK cruzado)
-- =========================================================================

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  quote_id uuid,
  client_name text not null,
  client_document text not null,
  phone text not null,
  email text,
  client_address jsonb,
  event_type text not null,
  event_date date not null,
  start_time text,
  end_time text,
  setup_time text,
  city text not null,
  venue text,
  address text,
  contracted_amount numeric(12, 2) not null,
  original_amount numeric(12, 2) not null,
  payment_method text,
  notes text,
  status text not null default 'confirmado' check (status in ('confirmado')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists events_user_id_idx on public.events (user_id);
create index if not exists events_event_date_idx on public.events (event_date);
create unique index if not exists events_quote_id_key on public.events (quote_id);

drop trigger if exists set_events_updated_at on public.events;
create trigger set_events_updated_at
  before update on public.events
  for each row execute function public.set_updated_at();

alter table public.events enable row level security;

drop policy if exists "events: all own" on public.events;
create policy "events: all own" on public.events
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================================
-- 4. QUOTES — orçamentos
-- =========================================================================

create table if not exists public.quotes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  client_name text not null,
  phone text not null,
  event_type text not null,
  event_date date not null,
  event_time text,
  city text not null,
  venue text,
  quoted_amount numeric(12, 2) not null,
  final_amount numeric(12, 2),
  notes text,
  status text not null default 'aberto' check (status in ('aberto', 'fechado', 'nao_fechou')),
  lost_reason text,
  event_id uuid references public.events (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists quotes_user_id_idx on public.quotes (user_id);
create index if not exists quotes_status_idx on public.quotes (status);

drop trigger if exists set_quotes_updated_at on public.quotes;
create trigger set_quotes_updated_at
  before update on public.quotes
  for each row execute function public.set_updated_at();

alter table public.quotes enable row level security;

drop policy if exists "quotes: all own" on public.quotes;
create policy "quotes: all own" on public.quotes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Agora que "quotes" existe, conecta o FK de events -> quotes.
alter table public.events
  drop constraint if exists events_quote_id_fkey;
alter table public.events
  add constraint events_quote_id_fkey foreign key (quote_id)
  references public.quotes (id) on delete set null;

-- =========================================================================
-- 5. INSTALLMENTS — parcelas
-- =========================================================================

create table if not exists public.installments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  description text not null,
  amount numeric(12, 2) not null,
  due_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists installments_user_id_idx on public.installments (user_id);
create index if not exists installments_event_id_idx on public.installments (event_id);

drop trigger if exists set_installments_updated_at on public.installments;
create trigger set_installments_updated_at
  before update on public.installments
  for each row execute function public.set_updated_at();

alter table public.installments enable row level security;

drop policy if exists "installments: all own" on public.installments;
create policy "installments: all own" on public.installments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================================
-- 6. PAYMENTS — recebimentos
-- =========================================================================

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  installment_id uuid not null references public.installments (id) on delete cascade,
  amount numeric(12, 2) not null check (amount > 0),
  payment_date date not null,
  payment_method text not null,
  notes text,
  created_at timestamptz not null default now()
);

create index if not exists payments_user_id_idx on public.payments (user_id);
create index if not exists payments_event_id_idx on public.payments (event_id);
create index if not exists payments_installment_id_idx on public.payments (installment_id);

alter table public.payments enable row level security;

drop policy if exists "payments: all own" on public.payments;
create policy "payments: all own" on public.payments
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================================
-- 7. EXPENSES — despesas
-- =========================================================================

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  description text not null,
  category text not null,
  amount numeric(12, 2) not null check (amount > 0),
  expense_date date not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists expenses_user_id_idx on public.expenses (user_id);
create index if not exists expenses_event_id_idx on public.expenses (event_id);

drop trigger if exists set_expenses_updated_at on public.expenses;
create trigger set_expenses_updated_at
  before update on public.expenses
  for each row execute function public.set_updated_at();

alter table public.expenses enable row level security;

drop policy if exists "expenses: all own" on public.expenses;
create policy "expenses: all own" on public.expenses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================================
-- 8. CONTRACTS — metadados do contrato (1 por evento)
-- =========================================================================

create table if not exists public.contracts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  event_id uuid not null references public.events (id) on delete cascade,
  contract_number text not null,
  status text not null default 'gerado' check (status in ('gerado', 'assinado')),
  image_authorization boolean not null default false,
  forum text not null default 'Rio Verde - Goiás',
  snapshot jsonb not null,
  generated_at timestamptz not null default now(),
  signed_at timestamptz,
  original_file_path text,
  signed_file_path text,
  signed_file_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (event_id),
  unique (user_id, contract_number)
);

create index if not exists contracts_user_id_idx on public.contracts (user_id);

drop trigger if exists set_contracts_updated_at on public.contracts;
create trigger set_contracts_updated_at
  before update on public.contracts
  for each row execute function public.set_updated_at();

alter table public.contracts enable row level security;

drop policy if exists "contracts: all own" on public.contracts;
create policy "contracts: all own" on public.contracts
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- =========================================================================
-- 9. Numeração sequencial de contratos (MAD-AAAA-0001), sem risco de
--    duas gerações simultâneas colidirem no mesmo número.
-- =========================================================================

create table if not exists public.contract_sequences (
  user_id uuid not null references auth.users (id) on delete cascade,
  year int not null,
  last_number int not null default 0,
  primary key (user_id, year)
);

alter table public.contract_sequences enable row level security;

drop policy if exists "contract_sequences: all own" on public.contract_sequences;
create policy "contract_sequences: all own" on public.contract_sequences
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Aloca (de forma atômica) o próximo número do ano informado para o
-- usuário autenticado e já devolve pronto no formato "MAD-2026-0001".
create or replace function public.next_contract_number(p_year int)
returns text
language plpgsql
as $$
declare
  v_number int;
begin
  insert into public.contract_sequences (user_id, year, last_number)
  values (auth.uid(), p_year, 1)
  on conflict (user_id, year)
  do update set last_number = public.contract_sequences.last_number + 1
  returning last_number into v_number;

  return 'MAD-' || p_year::text || '-' || lpad(v_number::text, 4, '0');
end;
$$;

-- =========================================================================
-- 10. STORAGE — bucket privado para os PDFs de contrato
-- =========================================================================

insert into storage.buckets (id, name, public)
values ('contracts', 'contracts', false)
on conflict (id) do nothing;

-- Estrutura de pastas esperada dentro do bucket:
--   {user_id}/{event_id}/original/...
--   {user_id}/{event_id}/signed/...
-- A política abaixo só libera acesso quando o primeiro segmento do caminho
-- do arquivo é o próprio auth.uid() do usuário logado.

drop policy if exists "contracts bucket: read own" on storage.objects;
create policy "contracts bucket: read own" on storage.objects
  for select using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "contracts bucket: insert own" on storage.objects;
create policy "contracts bucket: insert own" on storage.objects
  for insert with check (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "contracts bucket: update own" on storage.objects;
create policy "contracts bucket: update own" on storage.objects
  for update using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "contracts bucket: delete own" on storage.objects;
create policy "contracts bucket: delete own" on storage.objects
  for delete using (
    bucket_id = 'contracts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Fim do script.
