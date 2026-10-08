# -*- coding: utf-8 -*-
"""Lê o Cronológico de Orçamentos e gera propostas.json.

    python scripts/cronologico-orcamentos/extrair.py "\\servidor\...\Cronológico de Orçamentos.xlsx"

Não toca no banco. O arquivo fica na rede, então ele é copiado para uma pasta
temporária antes de abrir — o openpyxl não lê caminho UNC direto.
"""
import datetime
import json
import os
import shutil
import sys
import tempfile

import openpyxl

AQUI = os.path.dirname(os.path.abspath(__file__))
PADRAO = (r"\servidor\Balimax\Balimax Engenharia\09 - Planejamento\00 - Matriz"
          r"\01 - Orçamentos\00 - CRONOLÓGICO DE ORÇAMENTOS\Cronológico de Orçamentos.xlsx")


def main():
    origem = sys.argv[1] if len(sys.argv) > 1 else PADRAO
    local = os.path.join(tempfile.gettempdir(), 'cronologico.xlsx')
    shutil.copy(origem, local)

    ws = openpyxl.load_workbook(local, read_only=True, data_only=True)['Planilha1']
    linhas = list(ws.iter_rows(values_only=True))

    # O cabeçalho real está na linha 5; acima só título e linhas em branco
    cabecalho = [str(c).strip() if c else '' for c in linhas[4]]
    registros = [dict(zip(cabecalho, r)) for r in linhas[5:] if r and r[0]]

    propostas = []
    descartados = 0
    for r in registros:
        numero = str(r['NÚMERO']).strip()
        # Números curtos são anotações da planilha ("614", "DIEGO"), não propostas
        if len(numero) < 9 or not numero.isdigit():
            descartados += 1
            continue
        data = r.get('DATA')
        propostas.append({
            'numero': numero,
            'data': data.strftime('%Y-%m-%d') if isinstance(data, datetime.datetime) else None,
            'empresa': str(r['EMPRESA']).strip() if r.get('EMPRESA') else None,
            'servico': str(r['SERVIÇO']).strip() if r.get('SERVIÇO') else None,
            'tipo': str(r['TIPO']).strip() if r.get('TIPO') else None,
            'revisao': str(r['REVISÃO']).strip() if r.get('REVISÃO') else None,
        })

    destino = os.path.join(AQUI, 'propostas.json')
    with open(destino, 'w', encoding='utf-8') as fh:
        json.dump(propostas, fh, ensure_ascii=False)

    print(f'propostas: {len(propostas)} (descartadas {descartados} linhas sem número de proposta)')
    print(f'sem data na planilha: {sum(1 for p in propostas if not p["data"])}')
    print(f'arquivo: {destino}')


if __name__ == '__main__':
    main()
