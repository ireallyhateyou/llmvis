// --- Popup Alert Helper ---
function showPopupAlert(message) {
  const popup = document.getElementById('popup-alert');
  const msg = document.getElementById('popup-alert-message');
  if (msg) msg.textContent = message;
  if (popup) popup.style.display = 'flex';
}

// --- Training Visualization ---
let slmTrainingChart = null;
let slmLossData = [];
let slmAnimationFrame = null;

function initSLMTrainingVisualization() {
  console.log('initSLMTrainingVisualization called');
  const visContainer = document.getElementById('slm-vis');
  if (!visContainer) {
    console.error('slm-vis container not found');
    return;
  }
  
  // Clear previous visualization
  visContainer.innerHTML = `
    <div class="training-viz-container">
      <h3>Real-Time Training Progress</h3>
      <div class="chart-container">
        <canvas id="slm-training-chart" width="700" height="400"></canvas>
        <div class="chart-overlay">
          <div class="metric-display">
            <div class="metric-item">
              <span class="metric-label">Current Loss:</span>
              <span id="slm-current-loss" class="metric-value">--</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Epoch:</span>
              <span id="slm-current-epoch" class="metric-value">--</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Best Loss:</span>
              <span id="slm-best-loss" class="metric-value">--</span>
            </div>
          </div>
        </div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div id="slm-progress-fill" class="progress-fill"></div>
        </div>
        <div id="slm-progress-text" class="progress-text">Ready to train...</div>
      </div>
    </div>
  `;
  
  const canvas = document.getElementById('slm-training-chart');
  if (!canvas) {
    console.error('slm-training-chart canvas not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('Could not get canvas context');
    return;
  }
  
  // Pure white background
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  
  // Draw grid lines
  ctx.strokeStyle = '#e0e0e0';
  ctx.lineWidth = 0.5;
  for (let i = 0; i <= 10; i++) {
    const x = 80 + (i * 60);
    ctx.beginPath();
    ctx.moveTo(x, 60);
    ctx.lineTo(x, 360);
    ctx.stroke();
  }
  for (let i = 0; i <= 6; i++) {
    const y = 60 + (i * 50);
    ctx.beginPath();
    ctx.moveTo(80, y);
    ctx.lineTo(680, y);
    ctx.stroke();
  }
  
  // Draw axes with black styling
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, 360);
  ctx.lineTo(680, 360); // X-axis
  ctx.moveTo(80, 60);
  ctx.lineTo(80, 360); // Y-axis
  ctx.stroke();
  
  // Add arrowheads
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.moveTo(680, 360);
  ctx.lineTo(675, 355);
  ctx.lineTo(675, 365);
  ctx.fill();
  
  ctx.beginPath();
  ctx.moveTo(80, 60);
  ctx.lineTo(75, 65);
  ctx.lineTo(85, 65);
  ctx.fill();
  
  // Labels with black styling
  ctx.fillStyle = '#000000';
  ctx.font = 'bold 14px Times New Roman';
  ctx.fillText('Epochs', 350, 390);
  ctx.save();
  ctx.translate(30, 210);
  ctx.rotate(-Math.PI/2);
  ctx.fillText('Loss', 0, 0);
  ctx.restore();
  
  slmTrainingChart = { canvas, ctx, lossData: [] };
}

function updateSLMTrainingVisualization(epoch, loss) {
  if (!slmTrainingChart) {
    console.error('slmTrainingChart not initialized');
    return;
  }
  
  const { canvas, ctx, lossData } = slmTrainingChart;
  
  // Add new data point
  lossData.push({ epoch, loss });
  
  // Cancel previous animation frame
  if (slmAnimationFrame) {
    cancelAnimationFrame(slmAnimationFrame);
  }
  
  // Animate the update
  slmAnimationFrame = requestAnimationFrame(() => {
    // Clear chart area with pure white
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(81, 61, 599, 299);
    
    // Find min/max for scaling
    const losses = lossData.map(d => d.loss);
    const minLoss = Math.min(...losses);
    const maxLoss = Math.max(...losses);
    const lossRange = maxLoss - minLoss || 1;
    
    // Draw loss curve with solid black
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 3;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    
    lossData.forEach((point, i) => {
      const x = 80 + (point.epoch / Math.max(1, lossData[lossData.length - 1].epoch)) * 600;
      const y = 360 - ((point.loss - minLoss) / lossRange) * 280;
      
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    });
    
    ctx.stroke();
    
    // Draw data points with black circles
    lossData.forEach((point, i) => {
      const x = 80 + (point.epoch / Math.max(1, lossData[lossData.length - 1].epoch)) * 600;
      const y = 360 - ((point.loss - minLoss) / lossRange) * 280;
      
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, 2 * Math.PI);
      ctx.fill();
    });
    
    // Highlight current point with larger black circle
    if (lossData.length > 0) {
      const lastPoint = lossData[lossData.length - 1];
      const x = 80 + (lastPoint.epoch / Math.max(1, lossData[lossData.length - 1].epoch)) * 600;
      const y = 360 - ((lastPoint.loss - minLoss) / lossRange) * 280;
      
      // Animated pulse effect
      const pulseSize = 3 + Math.sin(Date.now() * 0.01) * 2;
      
      ctx.fillStyle = '#000000';
      ctx.beginPath();
      ctx.arc(x, y, pulseSize, 0, 2 * Math.PI);
      ctx.fill();
    }
  });
}

function updateSLMMetricsDisplay(epoch, loss, minLoss) {
  const currentLoss = document.getElementById('slm-current-loss');
  const currentEpoch = document.getElementById('slm-current-epoch');
  const bestLoss = document.getElementById('slm-best-loss');
  
  if (currentLoss) currentLoss.textContent = loss.toFixed(4);
  if (currentEpoch) currentEpoch.textContent = epoch;
  if (bestLoss) bestLoss.textContent = minLoss.toFixed(4);
}

function updateSLMProgressBar(currentEpoch, totalEpochs) {
  const progressFill = document.getElementById('slm-progress-fill');
  const progressText = document.getElementById('slm-progress-text');
  
  if (progressFill) {
    const percentage = (currentEpoch / totalEpochs) * 100;
    progressFill.style.width = `${percentage}%`;
  }
  
  if (progressText) {
    progressText.textContent = `Training: ${currentEpoch}/${totalEpochs} (${Math.round((currentEpoch / totalEpochs) * 100)}%)`;
  }
}

// Add global to store memory states and attention weights during SLM generation
let slmMemoryStates = [];
let slmAttentionWeights = [];

// --- SLM Model Functions ---

// Simple tokenizer for SLM
class SimpleTokenizer {
  constructor(vocabSize = 50) {
    this.vocabSize = vocabSize;
    this.charToId = {};
    this.idToChar = {};
    this.specialTokens = {
      '[PAD]': 0,
      '[UNK]': 1,
      '[BOS]': 2,
      '[EOS]': 3
    };
  }

  buildVocab(text) {
    const chars = new Set(text.split(''));
    const sortedChars = Array.from(chars).sort();
    
    // Add special tokens
    Object.entries(this.specialTokens).forEach(([token, id]) => {
      this.charToId[token] = id;
      this.idToChar[id] = token;
    });
    
    // Add regular characters (limit to prevent large vocab)
    const maxRegularChars = this.vocabSize - Object.keys(this.specialTokens).length;
    sortedChars.slice(0, maxRegularChars).forEach((char, index) => {
      const id = index + Object.keys(this.specialTokens).length;
      this.charToId[char] = id;
      this.idToChar[id] = char;
    });
  }

  encode(text) {
    const tokens = text.split('').map(char => 
      this.charToId[char] || this.charToId['[UNK]']
    );
    return [this.charToId['[BOS]'], ...tokens, this.charToId['[EOS]']];
  }

  decode(ids) {
    return ids.map(id => this.idToChar[id] || '[UNK]').join('');
  }
}

// Create SLM model
function createSLMModel(seqLength, vocabSize) {
  console.log('Creating SLM model with seqLength:', seqLength, 'vocabSize:', vocabSize);
  
  const input = tf.input({shape: [seqLength]});
  const embed = tf.layers.embedding({
    inputDim: vocabSize,
    outputDim: 32,
    inputLength: seqLength,
    maskZero: true
  }).apply(input);
  // LSTM layer (return sequences for attention, return state for memory)
  const lstmLayer = tf.layers.lstm({
    units: 32,
    returnSequences: true,
    returnState: true,
    dropout: 0.1
  });
  // lstmOut: [output, hiddenState, cellState]
  const lstmOut = lstmLayer.apply(embed);
  const lstmSeq = Array.isArray(lstmOut) ? lstmOut[0] : lstmOut;
  const lstmHidden = Array.isArray(lstmOut) ? lstmOut[1] : null;
  // Self-attention: query=key=value=lstm output
  // Attention weights: softmax(QK^T/sqrt(d))
  const permute = tf.layers.permute({dims: [2, 1]}).apply(lstmSeq); // [batch, 32, seq]
  const attentionScores = tf.layers.dot({axes: [2, 1]}).apply([lstmSeq, permute]); // [batch, seq, seq]
  const attentionWeights = tf.layers.activation({activation: 'softmax'}).apply(attentionScores); // [batch, seq, seq]
  const attended = tf.layers.dot({axes: [2, 1]}).apply([attentionWeights, lstmSeq]); // [batch, seq, 32]
  const flat = tf.layers.flatten().apply(attended);
  const dense = tf.layers.dense({units: 32, activation: 'relu'}).apply(flat);
  const output = tf.layers.dense({units: vocabSize, activation: 'softmax'}).apply(dense);
  // Only output the next-token prediction for training
  const model = tf.model({inputs: input, outputs: output});
  model.compile({
    optimizer: tf.train.adam(0.001),
    loss: 'sparseCategoricalCrossentropy',
    metrics: ['accuracy']
  });
  // For attention and memory visualization, create a separate model after training
  model._attentionModelFactory = function() {
    // outputs: [output, attentionWeights, hiddenState]
    return tf.model({inputs: input, outputs: [output, attentionWeights, lstmHidden]});
  };
  return model;
}

// Prepare sequences for training
function prepareSLMSequences(text, tokenizer, seqLength) {
  const tokens = tokenizer.encode(text);
  const sequences = [];
  
  for (let i = 0; i <= tokens.length - seqLength - 1; i++) {
    const sequence = tokens.slice(i, i + seqLength);
    const nextToken = tokens[i + seqLength];
    sequences.push({ input: sequence, label: nextToken });
  }
  
  return sequences;
}

// Vectorize data for training
function vectorizeSLMData(sequences, tokenizer) {
  const xs = tf.buffer([sequences.length, sequences[0].input.length]);
  const ys = tf.buffer([sequences.length]);
  
  sequences.forEach((seq, i) => {
    // Input sequence
    seq.input.forEach((token, t) => {
      xs.set(token, i, t);
    });
    // Output (next token)
    ys.set(seq.label, i);
  });
  
  return { xs: xs.toTensor(), ys: ys.toTensor() };
}

// Train SLM model
async function trainSLMModel(model, xs, ys, epochs, batchSize, statusCallback) {
  console.log('Starting SLM training with epochs:', epochs, 'batchSize:', batchSize);
  
  let minLoss = Infinity;
  
  for (let epoch = 1; epoch <= epochs; epoch++) {
    const result = await model.fit(xs, ys, {
      epochs: 1,
      batchSize: batchSize,
      verbose: 0
    });
    
    const loss = result.history.loss[0];
    minLoss = Math.min(minLoss, loss);
    
    if (statusCallback) {
      statusCallback(epoch, loss, minLoss, 0.001);
    }
    
    // Small delay to allow UI updates
    await new Promise(resolve => setTimeout(resolve, 10));
  }
  
  return { model, minLoss };
}

// Generate text with SLM
async function generateSLMText(model, seedText, tokenizer, length = 50, temperature = 0.8) {
  let currentTokens = tokenizer.encode(seedText);
  const generated = [];
  
  for (let i = 0; i < length; i++) {
    // Get the last sequenceLength tokens
    const inputTokens = currentTokens.slice(-model.inputs[0].shape[1]);
    
    // Pad if necessary
    while (inputTokens.length < model.inputs[0].shape[1]) {
      inputTokens.unshift(tokenizer.charToId['[PAD]']);
    }
    
    // Predict next token
    const input = tf.tensor2d([inputTokens], [1, model.inputs[0].shape[1]]);
    const prediction = model.predict(input);
    const nextToken = sampleWithTemperature(prediction, temperature);
    
    generated.push(nextToken);
    currentTokens.push(nextToken);
    
    input.dispose();
    prediction.dispose();
  }
  
  return tokenizer.decode(generated);
}

// Sample with temperature
function sampleWithTemperature(logits, temperature) {
  const probs = tf.softmax(tf.div(logits, temperature));
  const probsArray = probs.arraySync()[0];
  const cumulativeProbs = [];
  let sum = 0;
  
  for (let i = 0; i < probsArray.length; i++) {
    sum += probsArray[i];
    cumulativeProbs.push(sum);
  }
  
  const random = Math.random();
  for (let i = 0; i < cumulativeProbs.length; i++) {
    if (random <= cumulativeProbs[i]) {
      return i;
    }
  }
  
  return probsArray.length - 1;
}

// --- Generation Visualization ---
let slmGenerationInterval = null;
let slmGeneratedText = '';
let slmSeedText = '';
let slmGenerationModel = null;
let slmGenerationTokenizer = null;

function initSLMGenerationVisualization() {
  console.log('initSLMGenerationVisualization called');
  const visContainer = document.getElementById('slm-vis');
  if (!visContainer) {
    console.error('slm-vis container not found');
    return;
  }
  
  // Remove any existing generation visualization
  const existingGenViz = visContainer.querySelector('.generation-viz-container');
  if (existingGenViz) {
    existingGenViz.remove();
  }
  
  // Get default seed text from HTML if present
  const defaultSeed = document.getElementById('slm-default-seed')?.value || "I love Shipwrecked reviewers <3";
  
  // Add generation visualization section
  const genVizSection = document.createElement('div');
  genVizSection.className = 'generation-viz-container';
  genVizSection.innerHTML = `
    <h3>Real-Time Text Generation</h3>
    <div class="generation-controls">
      <div class="input-group">
        <label for="slm-seed-text">Seed Text:</label>
        <input type="text" id="slm-seed-text" value="${defaultSeed}" placeholder="Enter seed text..." style="width: 300px;">
      </div>
      <div class="input-group">
        <label for="slm-gen-length">Length:</label>
        <input type="number" id="slm-gen-length" value="50" min="10" max="200">
      </div>
      <div class="input-group">
        <label for="slm-temperature">Temperature:</label>
        <input type="number" id="slm-temperature" value="0.8" min="0.1" max="2.0" step="0.1">
      </div>
      <div class="input-group">
        <label for="slm-speed">Speed:</label>
        <input type="range" id="slm-speed" min="50" max="500" value="200" step="50">
        <span id="slm-speed-value">200ms</span>
      </div>
    </div>
    <div class="generation-display">
      <div class="seed-text-container">
        <label>Seed Text:</label>
        <div id="slm-seed-display" class="seed-display"></div>
      </div>
      <div class="generated-text-container">
        <label>Generated Text:</label>
        <div id="slm-generated-display" class="generated-text"></div>
      </div>
      <div class="next-char-container">
        <label>Next Character Prediction:</label>
        <div id="slm-next-char-display" class="next-char-display"></div>
      </div>
    </div>
    <div class="generation-buttons">
      <button id="slm-start-gen" class="gen-btn">Start Generation</button>
      <button id="slm-pause-gen" class="gen-btn" disabled>Pause</button>
      <button id="slm-reset-gen" class="gen-btn">Reset</button>
    </div>
    <div class="slm-heatmap-row" style="display: flex; flex-direction: row; gap: 2em; margin-top:2em;">
      <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
        <label><b>SLM Memory State (Hidden State) Heatmap</b></label>
        <canvas id="slm-memory-heatmap" width="400" height="120"></canvas>
      </div>
      <div style="flex:1; display:flex; flex-direction:column; align-items:center;">
        <label><b>SLM Attention Map</b></label>
        <canvas id="slm-attention-map" width="400" height="120"></canvas>
      </div>
    </div>
  `;
  
  visContainer.appendChild(genVizSection);
  
  // Add event listeners
  const startBtn = document.getElementById('slm-start-gen');
  const pauseBtn = document.getElementById('slm-pause-gen');
  const resetBtn = document.getElementById('slm-reset-gen');
  const speedSlider = document.getElementById('slm-speed');
  const speedValue = document.getElementById('slm-speed-value');
  
  if (startBtn) startBtn.onclick = startSLMGeneration;
  if (pauseBtn) pauseBtn.onclick = pauseSLMGeneration;
  if (resetBtn) resetBtn.onclick = resetSLMGeneration;
  if (speedSlider && speedValue) {
    speedSlider.oninput = () => {
      speedValue.textContent = speedSlider.value + 'ms';
    };
  }
  
  // Test that the seed input is working
  const seedInput = document.getElementById('slm-seed-text');
  if (seedInput) {
    console.log('SLM seed input found and editable');
    seedInput.addEventListener('input', (e) => {
      console.log('SLM seed text changed to:', e.target.value);
    });
  } else {
    console.error('SLM seed input not found!');
  }
}

function startSLMGeneration() {
  if (!slmGenerationModel || !slmGenerationTokenizer) {
    showPopupAlert('Please train the model first!');
    return;
  }
  // Reset memory and attention states
  slmMemoryStates = [];
  slmAttentionWeights = [];
  
  const seedInput = document.getElementById('slm-seed-text');
  const seedText = seedInput ? seedInput.value : 'I love Shipwrecked reviewers <3';
  const length = parseInt(document.getElementById('slm-gen-length').value);
  const temperature = parseFloat(document.getElementById('slm-temperature').value);
  const speed = parseInt(document.getElementById('slm-speed').value);
  
  console.log('SLM Generation starting with seed text:', seedText);
  
  slmSeedText = seedText;
  slmGeneratedText = '';
  
  // Update displays
  document.getElementById('slm-seed-display').textContent = seedText;
  document.getElementById('slm-generated-display').textContent = '';
  document.getElementById('slm-next-char-display').textContent = '';
  
  // Update buttons
  document.getElementById('slm-start-gen').disabled = true;
  document.getElementById('slm-pause-gen').disabled = false;
  
  // Start generation
  slmGenerationInterval = setInterval(() => {
    generateSLMNextCharacter();
  }, speed);
}

function pauseSLMGeneration() {
  if (slmGenerationInterval) {
    clearInterval(slmGenerationInterval);
    slmGenerationInterval = null;
  }
  
  document.getElementById('slm-start-gen').disabled = false;
  document.getElementById('slm-pause-gen').disabled = true;
}

function resetSLMGeneration() {
  pauseSLMGeneration();
  
  slmGeneratedText = '';
  slmMemoryStates = [];
  slmAttentionWeights = [];
  document.getElementById('slm-generated-display').textContent = '';
  document.getElementById('slm-next-char-display').textContent = '';
  
  document.getElementById('slm-start-gen').disabled = false;
  document.getElementById('slm-pause-gen').disabled = true;
  drawSLMMemoryHeatmap([]);
  drawSLMAttentionMap([]);
}

async function generateSLMNextCharacter() {
  if (!slmGenerationModel || !slmGenerationTokenizer) return;
  const temperature = parseFloat(document.getElementById('slm-temperature').value);
  try {
    // Get current context
    const currentText = slmSeedText + slmGeneratedText;
    const tokens = slmGenerationTokenizer.encode(currentText);
    const seqLength = slmGenerationModel.inputs[0].shape[1];
    const inputTokens = tokens.slice(-seqLength);
    while (inputTokens.length < seqLength) {
      inputTokens.unshift(slmGenerationTokenizer.charToId['[PAD]']);
    }
    // Predict next token, attention, and memory state
    const input = tf.tensor2d([inputTokens], [1, seqLength]);
    if (!slmGenerationModel._attentionModel && slmGenerationModel._attentionModelFactory) {
      slmGenerationModel._attentionModel = slmGenerationModel._attentionModelFactory();
    }
    let prediction, attention, hiddenState;
    if (slmGenerationModel._attentionModel) {
      [prediction, attention, hiddenState] = slmGenerationModel._attentionModel.predict(input);
    } else {
      prediction = slmGenerationModel.predict(input);
      attention = null;
      hiddenState = null;
    }
    // --- Memory state visualization ---
    if (hiddenState && hiddenState.arraySync) {
      const stateArr = hiddenState.arraySync()[0]; // shape: [units]
      // For heatmap, keep a rolling window of last N states
      slmMemoryStates.push(stateArr);
      if (slmMemoryStates.length > 10) slmMemoryStates.shift();
      drawSLMMemoryHeatmap(slmMemoryStates);
      // Debug log
      console.log('SLM Memory State:', stateArr);
    }
    // --- Attention visualization ---
    if (attention && attention.arraySync) {
      const attnArr = attention.arraySync()[0]; // [seq, seq]
      if (Array.isArray(attnArr) && attnArr.length > 0) {
        slmAttentionWeights.push(attnArr.map(row => Array.isArray(row) ? row : [row]));
        if (slmAttentionWeights.length > 10) slmAttentionWeights.shift();
        drawSLMAttentionMap(slmAttentionWeights);
        // Debug log
        console.log('SLM Attention:', attnArr);
      }
    }
    // Convert token to character
    const nextToken = sampleWithTemperature(prediction, temperature);
    const nextChar = slmGenerationTokenizer.idToChar[nextToken];
    slmGeneratedText += nextChar;
    document.getElementById('slm-generated-display').textContent = slmGeneratedText;
    document.getElementById('slm-next-char-display').textContent = nextChar;
    input.dispose();
    if (prediction.dispose) prediction.dispose();
    if (attention && attention.dispose) attention.dispose();
    if (hiddenState && hiddenState.dispose) hiddenState.dispose();
  } catch (error) {
    console.error('SLM: Error generating next character:', error);
    pauseSLMGeneration();
  }
}

function drawSLMMemoryHeatmap(states) {
  let canvas = document.getElementById('slm-memory-heatmap');
  if (!states || !states.length || !Array.isArray(states[0])) {
    if (canvas) canvas.style.display = 'none';
    return;
  }
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'slm-memory-heatmap';
    canvas.width = 400;
    canvas.height = 120;
    canvas.style.border = '1px solid #ccc';
    canvas.style.background = '#fff';
    canvas.style.display = 'block';
    canvas.style.marginTop = '2em';
    const label = document.createElement('label');
    label.innerHTML = '<b>SLM Memory State (Hidden State) Heatmap</b>';
    const container = document.getElementById('slm-vis') || document.getElementById('slm-container');
    if (container) {
      container.appendChild(label);
      container.appendChild(canvas);
    }
  } else {
    canvas.style.display = 'block';
  }
  const ctx = canvas.getContext('2d');
  const rows = states.length;
  const cols = states[0].length;
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const v = states[y][x];
      const norm = (v + 1) / 2;
      ctx.fillStyle = `rgba(0,0,0,${norm})`;
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
    }
  }
}

function drawSLMAttentionMap(attn) {
  let canvas = document.getElementById('slm-attention-map');
  if (!attn || !attn.length || !Array.isArray(attn[0])) {
    if (canvas) canvas.style.display = 'none';
    return;
  }
  if (!canvas) return;
  canvas.style.display = 'block';
  const ctx = canvas.getContext('2d');
  const rows = attn.length;
  const cols = attn[0].length;
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Find min and max for normalization (optional, for color mapping)
  let minV = Infinity, maxV = -Infinity;
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let v = attn[y][x];
      if (v < minV) minV = v;
      if (v > maxV) maxV = v;
    }
  }
  // Prevent division by zero
  if (maxV === minV) maxV = minV + 1e-6;

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      let v = attn[y][x];
      // Normalize to [0,1]
      let norm = (v - minV) / (maxV - minV);
      // Amplify for visibility
      let alpha = Math.min(1, norm * 2 + 0.1); // ensure not too faint
      // Use a blue color map for better contrast
      let blue = Math.floor(200 + 55 * norm);
      let red = Math.floor(255 * (1 - norm));
      let green = Math.floor(255 * (1 - norm));
      ctx.fillStyle = `rgba(${red},${green},${blue},${alpha})`;
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
    }
  }
  // Draw border for debug
  ctx.save();
  ctx.strokeStyle = '#f00';
  ctx.lineWidth = 2;
  ctx.strokeRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
}

// When clearing SLM state, also remove/hide the canvases
function clearSLMVisualizations() {
  const mem = document.getElementById('slm-memory-heatmap');
  if (mem) mem.style.display = 'none';
  const attn = document.getElementById('slm-attention-map');
  if (attn) attn.style.display = 'none';
  // Optionally remove the labels as well
  if (mem && mem.previousSibling && mem.previousSibling.tagName === 'LABEL') mem.previousSibling.style.display = 'none';
  if (attn && attn.previousSibling && attn.previousSibling.tagName === 'LABEL') attn.previousSibling.style.display = 'none';
}

// --- Main Training Function ---
async function trainSLM() {
  // Force WebGL backend for SLM training to avoid WASM kernel errors
  if (tf.getBackend() !== 'webgl') {
    await tf.setBackend('webgl');
    await tf.ready();
    console.log('SLM: Switched to WebGL backend for training');
  }
  console.log('trainSLM called');
  
  const trainText = document.getElementById('slm-train-text').value.trim();
  const seqLength = parseInt(document.getElementById('slm-seq-length').value);
  const epochs = parseInt(document.getElementById('slm-epochs').value);
  const batchSize = parseInt(document.getElementById('slm-batch-size').value);

  // Estimate parameter count for SLM model
  // Embedding: vocabSize*32, LSTM: 4*(units*(units+input)), Dense: 32*32+32, Output: 32*vocabSize+vocabSize
  // Use same logic as createSLMModel
  const vocabSize = (trainText ? Array.from(new Set(trainText.split(''))).length + 4 : 50); // +4 for special tokens
  const embedParams = vocabSize * 32;
  const lstmParams = 4 * (32 * (32 + 32));
  const denseParams = 32 * 32 + 32;
  const outParams = 32 * vocabSize + vocabSize;
  const totalParams = embedParams + lstmParams + denseParams + outParams;
  const estMinutes = Math.max(1, Math.round((totalParams / 50000) * epochs * 0.2));

  // Show modal and wait for user confirmation
  await new Promise(resolve => {
    window.showModelWarning(totalParams, estMinutes, resolve);
  });
  
  console.log('SLM Training parameters:', { trainText: trainText.substring(0, 50) + '...', seqLength, epochs, batchSize });
  
  if (!trainText) {
    showPopupAlert('Please enter training text!');
    return;
  }
  
  // Initialize visualization
  initSLMTrainingVisualization();
  
  try {
    const status = document.getElementById('slm-status');
    status.textContent = 'Preparing data...';
    console.log('Preparing SLM data...');
    
    // Create tokenizer and build vocabulary
    const tokenizer = new SimpleTokenizer(50);
    tokenizer.buildVocab(trainText);
    console.log('SLM Vocabulary size:', Object.keys(tokenizer.charToId).length);
    
    // Create sequences
    const sequences = prepareSLMSequences(trainText, tokenizer, seqLength);
    console.log('Created', sequences.length, 'SLM sequences');
    
    // Check if data is too large
    if (sequences.length > 1000) {
      showPopupAlert('Training data too large! Please use shorter text or reduce sequence length.');
      return;
    }
    
    // Vectorize data
    console.log('Vectorizing SLM data...');
    const { xs, ys } = vectorizeSLMData(sequences, tokenizer);
    console.log('SLM Tensors created:', xs.shape, ys.shape);
    
    status.textContent = 'Creating SLM model...';
    console.log('Creating SLM model...');
    
    // Create model
    const model = createSLMModel(seqLength, Object.keys(tokenizer.charToId).length);
    console.log('SLM Model created successfully');
    
    status.textContent = 'Training... (watch the chart below!)';
    console.log('Starting SLM training...');
    
    // Train model
    await trainSLMModel(model, xs, ys, epochs, batchSize, (epoch, loss, minLoss, lr) => {
      console.log(`SLM Training callback: epoch ${epoch}, loss ${loss}`);
      updateSLMTrainingVisualization(epoch, loss);
      updateSLMMetricsDisplay(epoch, loss, minLoss);
      updateSLMProgressBar(epoch, epochs);
      let statusMsg = `Epoch ${epoch}/${epochs}: Loss=${loss.toFixed(4)}, Min=${minLoss.toFixed(4)}, LR=${lr.toFixed(6)}`;
      // If loss is not improving much, suggest more data or epochs
      if (epoch > 5 && Math.abs(loss - minLoss) < 0.01) {
        statusMsg += ' (Tip: Loss is not improving much. Try more data or more epochs for better results.)';
      }
      status.textContent = statusMsg;
    });
    
    // Clean up tensors
    xs.dispose();
    ys.dispose();
    
    // Store model and tokenizer for generation
    slmGenerationModel = model;
    slmGenerationTokenizer = tokenizer;
    
    // Initialize generation visualization AFTER training is complete
    initSLMGenerationVisualization();
    
    status.textContent = 'Training complete! You can now generate text.';
    console.log('SLM Training completed successfully');
    showPopupAlert('Training complete! You can now generate text.');
    
  } catch (error) {
    console.error('SLM Training error:', error);
    const status = document.getElementById('slm-status');
    status.textContent = 'Training failed: ' + error.message;
    showPopupAlert('Training failed: ' + error.message);
  }
}

// Initialize SLM visualization when selected - ONLY show training interface initially
function initSLMVisualization() {
  console.log('SLM visualization initialized - showing training interface only');
  // Clear any existing visualization
  const visContainer = document.getElementById('slm-vis');
  if (visContainer) {
    visContainer.innerHTML = '';
  }
} 