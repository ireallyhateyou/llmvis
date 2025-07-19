// Small Language Model (SLM) Implementation
// Inspired by TinyModel and modern SLM approaches

// Global variables for SLM
let slmModel = null;
let slmTokenizer = null;
let slmVocab = null;
let slmTrainingData = null;
let slmTrainingHistory = [];

// SLM Configuration
const SLM_CONFIG = {
  vocabSize: 1000,
  maxLength: 64,
  embeddingDim: 128,
  numLayers: 4,
  numHeads: 8,
  dropout: 0.1,
  learningRate: 0.001,
  batchSize: 8
};

// Simple tokenizer for SLM
class SimpleTokenizer {
  constructor(vocabSize = 1000) {
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
    
    // Add regular characters
    sortedChars.forEach((char, index) => {
      const id = index + Object.keys(this.specialTokens).length;
      if (id < this.vocabSize) {
        this.charToId[char] = id;
        this.idToChar[id] = char;
      }
    });
    
    console.log(`SLM Vocabulary built: ${Object.keys(this.charToId).length} tokens`);
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

// SLM Model Architecture (Simplified Transformer)
class SLMModel {
  constructor(config) {
    this.config = config;
    this.model = this.buildModel();
  }

  buildModel() {
    const model = tf.sequential();
    
    // Embedding layer
    model.add(tf.layers.embedding({
      inputDim: this.config.vocabSize,
      outputDim: this.config.embeddingDim,
      inputLength: this.config.maxLength,
      maskZero: true
    }));
    
    // Simple LSTM-based architecture (more reliable than transformer)
    model.add(tf.layers.lstm({
      units: this.config.embeddingDim,
      returnSequences: false,
      dropout: this.config.dropout
    }));
    
    // Dense layers
    for (let i = 0; i < this.config.numLayers; i++) {
      model.add(tf.layers.dense({
        units: this.config.embeddingDim,
        activation: 'relu'
      }));
      
      model.add(tf.layers.dropout({ rate: this.config.dropout }));
    }
    
    // Output layer
    model.add(tf.layers.dense({
      units: this.config.vocabSize,
      activation: 'softmax'
    }));
    
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'sparseCategoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }

  async train(data, epochs, callbacks) {
    const history = await this.model.fit(data.xs, data.ys, {
      epochs: epochs,
      batchSize: this.config.batchSize,
      validationSplit: 0.2,
      callbacks: callbacks,
      verbose: 0
    });
    return history;
  }

  predict(input) {
    return this.model.predict(input);
  }
}

// SLM Training Visualization
function initSLMVisualization() {
  const container = document.getElementById('slm-vis');
  if (!container) return;

  // Remove existing SLM visualization
  const existingSLM = container.querySelector('.slm-viz-container');
  if (existingSLM) {
    existingSLM.remove();
  }

  // Create SLM visualization section
  const slmVizSection = document.createElement('div');
  slmVizSection.className = 'slm-viz-container';
  slmVizSection.innerHTML = `
    <h3>Small Language Model (SLM) Training</h3>
    <div class="slm-controls">
      <div class="input-group">
        <label for="slm-training-text">Training Text:</label>
        <textarea id="slm-training-text" rows="4" placeholder="Enter training text for the SLM...">Roses are red, Violets are blue, I love Hack Club and so should you! This is a simple test for our small language model. We will train it on this text and see how it learns patterns.</textarea>
      </div>
      <div class="slm-params">
        <div class="param-group">
          <label for="slm-epochs">Epochs:</label>
          <input type="number" id="slm-epochs" value="10" min="1" max="50">
        </div>
        <div class="param-group">
          <label for="slm-layers">Layers:</label>
          <input type="number" id="slm-layers" value="4" min="1" max="8">
        </div>
        <div class="param-group">
          <label for="slm-embedding">Embedding Dim:</label>
          <input type="number" id="slm-embedding" value="128" min="32" max="512">
        </div>
      </div>
      <button id="slm-train-btn" class="train-btn">Train SLM</button>
      <button id="slm-generate-btn" class="generate-btn" disabled>Generate Text</button>
    </div>
    
    <div class="slm-training-viz">
      <div class="training-chart-container">
        <canvas id="slm-training-chart" width="600" height="300"></canvas>
        <div class="chart-overlay">
          <div class="metric-display">
            <div class="metric-item">
              <span class="metric-label">Epoch:</span>
              <span id="slm-current-epoch" class="metric-value">0/0</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Loss:</span>
              <span id="slm-current-loss" class="metric-value">0.0000</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Accuracy:</span>
              <span id="slm-current-accuracy" class="metric-value">0.00%</span>
            </div>
          </div>
        </div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div id="slm-progress-fill" class="progress-fill"></div>
        </div>
        <div id="slm-progress-text" class="progress-text">Ready to train</div>
      </div>
    </div>
    
    <div class="slm-generation-viz" style="display: none;">
      <h4>SLM Text Generation</h4>
      <div class="generation-controls">
        <div class="input-group">
          <label for="slm-seed-text">Seed Text:</label>
          <input type="text" id="slm-seed-text" value="Roses are" style="width: 200px;">
        </div>
        <div class="input-group">
          <label for="slm-gen-length">Length:</label>
          <input type="number" id="slm-gen-length" value="50" min="10" max="200">
        </div>
        <div class="input-group">
          <label for="slm-temperature">Temperature:</label>
          <input type="number" id="slm-temperature" value="0.8" min="0.1" max="2.0" step="0.1">
        </div>
      </div>
      <div class="generation-output">
        <label>Generated Text:</label>
        <div id="slm-generated-text" class="generated-text"></div>
      </div>
    </div>
  `;

  container.appendChild(slmVizSection);

  // Add event listeners
  const trainBtn = document.getElementById('slm-train-btn');
  const generateBtn = document.getElementById('slm-generate-btn');
  const seedInput = document.getElementById('slm-seed-text');
  const genLengthInput = document.getElementById('slm-gen-length');
  const tempInput = document.getElementById('slm-temperature');

  if (trainBtn) {
    trainBtn.onclick = () => trainSLM();
  }

  if (generateBtn) {
    generateBtn.onclick = () => generateSLMText();
  }

  // Initialize training chart
  initSLMTrainingChart();
}

function initSLMTrainingChart() {
  const canvas = document.getElementById('slm-training-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  
  // Draw initial chart
  ctx.strokeStyle = '#000000';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(50, 250);
  ctx.lineTo(550, 250);
  ctx.moveTo(50, 50);
  ctx.lineTo(50, 250);
  ctx.stroke();
  
  // Labels
  ctx.fillStyle = '#000000';
  ctx.font = '12px Arial';
  ctx.fillText('Loss', 10, 150);
  ctx.fillText('Epochs', 300, 270);
}

function updateSLMTrainingChart(epoch, loss, accuracy) {
  const canvas = document.getElementById('slm-training-chart');
  if (!canvas) return;

  const ctx = canvas.getContext('2d');
  const maxEpochs = window.slmTotalEpochs || 10;
  const x = 50 + (epoch / maxEpochs) * 500;
  const y = 50 + (loss * 200); // Scale loss to fit chart

  // Draw point
  ctx.fillStyle = '#ff6b6b';
  ctx.beginPath();
  ctx.arc(x, y, 3, 0, 2 * Math.PI);
  ctx.fill();

  // Connect to previous point
  if (epoch > 1) {
    const prevX = 50 + ((epoch - 1) / maxEpochs) * 500;
    const prevY = 50 + (slmTrainingHistory[slmTrainingHistory.length - 2].loss * 200);
    
    ctx.strokeStyle = '#ff6b6b';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(prevX, prevY);
    ctx.lineTo(x, y);
    ctx.stroke();
  }

  // Update metrics
  const epochEl = document.getElementById('slm-current-epoch');
  const lossEl = document.getElementById('slm-current-loss');
  const accuracyEl = document.getElementById('slm-current-accuracy');

  if (epochEl) epochEl.textContent = `${epoch}/${maxEpochs}`;
  if (lossEl) lossEl.textContent = loss.toFixed(4);
  if (accuracyEl) accuracyEl.textContent = `${(accuracy * 100).toFixed(2)}%`;

  // Update progress bar
  updateSLMProgressBar(epoch, maxEpochs);
}

function updateSLMProgressBar(currentEpoch, totalEpochs) {
  const progressFill = document.getElementById('slm-progress-fill');
  const progressText = document.getElementById('slm-progress-text');
  
  if (progressFill && progressText) {
    const percentage = (currentEpoch / totalEpochs) * 100;
    progressFill.style.width = `${percentage}%`;
    progressText.textContent = `Training: ${currentEpoch}/${totalEpochs} epochs (${percentage.toFixed(1)}%)`;
  }
}

async function trainSLM() {
  const trainText = document.getElementById('slm-training-text').value;
  const epochs = parseInt(document.getElementById('slm-epochs').value);
  const layers = parseInt(document.getElementById('slm-layers').value);
  const embeddingDim = parseInt(document.getElementById('slm-embedding').value);

  if (!trainText || trainText.length < 50) {
    showPopupAlert('Please enter more training text (at least 50 characters)');
    return;
  }

  try {
    // Initialize tokenizer and build vocabulary
    slmTokenizer = new SimpleTokenizer(SLM_CONFIG.vocabSize);
    slmTokenizer.buildVocab(trainText);

    // Prepare training data
    const sequences = prepareSLMSequences(trainText, slmTokenizer);
    const { xs, ys } = vectorizeSLMData(sequences, slmTokenizer);

    // Create and train model
    SLM_CONFIG.numLayers = layers;
    SLM_CONFIG.embeddingDim = embeddingDim;
    slmModel = new SLMModel(SLM_CONFIG);

    // Set global variables
    window.slmModel = slmModel;
    window.slmTokenizer = slmTokenizer;
    window.slmTotalEpochs = epochs;

    // Initialize training visualization
    slmTrainingHistory = [];
    initSLMTrainingChart();

    // Training callbacks
    const callbacks = {
      onEpochEnd: (epoch, logs) => {
        const loss = logs.loss;
        const accuracy = logs.accuracy || 0;
        
        slmTrainingHistory.push({ epoch: epoch + 1, loss, accuracy });
        updateSLMTrainingChart(epoch + 1, loss, accuracy);
        
        console.log(`SLM Epoch ${epoch + 1}/${epochs} - Loss: ${loss.toFixed(4)}, Accuracy: ${(accuracy * 100).toFixed(2)}%`);
      }
    };

    // Train the model
    await slmModel.train({ xs, ys }, epochs, callbacks);

    // Enable generation
    const generateBtn = document.getElementById('slm-generate-btn');
    const generationViz = document.querySelector('.slm-generation-viz');
    
    if (generateBtn) generateBtn.disabled = false;
    if (generationViz) generationViz.style.display = 'block';

    showPopupAlert('SLM training completed! You can now generate text.');

  } catch (error) {
    console.error('SLM training error:', error);
    showPopupAlert('SLM training failed: ' + error.message);
  }
}

function prepareSLMSequences(text, tokenizer) {
  const sequences = [];
  const maxLength = SLM_CONFIG.maxLength;
  
  // Create overlapping sequences
  for (let i = 0; i < text.length - maxLength; i++) {
    const sequence = text.slice(i, i + maxLength);
    const nextChar = text[i + maxLength];
    
    sequences.push({
      input: sequence,
      target: nextChar
    });
  }
  
  return sequences;
}

function vectorizeSLMData(sequences, tokenizer) {
  const xs = [];
  const ys = [];
  
  sequences.forEach(seq => {
    const inputIds = tokenizer.encode(seq.input);
    const targetId = tokenizer.encode(seq.target)[1]; // Skip BOS token
    
    xs.push(inputIds);
    ys.push(targetId);
  });
  
  return {
    xs: tf.tensor2d(xs),
    ys: tf.tensor1d(ys)
  };
}

function generateSLMText() {
  if (!slmModel || !slmTokenizer) {
    showPopupAlert('Train the SLM first!');
    return;
  }

  const seedText = document.getElementById('slm-seed-text').value;
  const genLength = parseInt(document.getElementById('slm-gen-length').value);
  const temperature = parseFloat(document.getElementById('slm-temperature').value);

  if (!seedText) {
    showPopupAlert('Enter seed text first!');
    return;
  }

  try {
    let generatedText = seedText;
    let currentSequence = seedText;

    for (let i = 0; i < genLength; i++) {
      // Prepare input
      const inputIds = slmTokenizer.encode(currentSequence);
      const inputTensor = tf.tensor2d([inputIds], [1, inputIds.length]);

      // Predict next token
      const predictions = slmModel.predict(inputTensor);
      const nextId = sampleWithTemperature(predictions.dataSync(), temperature);
      const nextChar = slmTokenizer.idToChar[nextId] || ' ';

      // Update sequence
      generatedText += nextChar;
      currentSequence = generatedText.slice(-SLM_CONFIG.maxLength);

      // Clean up tensor
      tf.dispose(inputTensor);
      tf.dispose(predictions);
    }

    // Display generated text
    const outputEl = document.getElementById('slm-generated-text');
    if (outputEl) {
      outputEl.textContent = generatedText;
      outputEl.style.background = '#f8f9fa';
      outputEl.style.padding = '10px';
      outputEl.style.border = '1px solid #000000';
      outputEl.style.borderRadius = '4px';
      outputEl.style.fontFamily = 'monospace';
    }

  } catch (error) {
    console.error('SLM generation error:', error);
    showPopupAlert('Generation failed: ' + error.message);
  }
}

// Expose functions to global scope
window.initSLMVisualization = initSLMVisualization;
window.trainSLM = trainSLM;
window.generateSLMText = generateSLMText;

// Initialize SLM visualization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // SLM option is already in HTML, no need to add it here
}); 