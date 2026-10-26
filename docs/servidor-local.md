# Rodar o almoxarifado no servidor da Balimax

Guia para colocar o sistema no PowerEdge T110 II (Windows 11, Xeon, 32 GB, SSD
500 GB), com o banco na própria máquina, e acessar de fora quando precisar.

O hardware é folgado para o tamanho do sistema: o banco inteiro tem **41 mil
linhas** (2.224 materiais, 35.277 movimentações, 1.596 peças, 412
colaboradores) e ocupa poucas centenas de MB. O que vai consumir recurso é o
Docker, não os dados.

---

## 1. Antes de tudo: duas formas de "rodar localmente"

Vale decidir isso primeiro, porque muda todo o resto.

### Opção A — Sistema no servidor, banco na nuvem (como está hoje)

O servidor hospeda só a tela; o banco continua no Supabase.

- **A favor:** nada muda no banco. Atualizar é `git pull` + build. Backup,
  réplica e atualização de segurança do Postgres seguem sendo do Supabase.
- **Contra:** sem internet, o sistema não funciona — nem no balcão.

### Opção B — Tudo no servidor (banco junto)

O Supabase inteiro (Postgres, autenticação e API) roda em contêineres na
máquina.

- **A favor:** funciona com a internet caída, que é o caso de um almoxarifado
  em Barcarena. Os dados ficam fisicamente com vocês.
- **Contra:** o papel de administrador do banco passa a ser de vocês. Backup,
  espaço em disco, atualização de versão e recuperação de falha viram rotina da
  casa. Se o SSD morrer sem backup, não há de onde restaurar.

**Recomendação:** Opção B, por causa da internet, **com uma condição**: o
backup automático do item 7 precisa estar funcionando e **testado** antes de
desligar a nuvem. Banco local sem backup testado é pior que nuvem com internet
ruim.

Dá para começar pela A (meia hora de trabalho) e migrar para a B depois; o
caminho é o mesmo.

---

## 2. Backup do banco — o que já existe

Dois comandos no projeto:

```bash
npm run backup:dados
```

Exporta todas as tabelas como JSON, pela API, usando a chave de serviço. **Já
rodei**: 41.260 linhas em 26 tabelas, ~20 MB, em `backup/dados-<data>/`. Serve
como rede de segurança dos dados.

```bash
npm run backup:completo
```

Esse é o backup **de referência**: `pg_dump` com estrutura e dados (tabelas,
colunas geradas, índices, funções, gatilhos e as políticas de acesso). Ele
precisa de uma linha em `.env.carga` (arquivo que não vai para o git):

```
SUPABASE_DB_URL=postgresql://postgres.SEUPROJETO:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

A string sai do painel do Supabase em **Connect → Session pooler** (porta
5432). Se ninguém souber a senha, dá para trocar em **Settings → Database →
Reset database password** — isso **não** invalida as chaves de API que o
sistema usa hoje.

> **Por que o JSON não basta para mudar de servidor:** ele leva as linhas, não a
> estrutura. Restaurar só os dados num banco vazio dá um banco sem as regras de
> acesso — qualquer usuário autenticado enxergaria e alteraria tudo. Para o
> servidor local, use o `backup:completo`.

> **Ponto de atenção honesto:** as mudanças de estrutura feitas nos últimos dias
> foram aplicadas direto no banco da nuvem; a pasta `supabase/migrations` está
> vazia. Hoje **a estrutura só existe dentro do banco**. O `pg_dump` resolve
> isso: guarde o `estrutura-<data>.sql` junto do projeto (fora do git, com os
> backups) — é o que permite recriar o sistema do zero.

---

## 3. Preparar o servidor (uma vez)

1. **Windows Update** em dia e o servidor com **IP fixo** na rede (ex.:
   `192.168.0.50`). Reserve o IP no roteador pelo MAC.
2. **Energia:** nobreak. Postgres em queda de energia sem nobreak é o caminho
   mais curto para corromper dados.
3. **WSL 2** (o Docker precisa):
   ```powershell
   wsl --install
   ```
   Reinicie quando pedir.
4. **Docker Desktop** (versão para Windows). Em *Settings → General*, marque
   **Start Docker Desktop when you sign in**; em *Resources*, deixe **8 GB** de
   memória (sobra para o Postgres e o resto do Windows).
5. **Node.js 24 LTS** e **Git for Windows**.
6. **Pasta do sistema:** `C:\balimax\almox` (evite OneDrive e caminhos com
   espaço ou acento — alguns scripts e o Docker reclamam).

```powershell
git clone <url-do-repositorio> C:\balimax\almox
cd C:\balimax\almox
npm install
```

---

## 4. Subir o Supabase local (Opção B)

```powershell
git clone --depth 1 https://github.com/supabase/supabase C:\balimax\supabase-src
mkdir C:\balimax\supabase
xcopy /E /I C:\balimax\supabase-src\docker C:\balimax\supabase
copy C:\balimax\supabase\.env.example C:\balimax\supabase\.env
```

Edite `C:\balimax\supabase\.env` e troque **todos** os valores de exemplo:

| Variável | O que pôr |
|---|---|
| `POSTGRES_PASSWORD` | senha longa, só para o banco |
| `JWT_SECRET` | 40+ caracteres aleatórios |
| `ANON_KEY` / `SERVICE_ROLE_KEY` | geradas a partir do `JWT_SECRET` (ver abaixo) |
| `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` | acesso ao painel local |
| `SITE_URL` | `http://192.168.0.50` (o endereço do sistema na rede) |
| `API_EXTERNAL_URL` | `http://192.168.0.50:8000` |
| `ENABLE_EMAIL_SIGNUP` | `false` — quem cria usuário é o administrador |

As duas chaves saem de <https://supabase.com/docs/guides/self-hosting#api-keys>:
cole o `JWT_SECRET` e gere uma `anon` e uma `service_role`. **Nunca reaproveite
as chaves da nuvem.**

```powershell
cd C:\balimax\supabase
docker compose pull
docker compose up -d
docker compose ps
```

Painel local: `http://localhost:8000` (usuário e senha do `DASHBOARD_*`).

---

## 5. Restaurar o banco no servidor

Com `backup/estrutura-<data>.sql` e `backup/completo-<data>.dump` copiados para
o servidor (pendrive ou rede):

```powershell
cd C:\balimax\almox
$env:PGPASSWORD="<POSTGRES_PASSWORD>"
$LOCAL="postgresql://postgres:$env:PGPASSWORD@localhost:5432/postgres"

docker run --rm -i -v C:\balimax\almox\backup:/backup --network host postgres:17-alpine `
  psql $LOCAL -v ON_ERROR_STOP=1 -f /backup/estrutura-<data>.sql

docker run --rm -i -v C:\balimax\almox\backup:/backup --network host postgres:17-alpine `
  pg_restore -d $LOCAL --data-only --disable-triggers /backup/completo-<data>.dump
```

Depois **confira** (não pule esta parte):

```powershell
docker run --rm -i --network host postgres:17-alpine psql $LOCAL -c `
  "select 'materiais' t, count(*) from materiais_equipamentos union all select 'movimentacoes', count(*) from movimentacao_estoque union all select 'pecas', count(*) from material_unidades;"
```

Esperado: **2.224**, **35.277** e **1.596** — os números do dia em que o backup
foi tirado.

### Os usuários não vêm no dump

As contas de acesso ficam no schema `auth`, que o dump acima não leva (ele é só
do `public`). São 10 usuários: o mais simples é **recriá-los** no painel local
(Authentication → Add user) e depois amarrar cada um à sua linha em `usuarios`:

```sql
update public.usuarios set auth_user_id = '<id-do-novo-usuario>' where email = 'fulano@balimax.com.br';
```

O vínculo é por `auth_user_id`; o perfil de acesso (`perfil_acesso_id`) já vem
no dump e continua valendo.

---

## 6. Rodar o sistema

O endereço do banco entra na tela **no momento do build** — não dá para trocar
depois sem rebuildar. Crie `C:\balimax\almox\.env.local`:

```
VITE_SUPABASE_URL=http://192.168.0.50:8000
VITE_SUPABASE_ANON_KEY=<ANON_KEY local>
```

```powershell
cd C:\balimax\almox
npm run build
```

Servir o `dist` com Caddy (HTTPS e o desvio que o sistema precisa):

`C:\balimax\Caddyfile`:

```
192.168.0.50 {
    root * C:/balimax/almox/dist
    encode gzip
    # O sistema vive em /sistema e as rotas internas não existem como arquivo:
    # sem este desvio, atualizar a página em /sistema/materiais-equipamentos dá 404
    @sistema path /sistema /sistema/*
    handle @sistema {
        try_files {path} /sistema/index.html
        file_server
    }
    handle {
        try_files {path} /index.html
        file_server
    }
}
```

```powershell
docker run -d --name balimax-web --restart unless-stopped `
  -p 80:80 -p 443:443 `
  -v C:\balimax\Caddyfile:/etc/caddy/Caddyfile `
  -v C:\balimax\almox\dist:C:/balimax/almox/dist `
  caddy:2-alpine
```

O sistema fica em `http://192.168.0.50/sistema`.

**Atualizar depois de uma mudança no código:**

```powershell
cd C:\balimax\almox
git pull
npm install
npm run build
```

Não precisa reiniciar nada: o Caddy serve os arquivos novos na hora.

### A função de gerenciar usuários

A tela de Configurações → Usuários usa uma Edge Function (`admin-usuarios`).
No Supabase local ela precisa ser publicada na pasta
`C:\balimax\supabase\volumes\functions\admin-usuarios\` e o serviço
reiniciado (`docker compose restart functions`). Enquanto isso não for feito, o
resto do sistema funciona e a criação de usuários sai pelo painel local.

---

## 7. Backup automático (obrigatório na Opção B)

`C:\balimax\backup-diario.ps1`:

```powershell
$data = Get-Date -Format "yyyy-MM-dd-HHmm"
$destino = "C:\balimax\backups"
New-Item -ItemType Directory -Force -Path $destino | Out-Null

docker exec supabase-db pg_dump -U postgres -d postgres --format=custom `
  --file=/tmp/balimax-$data.dump
docker cp supabase-db:/tmp/balimax-$data.dump "$destino\balimax-$data.dump"
docker exec supabase-db rm /tmp/balimax-$data.dump

# 30 dias de histórico
Get-ChildItem $destino -Filter *.dump |
  Where-Object { $_.LastWriteTime -lt (Get-Date).AddDays(-30) } |
  Remove-Item

# Cópia fora da máquina: se o SSD morrer, o backup não pode morrer junto
robocopy $destino "\\nas\backups\almoxarifado" /MIR /R:1 /W:5
```

Agende no **Task Scheduler**: diário, 12h30 e 22h (fora do movimento), com
"Run whether user is logged on or not".

**Teste a restauração uma vez** — em outra máquina ou em outro banco do mesmo
Postgres. Backup que nunca foi restaurado é esperança, não backup.

---

## 8. Acesso de fora, de vez em quando

Em ordem de preferência:

### Cloudflare Tunnel (recomendado)

Não abre porta nenhuma no roteador: o servidor é que faz a conexão de saída.
Dá HTTPS com certificado válido e permite exigir login antes mesmo de chegar ao
sistema (Cloudflare Access, grátis até 50 pessoas).

```powershell
docker run -d --name balimax-tunnel --restart unless-stopped `
  cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <TOKEN>
```

O token sai do painel da Cloudflare (Zero Trust → Networks → Tunnels),
apontando o hostname (ex.: `almox.balimax.com.br`) para `http://192.168.0.50`.

### Tailscale

Se o acesso externo for só para três ou quatro pessoas conhecidas, é mais
simples: instale o Tailscale no servidor e nos celulares/notebooks, e o sistema
fica acessível pelo IP da rede privada. Nada exposto na internet.

### Abrir porta no roteador — evite

Expor o 80/443 do servidor direto na internet significa deixar a tela de login
do almoxarifado aberta para varredura automática o dia inteiro. Se for o único
caminho possível, então no mínimo: HTTPS com certificado válido, porta alta,
`fail2ban`/bloqueio por tentativas e o Windows sempre atualizado.

---

## 9. O que muda no dia a dia

| Hoje (nuvem) | Depois (servidor local) |
|---|---|
| `git push` publica sozinho | `git pull` + `npm run build` no servidor |
| Backup é do Supabase | Backup é a tarefa agendada do item 7 |
| Sem internet, não abre | Funciona na rede local mesmo sem internet |
| Atualização do Postgres é do Supabase | `docker compose pull` de tempos em tempos |
| Acesso de qualquer lugar | Só na rede, salvo o túnel do item 8 |

**Riscos que passam a ser seus:** SSD único sem RAID (um disco morre e o
sistema para até restaurar), queda de energia sem nobreak, e a máquina ficar
anos sem atualização porque "está funcionando". Nenhum deles é motivo para não
fazer — são motivo para o backup do item 7 estar de pé.

---

## 10. Resumo da ordem de execução

1. Pegar a senha do banco e rodar `npm run backup:completo` (aqui, na máquina
   que já conversa com a nuvem).
2. Preparar o servidor: WSL 2, Docker Desktop, Node, Git, IP fixo, nobreak.
3. Subir o Supabase local e trocar **todas** as chaves do `.env`.
4. Restaurar estrutura e dados, e **conferir as contagens**.
5. Recriar os 10 usuários e amarrar pelo `auth_user_id`.
6. `.env.local` com o endereço local, `npm run build`, Caddy no ar.
7. Agendar o backup diário e **testar uma restauração**.
8. Só então, se for o caso, ligar o túnel para acesso externo.
