# Cronológico de Orçamentos → centros de custo

Traz as propostas comerciais da planilha do Planejamento para o cadastro de
centros de custo do almoxarifado.

```bash
# 1. Lê a planilha da rede e gera propostas.json (não toca no banco)
python scripts/cronologico-orcamentos/extrair.py

# 2. Mostra o que faria, sem gravar
node scripts/cronologico-orcamentos/importar.mjs

# 3. Aplica
node scripts/cronologico-orcamentos/importar.mjs --gravar
```

A planilha fica em
`\servidor\Balimax\...\00 - CRONOLÓGICO DE ORÇAMENTOS\Cronológico de Orçamentos.xlsx`
— passe outro caminho como argumento se ela mudar de lugar.

## Regras

- **Só de 2024 em diante.** A planilha começa em 2017 e a maior parte são
  orçamentos que nunca viraram obra; trazer tudo encheria o seletor que o
  almoxarife usa todo dia.
- **Não duplica e não sobrescreve.** Código que já existe é apenas enriquecido,
  e só nos campos vazios — a descrição do cadastro pode ter sido ajustada à mão
  e vale mais que a da planilha.
- **Marca a origem.** Quem veio daqui fica com `origem = 'cronologico_orcamentos'`,
  então dá para separar do que foi cadastrado no sistema e desfazer se precisar.
- **Idempotente.** Rodar de novo só acrescenta o que a planilha ganhou desde a
  última vez.

## Detalhes que custaram para descobrir

- O número da proposta **carrega a data**: `2601131544` = 13/01/2026, sequência
  1544. É o mesmo padrão dos códigos que já existiam no sistema. Isso serve de
  reserva para as 83 linhas em que a coluna DATA ficou vazia — a regra confere
  em 93% dos casos onde dá para comparar.
- As linhas com número de 3 dígitos (`614`, `685`) são anotações da planilha,
  não propostas, e são descartadas.
- A coluna EMPRESA casa com o cadastro de empresas em 313 dos 333 nomes, então
  o vínculo é feito por nome normalizado (sem acento, sem pontuação).
