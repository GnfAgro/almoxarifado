-- ============================================================
-- GNF AGRO — Sistema de Almoxarifado
-- Schema Supabase (Postgres). Rode este arquivo inteiro no
-- SQL Editor do seu projeto Supabase (Supabase > SQL Editor > New query).
-- ============================================================

-- ---------- EXTENSÕES ----------
create extension if not exists "uuid-ossp";

-- ---------- PERFIS (admin / almoxarife) ----------
-- Todo usuário com login (admin ou almoxarife) tem uma linha aqui,
-- ligada ao usuário criado em Supabase Auth.
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  nome text not null,
  role text not null check (role in ('admin', 'almoxarife')),
  created_at timestamptz not null default now()
);

-- Função auxiliar: pega o papel do usuário logado
create or replace function public.get_my_role()
returns text
language sql
security definer
stable
as $$
  select role from public.profiles where id = auth.uid()
$$;

-- ---------- CATEGORIAS ----------
create table public.categorias (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- TIPOS ----------
create table public.tipos (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- FUNÇÕES (finalidade de uso do item) ----------
create table public.funcoes (
  id uuid primary key default uuid_generate_v4(),
  nome text not null unique,
  created_at timestamptz not null default now()
);

-- ---------- ITENS ----------
create table public.itens (
  id uuid primary key default uuid_generate_v4(),
  nome text not null,
  apelidos text[] not null default '{}',       -- nomes alternativos, só para busca
  categoria_id uuid not null references public.categorias(id),
  tipo_id uuid not null references public.tipos(id),
  funcao_id uuid references public.funcoes(id),
  codigo text,                                  -- opcional, ex: código de peça específica
  unidade text not null,                        -- peça, litro, caixa, metro, etc.
  quantidade numeric not null default 0 check (quantidade >= 0),
  quantidade_minima numeric not null default 0, -- dispara alerta de estoque baixo
  -- campo oculto: só admin/almoxarife enxergam (controlado por RLS + pela UI)
  nota_fiscal text,
  data_compra date,
  loja text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index itens_categoria_idx on public.itens(categoria_id);
create index itens_tipo_idx on public.itens(tipo_id);
create index itens_apelidos_idx on public.itens using gin(apelidos);

-- ---------- REQUISIÇÕES ----------
create table public.requisicoes (
  id uuid primary key default uuid_generate_v4(),
  item_id uuid not null references public.itens(id),
  quantidade numeric not null check (quantidade > 0),
  tipo text not null check (tipo in ('entrada', 'saida', 'compra')),
  urgente boolean not null default false,
  funcionario_nome text,          -- quem retirou o material (informado pelo almoxarife)
  almoxarife_id uuid not null references public.profiles(id),
  status text not null default 'pendente'
    check (status in ('pendente', 'aprovado', 'rejeitado', 'executado_urgente')),
  admin_id uuid references public.profiles(id),
  observacao text,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create index requisicoes_status_idx on public.requisicoes(status);
create index requisicoes_item_idx on public.requisicoes(item_id);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles enable row level security;
alter table public.categorias enable row level security;
alter table public.tipos enable row level security;
alter table public.funcoes enable row level security;
alter table public.itens enable row level security;
alter table public.requisicoes enable row level security;

-- PROFILES: cada usuário lê o próprio perfil; admin lê todos
create policy "ver proprio perfil" on public.profiles
  for select using (auth.uid() = id or public.get_my_role() = 'admin');

-- CATEGORIAS / TIPOS / FUNÇÕES: leitura pública (funcionário sem login também vê),
-- escrita só almoxarife/admin
create policy "leitura publica categorias" on public.categorias for select using (true);
create policy "escrita almoxarife/admin categorias" on public.categorias
  for all using (public.get_my_role() in ('almoxarife', 'admin'))
  with check (public.get_my_role() in ('almoxarife', 'admin'));

create policy "leitura publica tipos" on public.tipos for select using (true);
create policy "escrita almoxarife/admin tipos" on public.tipos
  for all using (public.get_my_role() in ('almoxarife', 'admin'))
  with check (public.get_my_role() in ('almoxarife', 'admin'));

create policy "leitura publica funcoes" on public.funcoes for select using (true);
create policy "escrita almoxarife/admin funcoes" on public.funcoes
  for all using (public.get_my_role() in ('almoxarife', 'admin'))
  with check (public.get_my_role() in ('almoxarife', 'admin'));

-- ITENS: leitura pública de TUDO, menos os campos ocultos.
-- Como RLS não filtra colunas, a ocultação de nota_fiscal/data_compra/loja
-- para o funcionário é feita na camada da aplicação (view abaixo + front-end),
-- nunca busque itens_com_notas fora do login de admin/almoxarife.
create policy "leitura publica itens" on public.itens for select using (true);
create policy "escrita almoxarife/admin itens" on public.itens
  for all using (public.get_my_role() in ('almoxarife', 'admin'))
  with check (public.get_my_role() in ('almoxarife', 'admin'));

-- View pública SEM os campos sensíveis — use esta no painel do funcionário
create view public.itens_publico as
  select id, nome, categoria_id, tipo_id, funcao_id, codigo, unidade,
         quantidade, quantidade_minima, apelidos, created_at, updated_at
  from public.itens;

-- REQUISIÇÕES: só almoxarife (as que ele criou) e admin (todas)
create policy "almoxarife ve proprias requisicoes" on public.requisicoes
  for select using (
    almoxarife_id = auth.uid() or public.get_my_role() = 'admin'
  );
create policy "almoxarife cria requisicoes" on public.requisicoes
  for insert with check (
    public.get_my_role() in ('almoxarife', 'admin')
    and almoxarife_id = auth.uid()
  );
create policy "admin atualiza requisicoes" on public.requisicoes
  for update using (public.get_my_role() = 'admin');
-- almoxarife pode atualizar só as próprias saídas de urgência (marcar executado)
create policy "almoxarife atualiza urgencia propria" on public.requisicoes
  for update using (
    almoxarife_id = auth.uid() and urgente = true
  );

-- ============================================================
-- DADOS INICIAIS (opcional — apague se não quiser)
-- ============================================================
-- insert into public.categorias (nome) values ('Peças'), ('Ferramentas'), ('Insumos');
-- insert into public.tipos (nome) values ('Manual'), ('Elétrico'), ('Consumível');

-- ============================================================
-- COMO CRIAR O PRIMEIRO ADMIN E ALMOXARIFE
-- ============================================================
-- 1. No painel Supabase: Authentication > Users > Add user
--    (crie um usuário com e-mail e senha para o admin, e outro para o almoxarife)
-- 2. Copie o UUID de cada usuário criado
-- 3. Rode, trocando os valores:
--    insert into public.profiles (id, nome, role) values
--      ('uuid-do-admin-aqui', 'Nome do Admin', 'admin'),
--      ('uuid-do-almoxarife-aqui', 'Nome do Almoxarife', 'almoxarife');
