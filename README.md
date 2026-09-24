# GNF AGRO — Sistema de Almoxarifado

Site web, mobile-first, para gestão do almoxarifado da GNF AGRO.

- **Funcionário**: acessa a página inicial sem login e só visualiza o que tem no estoque.
- **Almoxarife**: faz login, cadastra/gerencia itens, categorias, tipos e funções, e cria requisições de entrada, saída e compra. Pode fazer saída de urgência (sai do estoque na hora, sob responsabilidade dele, sem esperar aprovação).
- **Admin**: faz login, tem tudo do almoxarife e aprova/rejeita as requisições.

## 1. Criar o banco (Supabase — grátis)

1. Crie uma conta em [supabase.com](https://supabase.com) e um novo projeto.
2. No painel do projeto, vá em **SQL Editor > New query**, cole todo o conteúdo do arquivo [`supabase/schema.sql`](./supabase/schema.sql) e rode.
3. Vá em **Authentication > Users > Add user** e crie um usuário para o **admin** e outro para o **almoxarife** (e-mail + senha).
4. Copie o UUID de cada usuário criado (aparece na lista de usuários) e rode no SQL Editor, substituindo os valores:

   ```sql
   insert into public.profiles (id, nome, role) values
     ('uuid-do-admin-aqui', 'Nome do Admin', 'admin'),
     ('uuid-do-almoxarife-aqui', 'Nome do Almoxarife', 'almoxarife');
   ```

5. Em **Project Settings > API**, copie a **Project URL** e a **anon public key** — vai precisar delas no passo 3.

## 2. Rodar localmente

```bash
npm install
cp .env.example .env
# edite o .env e cole a URL e a anon key do Supabase
npm run dev
```

Abra o endereço que aparecer no terminal (geralmente `http://localhost:5173`).

## 3. Subir para o GitHub

```bash
git init
git add .
git commit -m "Sistema de almoxarifado GNF AGRO"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/SEU-REPOSITORIO.git
git push -u origin main
```

O arquivo `.env` **não** é enviado ao GitHub (está no `.gitignore`) — isso é proposital, pois ele contém a chave do seu banco.

## 4. Colocar no ar (grátis)

Recomendado: [Vercel](https://vercel.com) ou [Netlify](https://netlify.com) — ambos conectam direto no repositório do GitHub.

1. Crie conta e importe o repositório.
2. Nas configurações de **variáveis de ambiente** do projeto (na Vercel/Netlify, não no GitHub), adicione:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
3. Build command: `npm run build` — pasta de saída: `dist`.
4. Deploy. Pronto, o link gerado pode ser acessado do celular.

## Estrutura do projeto

```
supabase/schema.sql        -> schema do banco (tabelas, permissões)
src/pages/Estoque.jsx      -> tela pública do funcionário
src/pages/Login.jsx        -> login do almoxarife/admin
src/pages/AlmoxarifeDashboard.jsx -> painel do almoxarife e do admin
src/components/            -> formulários e listas reutilizáveis
src/hooks/                 -> carregamento de dados do Supabase
```

## Próximos ajustes possíveis (me avise quando quiser)

- Notificação/push quando entrar uma requisição nova ou urgente
- Exportar histórico de saídas em planilha
- Foto do item no cadastro
