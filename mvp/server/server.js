import 'dotenv/config';
import path from 'path';
import { fileURLToPath } from 'url';
import express from 'express';
import cors from 'cors';
import OpenAI from 'openai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(cors());

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL_ALIASES = {
  'gpt-4o': 'gpt-4o',
  'gpt-4o-mini': 'gpt-4o-mini',
  'reasoner-v1': 'gpt-4o-mini',
  'gemini-compat': 'gpt-4o-mini',
  'llama3-8b-compat': 'gpt-4o-mini',
  'codex-compat': 'gpt-4o-mini',
  'validator': 'gpt-4o-mini'
};

const TOOL_SPEC = [
  {
    type: 'function',
    function: {
      name: 'calculator',
      description: 'Evaluate a safe arithmetic expression. Supports + - * / % ^ (power) and parentheses.',
      parameters: {
        type: 'object',
        properties: { expression: { type: 'string' } },
        required: ['expression']
      }
    }
  }
];

function safeCalc(expression) {
  if (typeof expression !== 'string') throw new Error('Invalid expression');
  const sanitized = expression
    .replace(/\s+/g, '')
    .replace(/\^/g, '**');

  if (!/^[0-9+\-*/().%* ]+$/.test(sanitized)) {
    throw new Error('Unsafe characters');
  }
  // eslint-disable-next-line no-new-func
  const out = Function(`"use strict"; return (${sanitized});`)();
  if (!Number.isFinite(out)) throw new Error('Non-finite result');
  return String(out);
}

async function callWithTools(model, messages) {
  const res = await client.chat.completions.create({
    model,
    temperature: 0.3,
    messages,
    tools: TOOL_SPEC,
    tool_choice: 'auto'
  });

  const msg = res.choices?.[0]?.message;
  if (!msg) throw new Error('No response');
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const toolResults = [];
    for (const tc of msg.tool_calls) {
      if (tc.type !== 'function') continue;
      let result = '';
      try {
        if (tc.function.name === 'calculator') {
          const args = JSON.parse(tc.function.arguments || '{}');
          result = safeCalc(args.expression);
        } else {
          result = 'Tool not implemented';
        }
      } catch (err) {
        result = `Tool error: ${(err && err.message) || String(err)}`;
      }
      toolResults.push({
        role: 'tool',
        tool_call_id: tc.id,
        content: result
      });
    }
    const res2 = await client.chat.completions.create({
      model,
      temperature: 0.3,
      messages: [...messages, msg, ...toolResults]
    });
    const final = res2.choices?.[0]?.message?.content ?? '';
    return final;
  }
  return msg.content ?? '';
}

function baseSystem(persona) {
  const sys = [
    'You are a helpful, concise, accurate assistant.',
    'If a numeric calculation is requested, call the calculator tool.'
  ];
  if (persona && persona.trim().length > 0) {
    sys.push(`Adopt this persona briefly: ${persona.trim()}`);
  }
  return sys.join(' ');
}

async function draftOnce({ model, prompt, persona, memoryBlob }) {
  const messages = [
    { role: 'system', content: baseSystem(persona) },
    ...(memoryBlob ? [{ role: 'system', content: `Memory: ${memoryBlob}` }] : []),
    { role: 'user', content: prompt }
  ];
  return callWithTools(model, messages);
}

async function critiqueOnce({ reasonerModel, prompt, lastDraft }) {
  const messages = [
    { role: 'system', content: 'You are a strict reviewer. Find flaws, missing steps, ambiguities, and unsafe claims. Return a concise bullet list of critiques.' },
    { role: 'user', content: `Task: ${prompt}\n\nDraft:\n${lastDraft}` }
  ];
  const res = await client.chat.completions.create({
    model: reasonerModel,
    temperature: 0.2,
    messages
  });
  return res.choices?.[0]?.message?.content ?? '';
}

async function reviseOnce({ model, prompt, persona, lastDraft, critique }) {
  const messages = [
    { role: 'system', content: baseSystem(persona) },
    { role: 'user', content: `Revise the answer to this task using the critique. Keep it concise and correct.\n\nTask:\n${prompt}\n\nCurrent draft:\n${lastDraft}\n\nCritique:\n${critique}` }
  ];
  const res = await client.chat.completions.create({
    model,
    temperature: 0.3,
    messages
  });
  return res.choices?.[0]?.message?.content ?? '';
}

async function validateOnce({ validatorModel, prompt, finalDraft }) {
  const messages = [
    { role: 'system', content: 'You are a validator. Check factuality, clarity, and safety. If issues exist, answer with "REVISE" followed by a short list of fixes. Otherwise answer "PASS".' },
    { role: 'user', content: `Task: ${prompt}\n\nAnswer:\n${finalDraft}` }
  ];
  const res = await client.chat.completions.create({
    model: validatorModel,
    temperature: 0.0,
    messages
  });
  const out = res.choices?.[0]?.message?.content ?? '';
  const status = out.trim().startsWith('PASS') ? 'PASS' : 'REVISE';
  const note = out.replace(/^PASS[:\s-]*/i, '').trim();
  return { status, note };
}

app.post('/api/pipeline', async (req, res) => {
  try {
    const {
      prompt,
      persona = '',
      debateLoops = 0,
      validateLoops = 1,
      modelMain = 'gpt-4o-mini',
      modelReasoner = 'reasoner-v1',
      modelValidator = 'validator',
      memory = ''
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ error: 'Missing prompt' });
    }

    const mainModel = MODEL_ALIASES[modelMain] || modelMain;
    const reasonerModel = MODEL_ALIASES[modelReasoner] || modelReasoner;
    const validatorModel = MODEL_ALIASES[modelValidator] || modelValidator;

    const timeline = [];

    // Initial draft
    let draft = await draftOnce({
      model: mainModel,
      prompt,
      persona,
      memoryBlob: memory
    });
    timeline.push({ step: 'draft', content: draft });

    // Debate loop
    for (let i = 0; i < Math.max(0, Number(debateLoops) || 0); i++) {
      const critique = await critiqueOnce({
        reasonerModel,
        prompt,
        lastDraft: draft
      });
      timeline.push({ step: `critique_${i + 1}`, content: critique });

      draft = await reviseOnce({
        model: mainModel,
        prompt,
        persona,
        lastDraft: draft,
        critique
      });
      timeline.push({ step: `revise_${i + 1}`, content: draft });
    }

    // Validate loop
    for (let j = 0; j < Math.max(0, Number(validateLoops) || 0); j++) {
      const { status, note } = await validateOnce({
        validatorModel,
        prompt,
        finalDraft: draft
      });
      timeline.push({ step: `validate_${j + 1}`, content: `${status}${note ? `: ${note}` : ''}` });
      if (status === 'REVISE') {
        draft = await reviseOnce({
          model: mainModel,
          prompt,
          persona,
          lastDraft: draft,
          critique: `Validator notes: ${note}`
        });
        timeline.push({ step: `post_validate_revise_${j + 1}`, content: draft });
      } else {
        break;
      }
    }

    res.json({
      ok: true,
      final: draft,
      timeline
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: (err && err.message) || 'Server error' });
  }
});

app.get('/api/models', (_req, res) => {
  res.json({
    models: [
      { id: 'gpt-4o', label: 'GPT-4o' },
      { id: 'gpt-4o-mini', label: 'GPT-4o Mini' },
      { id: 'reasoner-v1', label: 'ReasonerV1 (compat)' },
      { id: 'gemini-compat', label: 'Gemini (compat)' },
      { id: 'llama3-8b-compat', label: 'LLAMA3.1 8B (compat)' },
      { id: 'codex-compat', label: 'Codex (compat)' },
      { id: 'validator', label: 'Validator' }
    ]
  });
});

app.get('/health', (_req, res) => res.json({ ok: true }));

// Serve client
const clientDir = path.join(__dirname, '..', 'client');
app.use(express.static(clientDir));
app.get('*', (_req, res) => res.sendFile(path.join(clientDir, 'index.html')));

const port = Number(process.env.PORT) || 8787;
app.listen(port, () => {
  console.log(`VOIDE MVP server running on http://localhost:${port}`);
});

