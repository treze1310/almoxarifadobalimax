# -*- coding: utf-8 -*-
"""Lê o banco exportado do sistema antigo e gera os JSON da carga.

Uso:  python scripts/carga-legado/gerar-dados.py "caminho/Banco_de_Dados_Organizado_Balimax.xlsx"

Não toca no banco: só produz os arquivos em scripts/carga-legado/dados/,
que o importar.mjs envia para o Supabase.
"""
import collections
import json
import os
import sys

import openpyxl

AQUI = os.path.dirname(os.path.abspath(__file__))
DESTINO = os.path.join(AQUI, 'dados')
ORIGEM = sys.argv[1] if len(sys.argv) > 1 else os.path.join(
    os.path.expanduser('~'), 'Downloads', 'Banco_de_Dados_Organizado_Balimax.xlsx')


def consertar(s):
    """Acento duplamente codificado: 'DEPÃ“SITO' -> 'DEPÓSITO'.

    A planilha mistura cp1252 (o U+201C veio do byte 0x93) com bytes crus que
    o cp1252 não define (0x8D), então a reconstrução é byte a byte. Texto já
    correto falha no decode UTF-8 e volta intacto — é o que preserva
    "COMPRESSÃO" e "NÃO", que têm Ã de verdade.
    """
    if not s or not any(c in s for c in ('Ã', 'Â')):
        return s
    bs = bytearray()
    for c in s:
        try:
            bs += c.encode('cp1252')
        except UnicodeEncodeError:
            if ord(c) < 256:
                bs.append(ord(c))
            else:
                return s
    try:
        return bs.decode('utf-8')
    except UnicodeDecodeError:
        return s


def f(v):
    try:
        return float(v or 0)
    except (TypeError, ValueError):
        return 0.0


def data(v):
    v = (v or '').strip()
    if v in ('', 'NULL') or v.startswith('0000'):
        return None
    return v[:10]


def texto(v):
    v = consertar((v or '').strip())
    return v or None


def main():
    wb = openpyxl.load_workbook(ORIGEM, read_only=True, data_only=True)

    def tab(n):
        ws = wb[n]
        rows = ws.iter_rows(values_only=True)
        cab = [str(c) for c in next(rows)]
        return [dict(zip(cab, [('' if c is None else str(c).strip()) for c in r])) for r in rows]

    produtos = {p['id']: p for p in tab('Produtos')}
    patr = tab('Patrimonio')
    marcas = {m['id']: m['marca'] for m in tab('Marcas')}
    cats = {c['id']: c['descricao'] for c in tab('Categorias_Material')}
    locais = {l['id']: l['descricao'] for l in tab('Anexos_Filial')}

    saida = {}

    saida['categorias'] = [{'nome': texto(d), 'descricao': 'Categoria do sistema anterior'}
                           for d in cats.values()]

    usadas = {p['id_marca'] for p in patr if p['id_marca']}
    saida['marcas'] = [{'nome': texto(marcas[m])} for m in sorted(usadas)
                       if m in marcas and texto(marcas[m])]

    saida['localizacoes'] = [{'codigo': 'L' + lid.zfill(2), 'nome': texto(desc),
                              'descricao': 'Importado do sistema anterior'}
                             for lid, desc in sorted(locais.items(), key=lambda x: int(x[0]))]

    # ---------------------------------------------------- materiais por produto
    porprod = collections.defaultdict(list)
    for p in patr:
        porprod[p['id_produto']].append(p)

    itens = []
    for pid, linhas in porprod.items():
        prod = produtos.get(pid)
        if not prod:
            continue
        cat = linhas[0]['categoria']

        # Consumo e EPI usam a quantidade do campo; permanente conta uma
        # unidade por patrimônio disponível, inclusive onde o campo ficou
        # zerado (no sistema antigo a linha é que representa a peça).
        estoque = 0.0
        for l in linhas:
            v = f(l['estoque'])
            if v > 0:
                estoque += v
            elif cat == '1' and l['status'] == 'ESTOQUE':
                estoque += 1

        valores = [f(l['valor']) for l in linhas if f(l['valor']) > 0]
        marca = collections.Counter(l['id_marca'] for l in linhas if l['id_marca']).most_common(1)
        local = collections.Counter(l['localizacao'] for l in linhas if l['localizacao']).most_common(1)
        patrimonios = [l['patrimonio'] for l in linhas]
        series = [l['numserie'] for l in linhas if l['numserie'] not in ('', 'N/C', 'NULL', '0')]
        modelos = {l['modelo'] for l in linhas if l['modelo']}
        validades = [l['validade'] for l in linhas if data(l['validade'])]
        unico = len(patrimonios) == 1

        itens.append({
            'codigo': pid.zfill(5),
            'nome': (texto(prod['descricao']) or 'SEM DESCRIÇÃO')[:255],
            'tipo': 'equipamento' if cat == '1' else 'material',
            'categoria': texto(cats.get(cat)),
            'unidade_medida': texto(prod['unidade']) or 'UN',
            'estoque_atual': int(round(estoque)),
            'estoque_minimo': max((int(f(l['estoquemin'])) for l in linhas), default=0),
            'valor_unitario': max(valores) if valores else None,
            'marca': texto(marcas.get(marca[0][0])) if marca else None,
            'localizacao': ('L' + local[0][0].zfill(2)) if local and local[0][0] else None,
            'is_epi': cat == '3',
            'validade_ca': data(validades[0]) if validades else None,
            'numero_serie': texto(series[0]) if len(series) == 1 else None,
            'codigo_patrimonial': patrimonios[0] if unico else None,
            # Com patrimônio único a etiqueta antiga continua lendo o item
            'codigo_barras': patrimonios[0] if unico else None,
            'modelo': texto(list(modelos)[0]) if len(modelos) == 1 else None,
            'observacoes': ('Patrimônios do sistema anterior: ' + ', '.join(patrimonios))
                           if not unico else None,
            'status': 'ativo',
            'ativo': True,
        })
    saida['materiais'] = itens

    # ----------------------------------------------------------- colaboradores
    saida['colaboradores'] = [{
        'nome': (texto(c['nome']) or 'SEM NOME')[:255],
        'cpf': texto(c['document']),
        'matricula': texto(c['matricula']),
        'cargo': texto(c['cargo']),
        'data_admissao': data(c['admissao']),
        'data_demissao': data(c['demissao']),
        'ativo': data(c['demissao']) is None,
    } for c in tab('Funcionarios')]

    # ------------------------------------------------ fornecedores e centros
    forn = []
    for e in tab('Empresas_2'):
        forn.append({'nome': texto(e['name']), 'cnpj': texto(e['document']),
                     'email': texto(e['email']), 'telefone': texto(e['phone']),
                     'contato': texto(e['responsible']), 'endereco': texto(e['address']),
                     'tipo_fornecimento': texto(e['observation'])})
    for e in tab('Filiais'):
        forn.append({'nome': texto(e['nome']), 'cnpj': texto(e['documento']),
                     'email': texto(e['email']), 'telefone': texto(e['telefone']),
                     'contato': texto(e['responsavel']), 'endereco': texto(e['endereco']),
                     'tipo_fornecimento': 'Importado do sistema anterior'})
    saida['fornecedores'] = [x for x in forn if x['nome']]

    saida['centros_custo'] = [{
        'codigo': s['number'],
        'descricao': (texto(s['service']) or '').replace('\n', ' ').strip() or None,
        'ativo': True,
    } for s in tab('Servicos') if s['number']]

    # ----------------------------------------------- movimentações históricas
    validos = {i['codigo'] for i in itens}
    mov, ignoradas = [], 0
    for s in tab('Saida_Estoque'):
        codigo = (s['material_id'] or '').zfill(5)
        if codigo not in validos:
            ignoradas += 1
            continue
        qtd = max(int(f(s['quantity']) or 1), 1)
        custo = f(s['cost']) or None
        cc = s['cost_center'] or None
        mov.append([codigo, 's', qtd, data(s['departure_date']), custo, cc])

        if data(s['return_date']) and s['return_quantity'] not in ('', 'NULL'):
            devolvido = int(f(s['return_quantity']))
            if devolvido > 0:
                mov.append([codigo, 'e', devolvido, data(s['return_date']), custo, cc])
    saida['movimentacoes'] = [m for m in mov if m[3]]

    os.makedirs(DESTINO, exist_ok=True)
    for nome, dados in saida.items():
        caminho = os.path.join(DESTINO, f'{nome}.json')
        with open(caminho, 'w', encoding='utf-8') as fh:
            json.dump(dados, fh, ensure_ascii=False)
        print(f'  {nome}: {len(dados)} registros ({os.path.getsize(caminho)/1024:.0f} kB)')

    print(f'\nmovimentações ignoradas (produto fora do cadastro): {ignoradas}')
    print(f'itens com estoque: {sum(1 for i in itens if i["estoque_atual"] > 0)} '
          f'| unidades: {sum(i["estoque_atual"] for i in itens)}')


if __name__ == '__main__':
    main()
