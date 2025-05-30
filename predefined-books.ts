import { PredefinedBook } from './types';

// Definição dos livros jurídicos predefinidos com caminhos corrigidos
export const PREDEFINED_BOOKS: PredefinedBook[] = [
  {
    id: 'cf88',
    name: 'Constituição Federal de 1988',
    folderName: 'CF88',
    fileName: 'constituicao_federal_1988.txt',
    description: 'Constituição da República Federativa do Brasil de 1988'
  },
  {
    id: 'cpc',
    name: 'Código de Processo Civil (Lei nº 13.105/2015)',
    folderName: 'CPC17',
    fileName: 'CPC_normas_correlatas_17ed.txt', // Alterado para usar o arquivo .txt diretamente
    description: 'Código de Processo Civil e normas correlatas'
  },
  {
    id: 'cpp',
    name: 'Código de Processo Penal (Decreto-Lei nº 3.689/1941)',
    folderName: 'CPP7',
    fileName: 'CPP_normas_correlatas_7ed.txt',
    description: 'Código de Processo Penal e normas correlatas'
  },
  {
    id: 'cp',
    name: 'Código Penal (Decreto-Lei nº 2.848/1940)',
    folderName: 'CP8',
    fileName: 'CP_normas_correlatas_8ed.txt',
    description: 'Código Penal e normas correlatas'
  },
  {
    id: 'clt',
    name: 'Consolidação das Leis do Trabalho (Decreto-Lei nº 5.452/1943)',
    folderName: 'CLT7',
    fileName: 'CLT_normas_correlatas_7ed.txt',
    description: 'Consolidação das Leis do Trabalho e normas correlatas'
  },
  {
    id: 'cdc',
    name: 'Código de Defesa do Consumidor (Lei nº 8.078/1990)',
    folderName: 'CDC',
    fileName: 'cdc-portugues-2013.txt', // Usando o arquivo .txt disponível
    description: 'Código de Defesa do Consumidor e normas correlatas'
  }
];
