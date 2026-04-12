const express = require('express');
const path = require('path');
const { runDiagnosis, mapAxiosError } = require('./lib/runDiagnosis');
const { handleLineWebhook } = require('./lib/lineWebhookCore');
const { handleVerifyDedicated } = require('./lib/lineVerifyDedicatedHandler');

const app = express();
const PORT = 3000;

app.use('/service', express.static(path.join(__dirname, 'service')));

app.post(
  '/api/line/webhook',
  express.raw({ type: '*/*', limit: '256kb' }),
  async (req, res) => {
    const buf = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || '', 'utf8');
    const result = await handleLineWebhook(buf, req.get('x-line-signature'), process.env);
    res.status(result.status).type('text/plain; charset=utf-8').send(result.body);
  }
);

app.use(express.json());

app.use(express.static(path.join(__dirname, 'public')));

// ============================
// 50項目自動分析エンドポイント
// ============================
app.post('/api/analyze50', async (req, res) => {
  const { url } = req.body;
  try {
    const data = await runDiagnosis(url);
    res.json(data);
  } catch (err) {
    const mapped = mapAxiosError(err);
    return res.status(mapped.status).json(mapped.body);
  }
});

app.post('/api/line/verify-dedicated', async (req, res) => {
  const result = await handleVerifyDedicated(req.body || {}, process.env);
  res.status(result.status).json(result.json);
});

app.listen(PORT, () => {
  console.log(`HP診断ツール起動中: http://localhost:${PORT}`);
});
