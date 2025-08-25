interface NCMResult {
  codigo: string
  descricao: string
  confianca: number
}

export async function buscarNCMPorDescricao(descricao: string): Promise<NCMResult[]> {
  if (!descricao || descricao.trim().length < 3) {
    return []
  }

  // Simulação de busca de NCM baseada na descrição
  // Em um sistema real, isso seria uma chamada para uma API de NCM
  const ncmDatabase = [
    { codigo: '8205.40.00', descricao: 'Chaves de fenda, chaves inglesas e outras ferramentas manuais', keywords: ['chave', 'fenda', 'inglesa', 'ferramenta', 'manual'] },
    { codigo: '8467.21.00', descricao: 'Furadeiras elétricas', keywords: ['furadeira', 'elétrica', 'perfuração'] },
    { codigo: '3926.20.00', descricao: 'Vestuário e seus acessórios (incluindo luvas)', keywords: ['luva', 'vestuário', 'proteção', 'epi'] },
    { codigo: '6506.10.00', descricao: 'Capacetes de segurança', keywords: ['capacete', 'segurança', 'proteção', 'epi'] },
    { codigo: '9020.00.10', descricao: 'Máscaras contra gases e máscaras de proteção', keywords: ['máscara', 'proteção', 'respiratória', 'epi'] },
    { codigo: '8205.30.00', descricao: 'Plainas, formões, goivas e ferramentas cortantes similares para trabalhar madeira', keywords: ['plaina', 'formão', 'goiva', 'madeira'] },
    { codigo: '8466.93.90', descricao: 'Outras partes e acessórios de máquinas-ferramentas', keywords: ['parte', 'acessório', 'máquina', 'ferramenta'] },
    { codigo: '7318.15.00', descricao: 'Parafusos e porcas, de ferro fundido, ferro ou aço', keywords: ['parafuso', 'porca', 'ferro', 'aço'] },
    { codigo: '8302.10.00', descricao: 'Dobradiças', keywords: ['dobradiça', 'porta', 'janela'] },
    { codigo: '8544.42.00', descricao: 'Outros condutores elétricos para tensão superior a 80 V', keywords: ['cabo', 'condutor', 'elétrico', 'fio'] },
  ]

  const descricaoLower = descricao.toLowerCase()
  const palavras = descricaoLower.split(/\s+/).filter(p => p.length > 2)

  const resultados = ncmDatabase.map(item => {
    let pontuacao = 0

    // Busca por palavras-chave
    palavras.forEach(palavra => {
      item.keywords.forEach(keyword => {
        if (keyword.includes(palavra) || palavra.includes(keyword)) {
          pontuacao += 10
        }
      })
    })

    // Busca na descrição do NCM
    palavras.forEach(palavra => {
      if (item.descricao.toLowerCase().includes(palavra)) {
        pontuacao += 5
      }
    })

    return {
      codigo: item.codigo,
      descricao: item.descricao,
      confianca: Math.min(pontuacao, 100)
    }
  })

  return resultados
    .filter(r => r.confianca > 0)
    .sort((a, b) => b.confianca - a.confianca)
    .slice(0, 5)
}