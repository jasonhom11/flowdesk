require('dotenv').config();
const express = require('express');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const GROQ_MODEL = 'llama-3.1-8b-instant';
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';

app.post('/api/claude', async (req, res) => {
  const apiKey = process.env.GROQ_API_KEY;

  console.log('[groq] key present:', !!apiKey, apiKey ? '| prefix: ' + apiKey.slice(0, 8) + '...' : '| KEY MISSING');

  if (!apiKey) {
    return res.status(500).json({ error: 'GROQ_API_KEY not configured' });
  }

  // Translate Anthropic-format request → OpenAI/Groq format
  const { system, messages, max_tokens } = req.body;
  const userText = messages?.[0]?.content || '';

  const groqMessages = [];
  if (system) groqMessages.push({ role: 'system', content: system });
  groqMessages.push({ role: 'user', content: userText });

  const groqBody = {
    model: GROQ_MODEL,
    messages: groqMessages,
    max_tokens: max_tokens || 1200,
    temperature: 0.7
  };

  try {
    const response = await fetch(GROQ_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify(groqBody)
    });

    const data = await response.json();
    console.log('[groq] status:', response.status, '| finish:', data.choices?.[0]?.finish_reason);

    if (!response.ok) {
      const msg = data?.error?.message || JSON.stringify(data);
      console.error('[groq] API error:', msg);
      return res.status(response.status).json({ error: msg });
    }

    const text = data.choices?.[0]?.message?.content;
    if (!text) {
      console.error('[groq] empty response:', JSON.stringify(data));
      return res.status(500).json({ error: 'Empty response from Groq' });
    }

    // Return Anthropic-shaped response so the client needs zero changes
    res.json({ content: [{ type: 'text', text }] });

  } catch (err) {
    console.error('[groq] fetch error:', err);
    res.status(500).json({ error: err.message || String(err) });
  }
});

app.listen(PORT, () => {
  console.log(`FlowDesk running at http://localhost:${PORT}`);
});
