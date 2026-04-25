require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const GEMINI_MODEL = 'gemini-2.0-flash';

app.post('/api/claude', async (req, res) => {
  const apiKey = process.env.GEMINI_API_KEY;

  console.log('[gemini] key present:', !!apiKey, apiKey ? '| prefix: ' + apiKey.slice(0, 8) + '...' : '| KEY MISSING');

  if (!apiKey) {
    return res.status(500).json({ error: 'GEMINI_API_KEY not configured' });
  }

  // Translate Anthropic-format request → Gemini format
  const { system, messages, max_tokens } = req.body;
  const userText = messages?.[0]?.content || '';

  const geminiBody = {
    contents: [{ role: 'user', parts: [{ text: userText }] }],
    generationConfig: {
      maxOutputTokens: max_tokens || 1200,
      temperature: 0.7
    }
  };

  if (system) {
    geminiBody.systemInstruction = { parts: [{ text: system }] };
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${apiKey}`;

    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(geminiBody)
    });

    const data = await response.json();
    console.log('[gemini] status:', response.status, '| finish:', data.candidates?.[0]?.finishReason);

    if (!response.ok) {
      const msg = data?.error?.message || data?.error?.status || JSON.stringify(data);
      console.error('[gemini] API error:', msg);
      return res.status(response.status).json({ error: msg });
    }

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!text) {
      console.error('[gemini] empty response:', JSON.stringify(data));
      return res.status(500).json({ error: 'Empty response from Gemini' });
    }

    // Return Anthropic-shaped response so the client needs zero changes
    res.json({ content: [{ type: 'text', text }] });

  } catch (err) {
    console.error('[gemini] fetch error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`FlowDesk running at http://localhost:${PORT}`);
});
