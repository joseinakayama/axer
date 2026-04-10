const express = require('express');
const path = require('path');
const { runDiagnosis, mapAxiosError } = require('./lib/runDiagnosis');

const app = express();
const PORT = 3000;

app.use(express.json());

// diagnosis.htmlを配信
app.get('/service/diagnosis.html', (req, res) => {
  res.sendFile(path.join(__dirname, 'service', 'diagnosis.html'));
});

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


app.listen(PORT, () => {
  console.log(`HP診断ツール起動中: http://localhost:${PORT}`);
});
