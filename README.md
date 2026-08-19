# MADDOX Management

App pessoal de gestão do DJ MADDOX — orçamentos, agenda, eventos, financeiro,
contratos e, a partir desta etapa, conta na nuvem (Supabase).

## Como rodar

```bash
npm install
npm run dev -- --host
```

Abra o link `http://localhost:5173` no computador, ou o link `http://SEU-IP-LOCAL:5173`
que aparece no terminal para abrir no celular (mesmo Wi-Fi).

**Antes de rodar pela primeira vez**, configure o Supabase (próxima seção) —
sem isso o app abre na tela de login mas ninguém consegue entrar.

## Build de produção

```bash
npm run build
npm run preview -- --host
```

---

## Configurar o Supabase (passo a passo)

Isso só precisa ser feito **uma vez**. O plano gratuito do Supabase é
suficiente para tudo que o app faz hoje — nenhum recurso pago é usado.

### 1. Criar o projeto

1. Acesse [supabase.com](https://supabase.com) e crie uma conta (ou entre com
   a que já tiver).
2. Clique em **New Project**.
3. Escolha um nome (ex: `maddox-management`), uma senha para o banco (guarde
   essa senha em lugar seguro — é diferente da sua senha de login no app) e a
   região mais próxima (ex: South America).
4. Clique em **Create new project** e espere alguns minutos até o projeto
   ficar pronto.

### 2. Rodar o SQL que cria as tabelas

1. No menu lateral do seu projeto, clique em **SQL Editor**.
2. Clique em **New query**.
3. Abra o arquivo `supabase/migrations/001_initial_schema.sql` (está dentro
   desta pasta do projeto), copie **todo o conteúdo** e cole no editor.
4. Clique em **Run** (ou `Ctrl+Enter`).
5. Deve aparecer "Success. No rows returned" — pronto, as tabelas, as regras
   de segurança e o espaço de arquivos dos contratos já existem.

Esse script é seguro: ele não apaga nada, só cria o que ainda não existe.

### 3. Pegar a URL e a chave do projeto

1. No menu lateral, clique em **Project Settings** (ícone de engrenagem) →
   **Data API**.
2. Copie o campo **Project URL** — algo como `https://xxxxx.supabase.co`.
3. Ainda em Project Settings, clique em **API Keys**.
4. Copie a chave chamada **anon public** (NÃO copie a `service_role` — essa é
   secreta e nunca deve ir para o app).

### 4. Preencher o `.env`

1. Na raiz do projeto, copie o arquivo `.env.example` e renomeie a cópia para
   `.env`.
2. Abra o `.env` e preencha:

```
VITE_SUPABASE_URL=https://xxxxx.supabase.co
VITE_SUPABASE_ANON_KEY=coloque-a-chave-anon-aqui
```

3. Salve o arquivo. Se o app já estava rodando (`npm run dev`), pare e rode
   de novo para ele carregar as novas variáveis.

### 5. Criar seu usuário (login)

Nesta etapa não existe tela de "criar conta" dentro do app — você cria seu
usuário direto no painel do Supabase:

1. No menu lateral, clique em **Authentication** → **Users**.
2. Clique em **Add user** → **Create new user**.
3. Preencha e-mail e senha (marque **Auto Confirm User** para não precisar
   confirmar por e-mail) e clique em **Create user**.
4. Pronto — use esse e-mail e senha para entrar no app.

Se quiser trocar a senha depois, use o link **Esqueci minha senha** na tela
de login do app (ele envia um e-mail de recuperação através do Supabase).

### 6. Testar

Abra o app, entre com o e-mail/senha criados, vá em **Configurações** (ícone
de engrenagem na tela Início) e preencha seus dados. Depois é só usar
normalmente — Orçamentos, Agenda, Eventos, Financeiro e Contratos agora
salvam na sua conta.

---

## Migração dos dados antigos (localStorage)

Se você já vinha usando o app antes desta etapa, os dados ficavam salvos só
no navegador/aparelho (localStorage). Ao entrar pela primeira vez com login,
o app detecta automaticamente esses dados antigos e pergunta:

> **Encontramos dados salvos neste aparelho** — Você deseja enviá-los para
> sua conta para não correr risco de perda?

Escolhendo **Migrar agora**, tudo é enviado para o Supabase (orçamentos,
eventos, parcelas, pagamentos, despesas e metadados de contrato — o PDF
assinado, se existir localmente, também é enviado). Os dados antigos no
aparelho **não são apagados automaticamente**. É seguro rodar a migração mais
de uma vez (em Configurações → "Migrar novamente") — ela nunca duplica
registros.

## Backup manual

Em **Configurações**, o botão **Exportar backup** baixa um arquivo
`.json` com todos os seus dados (orçamentos, eventos, parcelas, pagamentos,
despesas e metadados de contrato — os PDFs em si não entram no arquivo). O
botão **Importar backup** restaura esse mesmo arquivo.

## Instalar o app no celular

O MADDOX Management é um PWA (Progressive Web App): não existe versão para
baixar na loja — você instala direto do navegador, e ele passa a se
comportar como um aplicativo normal (ícone na tela, tela cheia, sem barra do
navegador).

### Android

1. Abra o app pelo Chrome (ou navegador equivalente).
2. Entre em **Configurações** dentro do app (ícone de engrenagem na tela
   Início) → seção **Aplicativo** → toque em **Instalar MADDOX Management**.
3. Se essa opção não aparecer, o próprio Chrome costuma oferecer um aviso de
   instalação depois de visitar o app algumas vezes — ou use o menu do
   navegador (⋮) → **Instalar aplicativo** / **Adicionar à tela inicial**.

### iPhone / iOS

O Safari do iPhone não mostra um botão de instalação automática — o caminho
é sempre manual, mas rápido:

1. Abra o app no **Safari** (precisa ser o Safari, não funciona pelo Chrome
   no iPhone).
2. Toque no ícone de **Compartilhar** (o quadrado com uma seta para cima), na
   barra inferior.
3. Role e toque em **Adicionar à Tela de Início**.
4. Confirme o nome (já vem preenchido como "MADDOX") e toque em **Adicionar**.

Depois disso, um ícone MADDOX aparece na tela inicial do iPhone, e abrir por
ele já entra em tela cheia, sem a barra do Safari.

### Depois de instalado

Sempre que houver uma atualização do app, aparece um aviso discreto no topo
da tela ("Nova versão disponível") com um botão **Atualizar** — não é
necessário desinstalar e instalar de novo.

## Colocar o app online (deploy no Netlify — grátis)

Isso é feito em partes. Algumas você só consegue fazer você mesmo (criar
conta, clicar em botões do painel) — vou te guiar exatamente onde clicar.

### PARTE A — GitHub (guardar o código)

1. Crie uma conta gratuita em [github.com](https://github.com) se ainda não
   tiver.
2. Clique no **+** no canto superior direito → **New repository**.
3. Dê um nome (ex: `maddox-management`), deixe como **Private** (privado) e
   clique em **Create repository**.
4. Na página do repositório recém-criado, siga as instruções em
   "…or push an existing repository from the command line" — resumindo, no
   terminal, dentro da pasta do projeto:

```bash
git init
git add .
git commit -m "MADDOX Management"
git branch -M main
git remote add origin https://github.com/SEU-USUARIO/maddox-management.git
git push -u origin main
```

   Troque `SEU-USUARIO` pelo seu usuário do GitHub. O Git vai pedir login —
   use um token de acesso pessoal se ele pedir senha (o GitHub explica como
   gerar um na hora, em **Settings → Developer settings → Personal access
   tokens**).

   **Confira antes de enviar**: rode `git status` e confirme que **`.env`
   não aparece na lista** de arquivos a enviar (o `.gitignore` já cuida
   disso, mas vale checar).

### PARTE B — Netlify (publicar o site)

1. Crie uma conta gratuita em [netlify.com](https://netlify.com) — pode
   entrar direto com sua conta do GitHub, é mais simples.
2. No painel, clique em **Add new site** → **Import an existing project**.
3. Escolha **GitHub** e autorize o Netlify a acessar seus repositórios.
4. Selecione o repositório `maddox-management`.
5. Na tela de configuração de build, confirme (o `netlify.toml` do projeto já
   preenche isso sozinho, mas confira):
   - **Build command**: `npm run build`
   - **Publish directory**: `dist`
6. Ainda **não** clique em Deploy — antes, vá para a Parte C para adicionar
   as variáveis de ambiente.

### PARTE C — Variáveis do Supabase no Netlify

1. Na mesma tela de configuração (ou depois em **Site configuration →
   Environment variables**), clique em **Add a variable**.
2. Adicione as duas:
   - `VITE_SUPABASE_URL` → cole a Project URL do seu Supabase.
   - `VITE_SUPABASE_ANON_KEY` → cole a chave **anon public** do seu Supabase.
   
   (Se você não tiver mais essas informações à mão: painel do Supabase →
   **Project Settings → Data API** para a URL, e **API Keys** para a chave
   `anon public`. Nunca use a `service_role`.)
3. Agora sim, clique em **Deploy site**.
4. Espere o build terminar (1-2 minutos). Quando aparecer "Published", seu
   site já está no ar num endereço tipo `https://algo-aleatorio.netlify.app`.
5. Opcional: em **Site configuration → Site details → Change site name**,
   troque para algo como `maddox-management` (se estiver disponível) — a URL
   fica `https://maddox-management.netlify.app`.

> **PRECISO QUE VOCÊ FAÇA ISTO**: depois do primeiro deploy, me avise qual
> ficou sendo a URL final do site — preciso dela para revisar a Parte D.

### PARTE D — Avisar a URL para o Supabase

Isso é necessário para login, recuperação de senha e qualquer redirecionamento
de autenticação funcionarem na URL publicada (sem isso, o Supabase pode
recusar ou redirecionar errado).

1. No painel do Supabase, vá em **Authentication → URL Configuration**.
2. Em **Site URL**, coloque a URL do seu site no Netlify (ex:
   `https://maddox-management.netlify.app`).
3. Em **Redirect URLs**, adicione essa mesma URL (pode manter também
   `http://localhost:5173` numa linha separada, se ainda for testar localmente).
4. Salve.

### PARTE E — Testar no computador

1. Abra a URL do Netlify num navegador comum.
2. Confirme que aparece a tela de login (não tela branca, não erro).
3. Entre com seu usuário e senha.
4. Navegue pelas 4 abas, crie um orçamento de teste, confirme que ele
   continua lá depois de recarregar a página (F5).

### PARTE F — Instalar no Android

1. Abra a URL do Netlify no Chrome do celular.
2. Configurações (dentro do app) → **Aplicativo** → **Instalar MADDOX
   Management** (ou use o menu ⋮ do Chrome → **Instalar aplicativo**).
3. Abra pelo ícone criado na tela inicial e confirme que abre em tela cheia.

### PARTE G — Instalar no iPhone

1. Abra a URL do Netlify no **Safari** (precisa ser o Safari).
2. Toque em **Compartilhar** → **Adicionar à Tela de Início** → **Adicionar**.
3. Abra pelo ícone MADDOX criado e confirme que abre em tela cheia, sem a
   barra do Safari.

### Publicar atualizações depois

Uma vez conectado ao GitHub, basta isso sempre que quiser publicar uma
mudança:

```bash
git add .
git commit -m "descrição da mudança"
git push
```

O Netlify detecta o push automaticamente e refaz o deploy sozinho — não
precisa repetir nenhuma configuração.

## Estrutura

```
supabase/migrations/001_initial_schema.sql   # schema completo (rode uma vez no SQL Editor)
.env.example                                  # copie para .env e preencha
netlify.toml                                  # config de build/deploy do Netlify

src/
  App.tsx                    # gate de login + abas + overlays globais
  auth/AuthContext.tsx        # sessão, entrar, sair, recuperar senha
  lib/
    supabaseClient.ts          # único lugar que cria o cliente Supabase
    storageSupabase.ts         # upload/URL assinada dos PDFs de contrato
    migracao.ts                 # migração dos dados antigos do localStorage
    legacyLocalStore.ts         # leitura somente-leitura das chaves antigas
    backup.ts                   # exportar/importar backup em JSON
    contratoPdf.ts / pdfGenerator.ts   # geração do PDF do contrato
    financeiro.ts                # cálculos financeiros (status de parcela, resumo)
    date.ts / format.ts           # datas e formatação, sempre em horário local
  data/                        # um repositório por entidade, todos falando com o Supabase
  config/contratado.ts         # monta os dados do CONTRATADO a partir do perfil salvo
  pages/
    Login/                      # tela de entrar
    Configuracoes/               # dados do DJ, backup, migração, sair
    Home.tsx / Agenda.tsx / Financeiro.tsx
    Orcamentos/                  # lista, formulário, detalhe, fechamento
    Eventos/                     # detalhe do evento, pagamentos, despesas, contrato
```
