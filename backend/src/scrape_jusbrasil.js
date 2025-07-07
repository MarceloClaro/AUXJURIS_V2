const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');

const SEARCH_URL = 'https://www.jusbrasil.com.br/diarios/busca?q=acórdão+stf'; // Exemplo: busca por acórdãos do STF
const DEST_DIR = path.join(__dirname, '../../public/books/Jusbrasil/');

async function scrapeJusbrasil() {
  if (!fs.existsSync(DEST_DIR)) fs.mkdirSync(DEST_DIR, { recursive: true });

  let browser;
  try {
    browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(SEARCH_URL, { waitUntil: 'networkidle2' });

    // Pega os 10 primeiros resultados de links de diários
    const links = await page.$$eval('a', as =>
      as
        .filter(a => a.href && a.href.includes('/diarios/'))
        .map(a => a.href)
        .slice(0, 10)
    );

    for (const link of links) {
      try {
        await page.goto(link, { waitUntil: 'networkidle2' });
        // Pega o texto principal da decisão
        const content = await page.evaluate(() => {
          const el = document.querySelector('.document-text') || document.body;
          return el.innerText;
        });
        const fileName = link.split('/').pop().split('?')[0] + '.txt';
        fs.writeFileSync(path.join(DEST_DIR, fileName), content, 'utf8');
        console.log(`[OK] Salvo: ${fileName}`);
      } catch (err) {
        console.error(`[ERRO] Falha ao processar link ${link}:`, err.message);
      }
    }
  } catch (err) {
    console.error('[ERRO] Falha geral no scraping do Jusbrasil:', err.message);
  } finally {
    if (browser) await browser.close();
    console.log('[INFO] Scraping do Jusbrasil finalizado.');
  }
}

scrapeJusbrasil();