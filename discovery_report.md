=== FORENSIC AUDIT - SISTEMA DE ALMOXARIFADO ===
Timestamp: Mon Aug 25 10:04:53 -03 2025

## 1. CONTAINERS/SERVIÇOS ATIVOS:
/bin/bash: line 1: docker: command not found
Docker não encontrado ou não há containers rodando

## 2. PROCESSOS PRINCIPAIS:
root         233  0.0  0.1 107028 22144 ?        Ssl  08:45   0:00 /usr/bin/python3 /usr/share/unattended-upgrades/unattended-upgrade-shutdown --wait-for-signal
safetec     3118  0.0  0.7 32667904 88676 pts/0  Sl+  09:49   0:00 node /home/safetec/.npm/_npx/53c4795544aaa350/node_modules/.bin/mcp-server-supabase --project-ref=emcyvosymdelzxrokdvf

## 3. PORTAS ABERTAS:
Active Internet connections (only servers)
Proto Recv-Q Send-Q Local Address           Foreign Address         State      
tcp        0      0 10.255.255.254:53       0.0.0.0:*               LISTEN     
tcp        0      0 127.0.0.54:53           0.0.0.0:*               LISTEN     
tcp        0      0 127.0.0.53:53           0.0.0.0:*               LISTEN     
udp        0      0 127.0.0.54:53           0.0.0.0:*                          
udp        0      0 127.0.0.53:53           0.0.0.0:*                          
udp        0      0 10.255.255.254:53       0.0.0.0:*                          
udp        0      0 127.0.0.1:323           0.0.0.0:*                          
udp6       0      0 ::1:323                 :::*                               

## 4. CONFIGURAÇÃO DOCKER:
Arquivo docker-compose.yml NÃO encontrado

## 5. ESTRUTURA DE DIRETÓRIOS:
.
..
.claude
.git
dist
migrations
node_modules
public
src
tests

## 6. IDENTIFICAÇÃO DO TIPO DE PROJETO:
✓ Node.js project detected
✓ Frontend SPA detected

## 7. FRAMEWORKS DETECTADOS:

## 8. ANÁLISE DE ARQUIVOS POR EXTENSÃO:
    142 tsx
     39 ts
      9 json
      8 js
      5 sql
      5 png
      5 md
      3 html
      3 css
      2 xml
      2 svg
      2 jpg
      2 ico
      1 yaml
      1 xlsx
      1 txt
      1 prettierrc
      1 prettierignore
      1 pdf
      1 npmrc

## 9. TECNOLOGIA DESCOBERTA PELO package.json:
- React 19.1.1 (Frontend Framework)
- Vite (Build Tool)
- TypeScript 5.8.3 (Language)
- Tailwind CSS (Styling)
- Supabase (Backend/Database)
- Radix UI (Component Library)

## 10. ARQUIVOS DE MIGRAÇÃO ENCONTRADOS:
total 8
drwxrwxrwx 1 safetec safetec 4096 Aug 11 15:44 .
drwxrwxrwx 1 safetec safetec 4096 Aug 25 10:05 ..
-rwxrwxrwx 1 safetec safetec 3656 Aug 11 13:52 001_create_users_and_profiles.sql
-rwxrwxrwx 1 safetec safetec 2798 Aug 12 11:07 002_update_material_equipamento_form.sql
