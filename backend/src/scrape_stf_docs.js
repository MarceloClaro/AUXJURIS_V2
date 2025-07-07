const axios = require('axios');
const fs = require('fs');
const path = require('path');
const pdfParse = require('pdf-parse');
const { JSDOM } = require('jsdom');

const MAX_PAGES = 10; // Defina o número máximo de páginas a percorrer

const DOC_TYPES = [
  {
    name: 'acordaos',
    url: 'https://portal.stf.jus.br/jurisprudencia/acordaos.asp',
    dest: '../../public/books/STF/acordaos/',
    paginated: true,
  },
  {
    name: 'sumulas',
    url: 'https://portal.stf.jus.br/jurisprudencia/sumulas.asp',
    dest: '../../public/books/STF/sumulas/',
    paginated: false,
  },
  // Adicione outros tipos aqui, ex: decisões monocráticas, votos, etc.
];

async function downloadPDF(url, dest) {
  try {
    const response = await axios.get(url, { responseType: 'arraybuffer' });
    fs.writeFileSync(dest, response.data);
  } catch (err) {
    console.error(`[ERRO] Falha ao baixar PDF ${url}:`, err.message);
    throw err;
  }
}

async function extractTextFromPDF(pdfPath) {
  try {
    const dataBuffer = fs.readFileSync(pdfPath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } catch (err) {
    console.error(`[ERRO] Falha ao extrair texto de ${pdfPath}:`, err.message);
    throw err;
  }
}

async function getLinksFromPage(type, pageUrl) {
  try {
    const { data: html } = await axios.get(pageUrl);
    const dom = new JSDOM(html);
    return [...dom.window.document.querySelectorAll('a')]
      .map(a => a.href)
      .filter(href => href.endsWith('.pdf') && href.startsWith('http'));
  } catch (err) {
    console.error(`[ERRO] Falha ao buscar links na página ${pageUrl}:`, err.message);
    return [];
  }
}

async function scrapeAndSave(type) {
  const DEST_DIR = path.join(__dirname, type.dest);
  if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

  let links = [];
  if (type.paginated) {
    for (let page = 1; page <= MAX_PAGES; page++) {
      const pageUrl = `${type.url}?pagina=${page}`;
      console.log(`[${type.name}] Buscando página: ${pageUrl}`);
      const pageLinks = await getLinksFromPage(type, pageUrl);
      if (pageLinks.length === 0) {
        console.log(`[${type.name}] Nenhum PDF encontrado na página ${page}. Parando a paginação.`);
        break;
      }
      links.push(...pageLinks);
    }
  } else {
    links = await getLinksFromPage(type, type.url);
  }

  // Remover duplicatas
  links = [...new Set(links)];

  for (const link of links) {
    const fileName = path.basename(link);
    const pdfPath = path.join(DEST_DIR, fileName);
    const txtPath = pdfPath.replace('.pdf', '.txt');
    try {
      if (!fs.existsSync(txtPath)) { // Evita baixar/parsear novamente
        await downloadPDF(link, pdfPath);
        const text = await extractTextFromPDF(pdfPath);
        fs.writeFileSync(txtPath, text, 'utf8');
        console.log(`[${type.name}] Baixado e convertido: ${fileName}`);
      } else {
        console.log(`[${type.name}] Já existe: ${fileName}`);
      }
    } catch (err) {
      console.error(`[${type.name}] Erro em ${fileName}:`, err.message);
    }
  }
}

async function main() {
  for (const type of DOC_TYPES) {
    console.log(`\n[INFO] Iniciando scraping de ${type.name}`);
    await scrapeAndSave(type);
    console.log(`[INFO] Finalizado scraping de ${type.name}`);
  }
  console.log('\n[INFO] Scraping de todos os tipos finalizado.');
}

main();