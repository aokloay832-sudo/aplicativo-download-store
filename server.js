const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(express.json());
app.use(cors()); // Permite que o seu index.html faça requisições para a API sem erros de CORS

// ==========================================
// CONFIGURAÇÕES (PLANILHA E TELEGRAM)
// ==========================================
// ⚠️ COLOQUE AQUI O SEU LINK DO SHEETBEST E O TOKEN DO SEU BOT
const SHEET_BEST_URL = 'https://api.sheetbest.com/sheets/97cd3221-982a-4460-a856-227ab4f44efe';
const TELEGRAM_TOKEN = '8901640840:AAEdjoTh8YNmhTwdc-OLM_BFraUH1Oct6zw';

// ==========================================
// ROTA 1: BOT SALVAR DADOS NA PLANILHA
// ==========================================
app.post('/api/salvar', async (req, res) => {
    /* O req.body recebe do bot:
       { slug, nome, desenvolvedor, sobre, apk_file_id, logo_url, prints }
    */
    try {
        // Envia os dados estruturados diretamente para a planilha do Google
        await axios.post(SHEET_BEST_URL, req.body);
        console.log(`✅ Dados da campanha [${req.body.slug}] salvos com sucesso na planilha.`);
        res.status(200).json({ success: true });
    } catch (err) {
        console.error("❌ Erro ao salvar dados na planilha:", err.message);
        res.status(500).json({ error: "Erro ao salvar na planilha via SheetBest" });
    }
});

// ==========================================
// ROTA 2: INDEX.HTML BUSCAR DADOS DO APP
// ==========================================
app.get('/api/dados/:slug', async (req, res) => {
    try {
        // Busca na planilha a linha correspondente ao slug informado na URL do site
        const response = await axios.get(`${SHEET_BEST_URL}/slug/${req.params.slug}`);
        
        if (!response.data || response.data.length === 0) {
            return res.status(404).json({ error: "Campanha não encontrada na base de dados." });
        }
        
        // Retorna a linha encontrada para o index.html renderizar os textos e fotos
        res.json(response.data[0]);
    } catch (err) {
        console.error("❌ Erro ao consultar a planilha:", err.message);
        res.status(500).json({ error: "Erro ao consultar planilha" });
    }
});

// ==========================================
// ROTA 3: REDIRECIONAR DOWNLOAD DO TELEGRAM (Substitui baixar.php)
// ==========================================
app.get('/download/:slug', async (req, res) => {
    try {
        // 1. Busca o apk_file_id na planilha usando o slug da campanha
        const response = await axios.get(`${SHEET_BEST_URL}/slug/${req.params.slug}`);
        const appData = response.data[0];
        
        if (!appData || !appData.apk_file_id) {
            return res.status(404).send("<h1>Arquivo de download não localizado na planilha.</h1>");
        }

        const fileId = appData.apk_file_id;
        
        // 2. Faz a requisição ao Telegram para descobrir o link real do arquivo binário
        const telegramRes = await axios.get(`https://api.telegram.org/bot${TELEGRAM_TOKEN}/getFile?file_id=${fileId}`);
        
        if (telegramRes.data && telegramRes.data.result) {
            const filePath = telegramRes.data.result.file_path;
            
            // 3. Redireciona o navegador do usuário final direto para o download oficial do Telegram
            return res.redirect(`https://api.telegram.org/file/bot${TELEGRAM_TOKEN}/${filePath}`);
        }
        
        res.status(500).send("<h1>Erro ao recuperar link de download nos servidores do Telegram.</h1>");
    } catch (err) {
        console.error("❌ Erro interno no fluxo de download:", err.message);
        res.status(500).send("<h1>Erro interno no servidor de downloads.</h1>");
    }
});

// Inicialização do Servidor Node.js
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 Servidor de Campanhas rodando integralmente na porta ${PORT}`);
});
