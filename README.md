# GNF AGRO — Sistema de Almoxarifado

Site web, mobile-first, para gestão do almoxarife da GNF AGRO.

## Quem faz o quê

| | Funcionário | Almoxarife | Admin |
|---|---|---|---|
| Ver estoque (sem login) | ✅ | ✅ | ✅ |
| Pedir entrada / compra / empréstimo | | ✅ | |
| Registrar devolução de empréstimo | | ✅ | ✅ |
| Aprovar ou rejeitar pedidos | | | ✅ |
| Dar entrada e baixa direto no estoque | | | ✅ |
| Cadastrar itens, categorias, tipos e funções | | | ✅ |
| Excluir histórico | | | ✅ |
| Aba "A vencer" (devoluções) | | ✅ | ✅ |

- **Entrada**: fornecedor, nota fiscal, data de recebimento e receita agronômica (sim/não).
- **Empréstimo**: servidor, data de vencimento (devolução) e comentário opcional. Atrasados ficam em destaque.
- **Cadastros**: Categoria → Tipo (da categoria) → Função (do tipo).
- Item novo nasce com estoque zero; a quantidade só entra via entrada.

## Banco (Supabase)

- **Instalação do zero**: rode `supabase/schema.sql` no SQL Editor.
- **Já tem o banco da versão anterior**: rode `supabase/migracao-v2.sql` (apaga itens/requisições de teste e tipos/funções antigos; mantém categorias e usuários).
- Criação dos logins: Authentication > Users > Add user, e depois o `insert into public.profiles ...` (exemplo no final do schema.sql).

## Rodar localmente

```bash
npm install
cp .env.example .env   # cole a URL e a anon key do Supabase
npm run dev
```

## Publicar

Suba no GitHub; a Vercel faz o deploy sozinha a cada commit. Variáveis na Vercel:
`VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`.
