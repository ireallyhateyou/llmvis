import { pipeline, env } from "https://cdn.jsdelivr.net/npm/@xenova/transformers";

env.allowLocalModels = false;

let gpt2Pipeline = null;
let gpt2Tokenizer = null;
let isGenerating = false;
let isModelLoading = false;

function debugLog(...args) {
  console.log('[GPT2]', ...args);
}

async function showTokens(ids, tokensDiv) {
  if (!gpt2Tokenizer) { debugLog('Tokenizer not loaded'); return; }
  if (!Array.isArray(ids)) {
    tokensDiv.innerHTML = '<span style="color:red">Token IDs are invalid or not loaded yet.</span>';
    debugLog('Token IDs invalid', ids);
    return;
  }
  // Decode each token ID to string
  let tokens = [];
  for (let i = 0; i < ids.length; ++i) {
    try {
      tokens.push(await gpt2Tokenizer.decode([ids[i]]));
    } catch (e) {
      tokens.push('?');
    }
  }
  debugLog('showTokens: ids', ids, 'tokens', tokens);
  tokensDiv.innerHTML = '<b>Tokens:</b> ' + tokens.map((t, i) => `<code>${t}</code>`).join(' ')
    + '<br><b>Token IDs:</b> ' + ids.map(id => `<code>${id}</code>`).join(' ');
}

async function initGPT2UI() {
  debugLog('initGPT2UI called');
  // Find DOM elements
  const inputBox = document.getElementById('gpt2-input');
  const maxTokensBox = document.getElementById('gpt2-max-tokens');
  const generateBtn = document.getElementById('gpt2-generate-btn');
  const statusDiv = document.getElementById('gpt2-status');
  const outputDiv = document.getElementById('gpt2-output');
  const visDiv = document.getElementById('gpt2-vis');

  if (!inputBox || !maxTokensBox || !generateBtn || !statusDiv || !outputDiv || !visDiv) {
    debugLog('Missing GPT-2 UI elements');
    return;
  }

  // Only initialize once
  if (generateBtn._gpt2Init) return;
  generateBtn._gpt2Init = true;

  // Load pipeline and tokenizer if not loaded
  async function ensurePipeline() {
    if (gpt2Pipeline && gpt2Tokenizer) return;
    isModelLoading = true;
    statusDiv.textContent = 'Loading Xenova/distilgpt2 model...';
    debugLog('Loading pipeline...');
    try {
      gpt2Pipeline = await pipeline('text-generation', 'Xenova/distilgpt2');
      gpt2Tokenizer = gpt2Pipeline.tokenizer;
      debugLog('Pipeline and tokenizer loaded', gpt2Pipeline, gpt2Tokenizer);
      statusDiv.textContent = 'Model loaded!';
    } catch (e) {
      debugLog('Failed to load pipeline', e);
      statusDiv.textContent = 'Failed to load DistilGPT-2: ' + e.message;
      isModelLoading = false;
      return;
    }
    isModelLoading = false;
  }

  generateBtn.onclick = async function() {
    debugLog('Generate button clicked');
    if (isGenerating || isModelLoading) return;
    isGenerating = true;
    generateBtn.disabled = true;
    statusDiv.textContent = 'Generating...';
    outputDiv.textContent = '';
    visDiv.innerHTML = '';
    const prompt = inputBox.value;
    const maxNewTokens = parseInt(maxTokensBox.value) || 40;
    debugLog('Prompt:', prompt, 'maxNewTokens:', maxNewTokens);
    await ensurePipeline();
    if (!gpt2Pipeline) {
      statusDiv.textContent = 'Model not loaded.';
      isGenerating = false;
      generateBtn.disabled = false;
      return;
    }
    try {
      // Generate all at once
      const result = await gpt2Pipeline(prompt, { max_new_tokens: maxNewTokens });
      debugLog('Pipeline result', result);
      if (!Array.isArray(result) || !result[0] || typeof result[0].generated_text !== 'string') {
        statusDiv.textContent = 'Generation failed: Unexpected output.';
        isGenerating = false;
        generateBtn.disabled = false;
        return;
      }
      const generated = result[0].generated_text;
      outputDiv.textContent = generated;
      // Visualize tokens: show prompt+generated as tokens and ids
      const allText = generated;
      const ids = await gpt2Tokenizer.encode(allText);
      debugLog('All text ids', ids);
      await showTokens(ids, visDiv);
      statusDiv.textContent = 'Done!';
    } catch (e) {
      debugLog('Generation error', e);
      statusDiv.textContent = 'Generation error: ' + e.message;
    }
    isGenerating = false;
    generateBtn.disabled = false;
  };

  debugLog('GPT-2 UI initialized');
}

window.initGPT2UI = initGPT2UI;

window.addEventListener('DOMContentLoaded', () => {
  const gpt2Container = document.getElementById('gpt2-container');
  if (gpt2Container && gpt2Container.style.display !== 'none') {
    initGPT2UI();
  }
  const modelPicker = document.getElementById('model-picker');
  if (modelPicker) {
    modelPicker.addEventListener('change', function() {
      if (this.value === 'gpt2') {
        setTimeout(() => initGPT2UI(), 100);
      }
    });
  }
}); 