const $ = (q) => document.querySelector(q);

async function loadModels() {
  try {
    const res = await fetch('/api/models');
    const data = await res.json();
    const ids = ['modelMain', 'modelReasoner', 'modelValidator'];
    for (const id of ids) {
      const sel = document.getElementById(id);
      sel.innerHTML = '';
      data.models.forEach(m => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.label;
        sel.appendChild(opt);
      });
    }
    $('#modelMain').value = 'gpt-4o-mini';
    $('#modelReasoner').value = 'reasoner-v1';
    $('#modelValidator').value = 'validator';
  } catch (e) {
    console.error(e);
  }
}

function pushLog(step, content) {
  const div = document.createElement('div');
  div.className = 'item';
  div.innerHTML = `<div class="step">${step}</div><div class="content">${escapeHtml(content)}</div>`;
  $('#log').appendChild(div);
  $('#log').scrollTop = $('#log').scrollHeight;
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, m => ({
    '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'
  }[m]));
}

function loadMemory() {
  const mem = localStorage.getItem('voide_memory') || '';
  $('#memory').value = mem;
}
function saveMemory() {
  localStorage.setItem('voide_memory', $('#memory').value || '');
}
function clearMemory() {
  localStorage.removeItem('voide_memory');
  loadMemory();
}

async function runPipeline() {
  $('#log').innerHTML = '';
  $('#final').textContent = '';
  const payload = {
    prompt: $('#prompt').value || '',
    persona: $('#persona').value || '',
    debateLoops: Number($('#debateLoops').value || 0),
    validateLoops: Number($('#validateLoops').value || 1),
    modelMain: $('#modelMain').value,
    modelReasoner: $('#modelReasoner').value,
    modelValidator: $('#modelValidator').value,
    memory: $('#memory').value || ''
  };

  if (!payload.prompt.trim()) {
    pushLog('error', 'Prompt is required.');
    return;
  }

  $('#buildBtn').disabled = true;
  pushLog('status', 'Running pipeline...');
  try {
    const res = await fetch('/api/pipeline', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();
    if (!res.ok) {
      pushLog('error', data.error || 'Server error');
    } else {
      (data.timeline || []).forEach(t => pushLog(t.step, t.content));
      $('#final').textContent = data.final || '';
      // append to rolling memory if user wants that behavior later
    }
  } catch (e) {
    pushLog('error', String(e));
  } finally {
    $('#buildBtn').disabled = false;
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  await loadModels();
  loadMemory();
  $('#buildBtn').addEventListener('click', runPipeline);
  $('#saveMemory').addEventListener('click', saveMemory);
  $('#clearMemory').addEventListener('click', clearMemory);
});

