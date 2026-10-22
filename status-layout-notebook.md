# Continuação dos ajustes de layout — 22/10/2026

## Alterações implementadas

- PageHeader: quebra de linha entre título e ações, ações sem quebra interna e breadcrumb flexível. Aplicado em Importação de NF-e, Configurações, Cadastro de Localização e Mapa Visual. Relatórios já usava o componente.
- Dashboard: gráfico com 220px em telas de até 800px de altura.
- Romaneios: rótulos sem quebra e valores com espaço para acomodação no detalhe. Cards de devolução com metadados em quatro colunas, botões lado a lado e espaçamento reduzido.
- Materiais: formulário em duas colunas, controles compactos e seções condicionais em largura total. Novo, editar e clonar recebem os botões em rodapé fora da rolagem, mantendo o vínculo com o formulário e seu estado de envio. Ajustado contraste de Item Alugado no tema escuro.
- EPI: subtítulos compactos e modal com corpo rolável, Cancelar e Atribuir alinhados no rodapé.
- Localização: cadastro usa DataTable com busca, paginação, colunas e ações de editar/excluir. Mapa tem painel lateral independente de 256px para as localizações não posicionadas, com rolagem própria e nomes completos em tooltip.
- Nova solicitação: data, prazo e responsável na mesma linha; tabela com distribuição explícita de larguras, reservando espaço para observações.
- Detalhe de solicitação: cabeçalho e ações fora do corpo rolável; Cancelar solicitação e Excluir ficam em Mais ações, preservando permissões e confirmações. Removido UUID da apresentação.
- Configurações: remover logo dentro do avatar, sem bloquear o clique; títulos menores, nomes truncados com tooltip e selects com alinhamento à esquerda.
- Ícone de edição de Centros de Custo alinhado aos demais cadastros; badge de notificações reposicionado.
- Produção: removida divisão manual de React/Radix/helpers que produzia falha de inicialização. O empacotador passa a organizar dependências compartilhadas automaticamente; módulos de página continuam importados sob demanda.

## Validação realizada

- 18 rotas do menu percorridas com login real de teste em 1366×768 e 1536×864: medições sem overflow horizontal em contêineres roláveis do conteúdo e documento com dimensões iguais às do viewport.
- Conferidos visualmente: novo material, atribuição de EPI, nova solicitação, detalhe de solicitação, menu Mais ações e mapa com 26 localizações não posicionadas.
- Conferido carregamento do login e dashboard autenticado na versão de produção após correção do empacotamento.
- Nenhum cadastro foi salvo, excluído ou aprovado durante a conferência.
- Typecheck, build e 107 testes automatizados passaram. Os testes automatizados existentes não substituem a conferência visual.

## Limites e pontos ainda não encerrados

- Zoom de 90% ainda não validado. A retomada da aba de conferência foi bloqueada pela política do navegador ao final da sessão.
- Não foi exercitada toda combinação de modal, aba e campos condicionais nas duas resoluções.
- O detalhe da solicitação deixou de mostrar UUID; exibir o código do material ainda exige que ele esteja disponível no payload atual. Não foram alteradas chamadas ao Supabase.
- Cards de devolução foram compactados, mas não há medição de altura com a variedade completa de dados; textos longos podem aumentar a altura.
- Este registro descreve a continuação realizada, sem certificar retrospectivamente todos os itens do documento original.
