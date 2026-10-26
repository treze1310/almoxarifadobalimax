# Rodar o almoxarifado no servidor da Balimax

Guia para colocar o sistema no **PowerEdge T110 II** (Xeon E3-1200, 32 GB ECC,
SSD) com **Ubuntu Server 24.04 LTS**, banco na própria máquina, e acesso de fora
quando precisar.

O hardware é folgado para o tamanho do sistema: o banco inteiro tem **41 mil
linhas** (2.224 materiais, 35.277 movimentações, 1.596 peças, 412
colaboradores) e ocupa poucas centenas de MB. Sem interface gráfica, sobram
praticamente os 32 GB para o Postgres e os contêineres.

> **Por que Ubuntu e não Windows 11:** o Xeon E3-1200 v1/v2 (2011) não está na
> lista de processadores suportados pelo Windows 11 e a máquina não tem TPM 2.0
> — a instalação exigiria burlar o verificador, sem garantia de atualização. A
> Dell nunca publicou drivers do T110 II além do Windows Server 2012 R2. No
> Ubuntu o Docker roda nativo, sem a camada do WSL entre o Postgres e o disco.

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

**Recomendação:** Opção B, por causa da internet, **com duas condições**: o
espelho de disco do item 3 e o backup automático do item 7 precisam estar
funcionando e **testados** antes de desligar a nuvem. Banco local sem backup
testado é esperança, não backup.

Dá para começar pela A (meia hora de trabalho) e migrar para a B depois; o
caminho é o mesmo.

---

## 2. Backup do banco — o que já existe

Dois comandos no projeto (rodados na máquina que hoje conversa com a nuvem):

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
colunas geradas, índices, funções, gatilhos e as políticas de acesso). Precisa
de uma linha em `.env.carga` (arquivo que não vai para o git):

```
SUPABASE_DB_URL=postgresql://postgres.SEUPROJETO:SENHA@aws-0-sa-east-1.pooler.supabase.com:5432/postgres
```

A string sai do painel do Supabase em **Connect → Session pooler** (porta
5432). Se ninguém souber a senha, dá para trocar em **Settings → Database →
Reset database password** — isso **não** invalida as chaves de API que o
sistema usa hoje.

> **Por que o JSON não basta para mudar de servidor:** ele leva as linhas, não a
> estrutura. Restaurar só os dados num banco vazio dá um banco sem as regras de
> acesso — qualquer usuário autenticado enxergaria e alteraria tudo.

> **Ponto de atenção:** as mudanças de estrutura dos últimos dias foram
> aplicadas direto no banco da nuvem; a pasta `supabase/migrations` está vazia.
> Hoje **a estrutura só existe dentro do banco**. Guarde o
> `estrutura-<data>.sql` junto dos backups — é o que permite recriar o sistema
> do zero.

---

## 3. Instalar e preparar o servidor

### 3.1 Antes de instalar

1. **Atualize BIOS e iDRAC** pelo site da Dell (ainda disponíveis para o T110
   II). Com **iDRAC6 Enterprise**, você ganha console remoto mesmo com o
   sistema fora do ar — num servidor sem monitor, vale muito.
2. **Discos:** se a máquina tiver a controladora **PERC S100/S300**, deixe-a de
   lado — é RAID por software ruim. Ponha os discos em **AHCI** no BIOS e faça
   o espelho pelo Linux.
3. **Compre um segundo SSD igual.** O T110 II tem 4 baias; espelhar custa pouco
   e é a diferença entre "o disco morreu, trocamos e seguimos" e "o disco
   morreu, restauro o backup de ontem e perco o dia".

### 3.2 Instalação

Baixe o **Ubuntu Server 24.04 LTS** (não o Desktop), grave num pendrive com
Rufus ou balenaEtcher e instale:

- **Partição:** escolha *Custom storage layout* e monte os dois SSDs em **RAID 1
  (mdadm)**: um `/boot/efi` de 512 MB, um `/` com o resto. O instalador do
  Ubuntu faz isso na própria tela.
- **Nome da máquina:** `almox-balimax`.
- **Usuário:** o seu, com senha forte. Marque **Install OpenSSH server**.
- **Snaps sugeridos:** não marque nenhum (o Docker vem do repositório oficial,
  não do snap).

### 3.3 Depois de instalar

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg git unattended-upgrades nut-client
```

**IP fixo** (troque pela sua rede e pela sua interface — `ip a` mostra o nome):

```bash
sudo nano /etc/netplan/50-almox.yaml
```

```yaml
network:
  version: 2
  ethernets:
    eno1:
      dhcp4: false
      addresses: [192.168.0.50/24]
      routes:
        - to: default
          via: 192.168.0.1
      nameservers:
        addresses: [1.1.1.1, 8.8.8.8]
```

```bash
sudo chmod 600 /etc/netplan/50-almox.yaml
sudo netplan apply
```

**Docker** (repositório oficial, não o do Ubuntu):

```bash
sudo install -m 0755 -d /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo usermod -aG docker $USER   # saia e entre de novo para valer
```

**Node.js 24** (para o build da tela):

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs
```

**Atualização de segurança automática**, sem reinício surpresa:

```bash
sudo dpkg-reconfigure --priority=low unattended-upgrades
```

**Nobreak:** com o cabo USB ligado, configure o `nut` para desligar sozinho
quando a bateria acabar (`/etc/nut/`). Postgres em queda de energia sem nobreak
é o caminho mais curto para corromper dados.

**Projeto:**

```bash
sudo mkdir -p /opt/balimax && sudo chown $USER:$USER /opt/balimax
git clone <url-do-repositorio> /opt/balimax/almox
cd /opt/balimax/almox && npm install
```

---

## 4. Subir o Supabase local (Opção B)

```bash
git clone --depth 1 https://github.com/supabase/supabase /tmp/supabase-src
cp -r /tmp/supabase-src/docker /opt/balimax/supabase
cd /opt/balimax/supabase
cp .env.example .env
```

Edite o `.env` e troque **todos** os valores de exemplo:

| Variável | O que pôr |
|---|---|
| `POSTGRES_PASSWORD` | senha longa, só para o banco |
| `JWT_SECRET` | 40+ caracteres aleatórios |
| `ANON_KEY` / `SERVICE_ROLE_KEY` | geradas a partir do `JWT_SECRET` (ver abaixo) |
| `DASHBOARD_USERNAME` / `DASHBOARD_PASSWORD` | acesso ao painel local |
| `SITE_URL` | `http://192.168.0.50` |
| `API_EXTERNAL_URL` | `http://192.168.0.50:8000` |
| `ENABLE_EMAIL_SIGNUP` | `false` — quem cria usuário é o administrador |

As duas chaves saem de <https://supabase.com/docs/guides/self-hosting#api-keys>:
cole o `JWT_SECRET` e gere uma `anon` e uma `service_role`. **Nunca reaproveite
as chaves da nuvem.**

```bash
chmod 600 .env
docker compose pull
docker compose up -d
docker compose ps
```

Painel local: `http://192.168.0.50:8000` (usuário e senha do `DASHBOARD_*`).

Os contêineres já sobem sozinhos no boot (`restart: unless-stopped` no
compose), desde que o Docker esteja habilitado:

```bash
sudo systemctl enable docker
```

---

## 5. Restaurar o banco no servidor

Copie `backup/estrutura-<data>.sql` e `backup/completo-<data>.dump` para
`/opt/balimax/almox/backup/` (por `scp`, do seu notebook):

```bash
scp backup/estrutura-*.sql backup/completo-*.dump usuario@192.168.0.50:/opt/balimax/almox/backup/
```

No servidor:

```bash
cd /opt/balimax/almox
LOCAL="postgresql://postgres:<POSTGRES_PASSWORD>@localhost:5432/postgres"

docker run --rm -i --network host -v /opt/balimax/almox/backup:/backup postgres:17-alpine \
  psql "$LOCAL" -v ON_ERROR_STOP=1 -f /backup/estrutura-<data>.sql

docker run --rm -i --network host -v /opt/balimax/almox/backup:/backup postgres:17-alpine \
  pg_restore -d "$LOCAL" --data-only --disable-triggers /backup/completo-<data>.dump
```

Depois **confira** (não pule esta parte):

```bash
docker run --rm -i --network host postgres:17-alpine psql "$LOCAL" -c \
  "select 'materiais' t, count(*) from materiais_equipamentos
   union all select 'movimentacoes', count(*) from movimentacao_estoque
   union all select 'pecas', count(*) from material_unidades;"
```

Esperado: **2.224**, **35.277** e **1.596** — os números do dia em que o backup
foi tirado.

### Os usuários não vêm no dump

As contas de acesso ficam no schema `auth`, que o dump acima não leva (ele é só
do `public`). São 10 usuários: recrie-os no painel local (Authentication → Add
user) e amarre cada um à sua linha em `usuarios`:

```sql
update public.usuarios set auth_user_id = '<id-do-novo-usuario>'
 where email = 'fulano@balimax.com.br';
```

O vínculo é por `auth_user_id`; o perfil de acesso (`perfil_acesso_id`) já vem
no dump e continua valendo.

---

## 6. Rodar o sistema

O endereço do banco entra na tela **no momento do build** — não dá para trocar
depois sem rebuildar. Crie `/opt/balimax/almox/.env.local`:

```
VITE_SUPABASE_URL=http://192.168.0.50:8000
VITE_SUPABASE_ANON_KEY=<ANON_KEY local>
```

```bash
cd /opt/balimax/almox
npm run build
```

Servir o `dist` com Caddy:

`/opt/balimax/Caddyfile`:

```
192.168.0.50 {
    root * /opt/balimax/almox/dist
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

```bash
docker run -d --name balimax-web --restart unless-stopped \
  -p 80:80 -p 443:443 \
  -v /opt/balimax/Caddyfile:/etc/caddy/Caddyfile:ro \
  -v /opt/balimax/almox/dist:/opt/balimax/almox/dist:ro \
  caddy:2-alpine
```

O sistema fica em `http://192.168.0.50/sistema`.

**Atualizar depois de uma mudança no código:**

```bash
cd /opt/balimax/almox && git pull && npm install && npm run build
```

Não precisa reiniciar nada: o Caddy serve os arquivos novos na hora.

### A função de gerenciar usuários

A tela de Configurações → Usuários usa uma Edge Function (`admin-usuarios`).
No Supabase local ela precisa ser copiada para
`/opt/balimax/supabase/volumes/functions/admin-usuarios/` e o serviço
reiniciado (`docker compose restart functions`). Enquanto isso não for feito, o
resto do sistema funciona e a criação de usuários sai pelo painel local.

---

## 7. Backup automático (obrigatório na Opção B)

`/opt/balimax/backup-diario.sh`:

```bash
#!/usr/bin/env bash
set -euo pipefail

DATA=$(date +%Y-%m-%d-%H%M)
DESTINO=/opt/balimax/backups
mkdir -p "$DESTINO"

docker exec supabase-db pg_dump -U postgres -d postgres --format=custom \
  --file="/tmp/balimax-$DATA.dump"
docker cp "supabase-db:/tmp/balimax-$DATA.dump" "$DESTINO/balimax-$DATA.dump"
docker exec supabase-db rm "/tmp/balimax-$DATA.dump"

# 30 dias de histórico
find "$DESTINO" -name '*.dump' -mtime +30 -delete

# Cópia fora da máquina: se o SSD morrer, o backup não pode morrer junto
rsync -a --delete "$DESTINO/" /mnt/nas/almoxarifado/ 2>>/var/log/balimax-backup.log \
  || echo "$(date -Is) rsync falhou" >> /var/log/balimax-backup.log
```

```bash
chmod +x /opt/balimax/backup-diario.sh
sudo crontab -e
```

```
30 12 * * * /opt/balimax/backup-diario.sh >> /var/log/balimax-backup.log 2>&1
0 22 * * * /opt/balimax/backup-diario.sh >> /var/log/balimax-backup.log 2>&1
```

Duas vezes por dia, fora do movimento. Monte o compartilhamento da rede em
`/mnt/nas` no `/etc/fstab` para o `rsync` ter para onde copiar.

**Teste a restauração uma vez** — crie um banco vazio e restaure nele:

```bash
docker exec supabase-db createdb -U postgres teste_restauracao
docker exec supabase-db pg_restore -U postgres -d teste_restauracao /tmp/balimax-<data>.dump
docker exec supabase-db psql -U postgres -d teste_restauracao -c "select count(*) from materiais_equipamentos;"
docker exec supabase-db dropdb -U postgres teste_restauracao
```

---

## 8. Acesso de fora, de vez em quando

Em ordem de preferência:

### Cloudflare Tunnel (recomendado)

Não abre porta nenhuma no roteador: o servidor é que faz a conexão de saída.
Dá HTTPS com certificado válido e permite exigir login antes mesmo de chegar ao
sistema (Cloudflare Access, grátis até 50 pessoas).

```bash
docker run -d --name balimax-tunnel --restart unless-stopped \
  cloudflare/cloudflared:latest tunnel --no-autoupdate run --token <TOKEN>
```

O token sai do painel da Cloudflare (Zero Trust → Networks → Tunnels),
apontando o hostname (ex.: `almox.balimax.com.br`) para `http://192.168.0.50`.

### Tailscale

Se o acesso externo for só para três ou quatro pessoas conhecidas, é mais
simples:

```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

Instale o Tailscale também nos celulares/notebooks: o sistema fica acessível
pelo IP da rede privada, sem nada exposto na internet.

### Abrir porta no roteador — evite

Expor o 80/443 do servidor direto na internet significa deixar a tela de login
do almoxarifado aberta para varredura automática o dia inteiro. Se for o único
caminho, no mínimo: HTTPS com certificado válido, `ufw` liberando só o
necessário, `fail2ban` e o sistema sempre atualizado.

---

## 9. O que muda no dia a dia

| Hoje (nuvem) | Depois (servidor local) |
|---|---|
| `git push` publica sozinho | `git pull` + `npm run build` no servidor |
| Backup é do Supabase | Backup é o `cron` do item 7 |
| Sem internet, não abre | Funciona na rede local mesmo sem internet |
| Atualização do Postgres é do Supabase | `docker compose pull` de tempos em tempos |
| Acesso de qualquer lugar | Só na rede, salvo o túnel do item 8 |
| Ninguém administra servidor | Alguém precisa olhar disco, log e backup |

**Riscos que passam a ser seus:** disco (resolvido pelo RAID 1 do item 3),
energia (nobreak), e a máquina ficar anos sem atualização porque "está
funcionando". Nenhum é motivo para não fazer — são motivo para os itens 3 e 7
estarem de pé.

---

## 10. Resumo da ordem de execução

1. Pegar a senha do banco e rodar `npm run backup:completo` (na máquina que já
   conversa com a nuvem).
2. Atualizar BIOS/iDRAC, pôr os discos em AHCI, comprar o segundo SSD.
3. Instalar o Ubuntu Server 24.04 com **RAID 1**, SSH e IP fixo.
4. Docker, Node 24, `unattended-upgrades`, nobreak.
5. Subir o Supabase local trocando **todas** as chaves do `.env`.
6. Restaurar estrutura e dados, e **conferir as contagens**.
7. Recriar os 10 usuários e amarrar pelo `auth_user_id`.
8. `.env.local` com o endereço local, `npm run build`, Caddy no ar.
9. Agendar o backup e **testar uma restauração**.
10. Só então, se for o caso, ligar o túnel para acesso externo.
