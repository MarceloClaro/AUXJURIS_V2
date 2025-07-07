const { execSync } = require('child_process');
const path = require('path');

const scripts = [
  'scrape_stf_docs.js',
  'scrape_jusbrasil.js',
  'scrape_tcu_docs.js',
  'scrape_tjce_docs.js',
  'scrape_estatutos.js',
];

for (const script of scripts) {
  const scriptPath = path.join(__dirname, script);
  try {
    console.log(`\n=== [INÍCIO] Executando: ${script} ===`);
    execSync(`node ${scriptPath}`, { stdio: 'inherit' });
    console.log(`=== [FIM] ${script} executado com sucesso ===`);
  } catch (err) {
    console.error(`Erro ao executar ${script}:`, err.message);
  }
}

console.log('\nTodos os scrapers foram executados.');