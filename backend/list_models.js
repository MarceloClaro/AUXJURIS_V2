require('dotenv').config({ path: __dirname + '/.env' });
require('dotenv').config({ path: __dirname + '/.env.new' });
require('dotenv').config({ path: __dirname + '/.env.example' });

const axios = require('axios');

async function listModels() {
  try {
    const response = await axios.get('http://192.168.1.8:1234/v1/models');
    const models = response.data.data || response.data.models || response.data;
    console.log("Modelos disponíveis no LM Studio:");
    if (Array.isArray(models)) {
      models.forEach(model => {
        if (typeof model === 'string') {
          console.log(model);
        } else if (model.id) {
          console.log(model.id);
        } else {
          console.log(JSON.stringify(model));
        }
      });
    } else {
      console.log(models);
    }
  } catch (error) {
    console.error("Erro ao listar modelos do LM Studio:", error.message);
  }
}

listModels();