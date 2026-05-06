const express = require('express');
const fs = require('fs').promises;
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;
const dataFile = path.join(__dirname, 'stored_inputs.json');

app.use(express.json());
app.use(express.static(__dirname));

async function ensureDataFile() {
  try {
    await fs.access(dataFile);
  } catch {
    await fs.writeFile(dataFile, '[]', 'utf8');
  }
}

async function readStoredInputs() {
  await ensureDataFile();
  const raw = await fs.readFile(dataFile, 'utf8');
  return JSON.parse(raw || '[]');
}

async function writeStoredInputs(data) {
  await fs.writeFile(dataFile, JSON.stringify(data, null, 2), 'utf8');
}

app.post('/api/store-input', async (req, res) => {
  const payload = req.body;
  if (!payload || !payload.type || !payload.page || !payload.data) {
    return res.status(400).json({ success: false, message: 'Missing required fields.' });
  }

  try {
    const inputs = await readStoredInputs();
    inputs.unshift(payload);
    await writeStoredInputs(inputs);
    res.json({ success: true, saved: payload });
  } catch (error) {
    console.error('Failed to write stored inputs:', error);
    res.status(500).json({ success: false, message: 'Unable to save input.' });
  }
});

app.get('/api/inputs', async (req, res) => {
  try {
    const inputs = await readStoredInputs();
    res.json({ success: true, inputs });
  } catch (error) {
    console.error('Failed to read stored inputs:', error);
    res.status(500).json({ success: false, message: 'Unable to read stored inputs.' });
  }
});

app.listen(PORT, () => {
  console.log(`Pukuli backend running at http://localhost:${PORT}`);
});
