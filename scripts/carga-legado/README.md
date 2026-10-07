# Carga do sistema antigo

Traz o banco do sistema que está sendo substituído (planilha
`Banco_de_Dados_Organizado_Balimax.xlsx`) para o Supabase.

## Como rodar

```bash
# 1. Gera os JSON a partir da planilha (não toca no banco)
python scripts/carga-legado/gerar-dados.py "C:/Users/Safetec/Downloads/Banco_de_Dados_Organizado_Balimax.xlsx"

# 2. Cole a chave service_role em .env.carga e rode a carga
node scripts/carga-legado/importar.mjs
```

`--sem-historico` pula as 35 mil movimentações e carrega só o cadastro.

A carga é idempotente: cada etapa confere o que já existe antes de inserir,
então rodar de novo depois de uma falha no meio não duplica nada.

## O que vem de onde

| planilha | vira | regra |
|---|---|---|
| Produtos + Patrimonio | materiais_equipamentos | um item por **produto**, somando os patrimônios |
| Marcas | marcas | só as 463 em uso |
| Categorias_Material | categorias | Permanente, Consumo, EPI/EPC, Alugado |
| Anexos_Filial | localizacao | as 24 posições do almoxarifado |
| Funcionarios | colaboradores | todos; quem tem demissão entra inativo |
| Servicos | centros_custo | completa o que já existe, casando por código |
| Empresas_2 + Filiais | fornecedores | completa o que já existe, casando por nome ou CNPJ |
| Saida_Estoque | movimentacao_estoque | saídas e devoluções, como histórico |

## Decisões que valem saber

- **Estoque.** Consumo e EPI usam a quantidade do campo `estoque`. Permanente
  conta uma unidade por patrimônio com status ESTOQUE, inclusive onde o campo
  ficou zerado — no sistema antigo é a linha que representa a peça.
- **Código do item.** É o id do produto no sistema antigo, com 5 dígitos
  (`00088`). Quando o produto tem um patrimônio só, esse número vai para
  `codigo_barras`, então a etiqueta antiga continua lendo o item; quando tem
  vários, eles ficam listados nas observações.
- **Movimentações históricas.** O saldo da época não existe na exportação,
  então `quantidade_anterior` e `quantidade_atual` ficam em zero e o motivo é
  "Importado do sistema anterior".
- **Usuários não vêm.** As senhas do sistema antigo são MD5, que o Supabase
  Auth não aceita — e não deveriam mesmo voltar a circular. Os acessos são
  recriados em Configurações.
- **Acentos.** Parte da exportação está com acento duplamente codificado
  ("DEPÃ“SITO"). O conserto é byte a byte, misturando cp1252 e latin-1, e
  deixa intacto o texto que já estava certo ("COMPRESSÃO", "NÃO").
