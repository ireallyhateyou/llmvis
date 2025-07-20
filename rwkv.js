let rwkvModel = null;
let rwkvLayers = 2; // Number of RWKV layers
let rwkvHiddenSize = 8; // Hidden size per layer
let rwkvRoutingStates = [];
let rwkvGatingStates = [];
let rwkvTimeMixStates = [];
let rwkvChannelMixStates = [];
let rwkvGeneratedText = '';

// Utility: LayerNorm
function layerNorm(x, gamma, beta) {
  const mean = tf.mean(x, -1, true);
  const variance = tf.mean(tf.square(tf.sub(x, mean)), -1, true);
  const normed = tf.div(tf.sub(x, mean), tf.sqrt(tf.add(variance, 1e-5)));
  return tf.add(tf.mul(normed, gamma), beta);
}

// RWKV Cell (single step, single layer)
function rwkvCell(x, state, params) {
  // x: [hidden], state: [hidden], params: {timeMix, Wg, bg, Wr, br, Wcm, bcm, gamma, beta}
  // LayerNorm
  x = layerNorm(x, params.gamma, params.beta);
  // Time-mix
  const x_tm = tf.add(tf.mul(params.timeMix, x), tf.mul(tf.sub(1, params.timeMix), state));
  // Gating
  const gate = tf.sigmoid(tf.add(tf.matMul(x_tm, params.Wg), params.bg));
  // Routing
  const route = tf.tanh(tf.add(tf.matMul(x_tm, params.Wr), params.br));
  // State update
  const newState = tf.add(tf.mul(gate, route), tf.mul(tf.sub(1, gate), state));
  // Channel-mix (simple FFN)
  const channelMix = tf.tanh(tf.add(tf.matMul(newState, params.Wcm), params.bcm));
  // Output
  const out = tf.add(newState, channelMix);
  return {out, newState, gate, route, x_tm, channelMix};
}

// Create a multi-layer RWKV model (for training)
function createRWKVModel(seqLength, vocabSize, nLayers, hiddenSize) {
  // For training: input -> embedding -> n RWKV layers -> output
  const input = tf.input({shape: [seqLength]});
  let x = tf.layers.embedding({inputDim: vocabSize, outputDim: hiddenSize, inputLength: seqLength, maskZero: true}).apply(input);
  for (let l = 0; l < nLayers; l++) {
    x = tf.layers.lstm({units: hiddenSize, returnSequences: true}).apply(x); // For training, use LSTM as a stand-in
  }
  const flat = tf.layers.flatten().apply(x);
  const dense = tf.layers.dense({units: 32, activation: 'relu'}).apply(flat);
  const output = tf.layers.dense({units: vocabSize, activation: 'softmax'}).apply(dense);
  const model = tf.model({inputs: input, outputs: output});
  model.compile({optimizer: tf.train.adam(0.001), loss: 'sparseCategoricalCrossentropy', metrics: ['accuracy']});
  return model;
}

// For generation: use a real multi-layer RWKV cell (step by step)
function makeRWKVParams(nLayers, hiddenSize) {
  // Randomly initialize small weights for demo
  const params = [];
  for (let l = 0; l < nLayers; l++) {
    params.push({
      timeMix: tf.variable(tf.randomUniform([hiddenSize], 0.3, 0.7)),
      Wg: tf.variable(tf.randomNormal([hiddenSize, hiddenSize], 0, 0.5)),
      bg: tf.variable(tf.zeros([hiddenSize])),
      Wr: tf.variable(tf.randomNormal([hiddenSize, hiddenSize], 0, 0.5)),
      br: tf.variable(tf.zeros([hiddenSize])),
      Wcm: tf.variable(tf.randomNormal([hiddenSize, hiddenSize], 0, 0.5)),
      bcm: tf.variable(tf.zeros([hiddenSize])),
      gamma: tf.variable(tf.ones([hiddenSize])),
      beta: tf.variable(tf.zeros([hiddenSize]))
    });
  }
  // Output projection
  const outW = tf.variable(tf.randomNormal([hiddenSize, 1], 0, 0.5));
  const outB = tf.variable(tf.zeros([1]));
  return {params, outW, outB};
}

window.initRWKVVisualization = function() {
  const vis = document.getElementById('rwkv-vis');
  if (!vis) return;
  vis.innerHTML = '';
  vis.innerHTML = `
    <div class="rwkv-gen-controls">
      <div class="input-group">
        <label for="rwkv-seed-text">Seed Text:</label>
        <input type="text" id="rwkv-seed-text" value="Roses are" style="width: 300px;">
      </div>
      <div class="input-group">
        <label for="rwkv-gen-length">Length:</label>
        <input type="number" id="rwkv-gen-length" value="50" min="10" max="200">
      </div>
      <div class="input-group">
        <label for="rwkv-temperature">Temperature:</label>
        <input type="number" id="rwkv-temperature" value="0.8" min="0.1" max="2.0" step="0.1">
      </div>
      <button id="rwkv-start-gen" class="gen-btn">Start Generation</button>
      <button id="rwkv-reset-gen" class="gen-btn">Reset</button>
    </div>
    <div class="rwkv-gen-output">
      <label>Generated Text:</label>
      <div id="rwkv-generated-display" class="generated-text"></div>
    </div>
    <div class="rwkv-heatmap-container">
      <label>Routing (per-layer, per-step)</label>
      <canvas id="rwkv-routing-heatmap" class="rwkv-heatmap" width="400" height="120"></canvas>
    </div>
    <div class="rwkv-heatmap-container">
      <label>Gating (per-layer, per-step)</label>
      <canvas id="rwkv-gating-heatmap" class="rwkv-heatmap" width="400" height="120"></canvas>
    </div>
    <div class="rwkv-heatmap-container">
      <label>Time-mix (per-layer, per-step)</label>
      <canvas id="rwkv-timemix-heatmap" class="rwkv-heatmap" width="400" height="120"></canvas>
    </div>
    <div class="rwkv-heatmap-container">
      <label>Channel-mix (per-layer, per-step)</label>
      <canvas id="rwkv-channelmix-heatmap" class="rwkv-heatmap" width="400" height="120"></canvas>
    </div>
  `;
  document.getElementById('rwkv-start-gen').onclick = startRWKVGeneration;
  document.getElementById('rwkv-reset-gen').onclick = resetRWKVGeneration;
};

window.trainRWKV = async function() {
  const status = document.getElementById('rwkv-status');
  status.textContent = 'Preparing data...';
  const trainText = document.getElementById('rwkv-train-text').value.trim();
  const seqLength = parseInt(document.getElementById('rwkv-seq-length').value);
  const epochs = parseInt(document.getElementById('rwkv-epochs').value);
  const batchSize = parseInt(document.getElementById('rwkv-batch-size').value);
  // Tokenizer: char-level
  const chars = [...new Set(trainText)].sort();
  const vocabSize = chars.length;
  const charToIdx = {};
  const idxToChar = {};
  chars.forEach((c, i) => { charToIdx[c] = i; idxToChar[i] = c; });
  // Prepare sequences
  const sequences = [];
  for (let i = 0; i <= trainText.length - seqLength - 1; i++) {
    const input = trainText.slice(i, i + seqLength).split('').map(c => charToIdx[c]);
    const label = charToIdx[trainText[i + seqLength]];
    sequences.push({input, label});
  }
  // Vectorize
  const xs = tf.tensor2d(sequences.map(s => s.input));
  const ys = tf.tensor1d(sequences.map(s => s.label), 'int32');
  // For training, use a simple LSTM stack as a stand-in
  rwkvModel = createRWKVModel(seqLength, vocabSize, rwkvLayers, rwkvHiddenSize);
  status.textContent = 'Training...';
  await rwkvModel.fit(xs, ys, {
    epochs,
    batchSize,
    callbacks: {
      onEpochEnd: (epoch, logs) => {
        status.textContent = `Epoch ${epoch+1}/${epochs}: Loss=${logs.loss.toFixed(4)}`;
      }
    }
  });
  xs.dispose(); ys.dispose();
  window.rwkvCharToIdx = charToIdx;
  window.rwkvIdxToChar = idxToChar;
  window.rwkvSeqLength = seqLength;
  // For generation, create real RWKV cell params
  window.rwkvGenParams = makeRWKVParams(rwkvLayers, rwkvHiddenSize);
  status.textContent = 'Training complete! You can now generate text.';
  window.initRWKVVisualization();
};

function startRWKVGeneration() {
  rwkvRoutingStates = [];
  rwkvGatingStates = [];
  rwkvTimeMixStates = [];
  rwkvChannelMixStates = [];
  rwkvGeneratedText = '';
  document.getElementById('rwkv-generated-display').textContent = '';
  const seed = document.getElementById('rwkv-seed-text').value;
  const length = parseInt(document.getElementById('rwkv-gen-length').value);
  const temperature = parseFloat(document.getElementById('rwkv-temperature').value);
  generateRWKVText(seed, length, temperature);
}

function resetRWKVGeneration() {
  rwkvRoutingStates = [];
  rwkvGatingStates = [];
  rwkvTimeMixStates = [];
  rwkvChannelMixStates = [];
  rwkvGeneratedText = '';
  document.getElementById('rwkv-generated-display').textContent = '';
  drawRWKVHeatmap('rwkv-routing-heatmap', []);
  drawRWKVHeatmap('rwkv-gating-heatmap', []);
  drawRWKVHeatmap('rwkv-timemix-heatmap', []);
  drawRWKVHeatmap('rwkv-channelmix-heatmap', []);
}

async function generateRWKVText(seed, length, temperature) {
  if (!window.rwkvGenParams || !window.rwkvCharToIdx || !window.rwkvIdxToChar) return;
  let context = seed;
  // Initial state for each layer
  let states = [];
  for (let l = 0; l < rwkvLayers; l++) states.push(tf.zeros([rwkvHiddenSize]));
  for (let i = 0; i < length; i++) {
    // Input: last char as one-hot
    const lastChar = context.length > 0 ? context[context.length-1] : ' ';
    const x = tf.oneHot([window.rwkvCharToIdx[lastChar] ?? 0], rwkvHiddenSize).reshape([rwkvHiddenSize]);
    let h = x;
    let routingStep = [], gatingStep = [], timeMixStep = [], channelMixStep = [];
    // Pass through each layer
    for (let l = 0; l < rwkvLayers; l++) {
      const cell = rwkvCell(h, states[l], window.rwkvGenParams.params[l]);
      h = cell.out;
      states[l] = cell.newState;
      routingStep.push(cell.route.arraySync());
      gatingStep.push(cell.gate.arraySync());
      timeMixStep.push(cell.x_tm.arraySync());
      channelMixStep.push(cell.channelMix.arraySync());
      // Dispose tensors to avoid leaks
      cell.gate.dispose(); cell.route.dispose(); cell.x_tm.dispose(); cell.channelMix.dispose();
    }
    rwkvRoutingStates.push(routingStep);
    rwkvGatingStates.push(gatingStep);
    rwkvTimeMixStates.push(timeMixStep);
    rwkvChannelMixStates.push(channelMixStep);
    // Output projection
    const logits = tf.add(tf.matMul(h.reshape([1, rwkvHiddenSize]), window.rwkvGenParams.outW), window.rwkvGenParams.outB).arraySync()[0];
    const probs = softmax(logits, temperature);
    const idx = sampleFromProbs(probs);
    const nextChar = window.rwkvIdxToChar[idx];
    context += nextChar;
    rwkvGeneratedText += nextChar;
    document.getElementById('rwkv-generated-display').textContent = rwkvGeneratedText;
    drawRWKVHeatmap('rwkv-routing-heatmap', rwkvRoutingStates);
    drawRWKVHeatmap('rwkv-gating-heatmap', rwkvGatingStates);
    drawRWKVHeatmap('rwkv-timemix-heatmap', rwkvTimeMixStates);
    drawRWKVHeatmap('rwkv-channelmix-heatmap', rwkvChannelMixStates);
    x.dispose(); h.dispose();
    await new Promise(r => setTimeout(r, 30));
  }
}

function drawRWKVHeatmap(canvasId, states) {
  const canvas = document.getElementById(canvasId);
  if (!canvas || !states.length || !Array.isArray(states[0])) {
    if (canvas) canvas.getContext('2d').clearRect(0, 0, canvas.width, canvas.height);
    return;
  }
  // states: [steps][layers][hidden]
  const ctx = canvas.getContext('2d');
  const rows = states.length;
  const cols = states[0].length * states[0][0].length; // layers * hidden
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < rows; y++) {
    let flat = states[y].flat();
    for (let x = 0; x < cols; x++) {
      const v = flat[x];
      const norm = (v + 1) / 2;
      ctx.fillStyle = `rgba(0,0,0,${norm})`;
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
    }
  }
}

function softmax(logits, temperature) {
  const max = Math.max(...logits);
  const exps = logits.map(x => Math.exp((x - max) / temperature));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(x => x / sum);
}
function sampleFromProbs(probs) {
  let r = Math.random(), s = 0;
  for (let i = 0; i < probs.length; i++) {
    s += probs[i];
    if (r <= s) return i;
  }
  return probs.length - 1;
} 