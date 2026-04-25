require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.post('/api/claude', async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;

  console.log('[claude] key present:', !!apiKey, apiKey ? '| prefix: ' + apiKey.slice(0, 10) + '...' : '');

  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const response = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify(req.body)
    });

    const data = await response.json();
    console.log('[claude] status:', response.status, '| type:', data.type);

    if (!response.ok) {
      // Anthropic errors: { type:"error", error:{ type:"...", message:"..." } }
      const msg = data?.error?.message || data?.error?.type || JSON.stringify(data);
      console.error('[claude] Anthropic error:', msg);
      return res.status(response.status).json({ error: msg });
    }

    res.json(data);
  } catch (err) {
    console.error('[claude] fetch error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`FlowDesk running at http://localhost:${PORT}`);
});
