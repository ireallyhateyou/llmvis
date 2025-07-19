// Small Language Model (SLM) Implementation
// Inspired by TinyModel and modern SLM approaches

console.log('SLM: Script loading started');

// Global variables for SLM
let slmModel = null;
let slmTokenizer = null;
let slmVocab = null;
let slmTrainingData = null;
let slmTrainingHistory = [];

console.log('SLM: Global variables initialized');

// SLM Configuration - REDUCED SIZES TO PREVENT FREEZING
const SLM_CONFIG = {
  vocabSize: 50,   // Reduced from 100
  maxLength: 16,   // Reduced from 32
  embeddingDim: 32, // Reduced from 64
  numLayers: 1,    // Reduced from 2
  numHeads: 2,     // Reduced from 4
  dropout: 0.1,
  learningRate: 0.001,
  batchSize: 2     // Reduced from 4
};

console.log('SLM: Configuration loaded:', SLM_CONFIG);

// Simple tokenizer for SLM
class SimpleTokenizer {
  constructor(vocabSize = 50) {  // Reduced default
    console.log('SLM: Creating SimpleTokenizer with vocabSize:', vocabSize);
    this.vocabSize = vocabSize;
    this.charToId = {};
    this.idToChar = {};
    this.specialTokens = {
      '[PAD]': 0,
      '[UNK]': 1,
      '[BOS]': 2,
      '[EOS]': 3
    };
    console.log('SLM: SimpleTokenizer constructor completed');
  }

  buildVocab(text) {
    console.log('SLM: Building vocabulary for text length:', text.length);
    const startTime = performance.now();
    
    const chars = new Set(text.split(''));
    console.log('SLM: Unique characters found:', chars.size);
    
    const sortedChars = Array.from(chars).sort();
    
    // Add special tokens
    Object.entries(this.specialTokens).forEach(([token, id]) => {
      this.charToId[token] = id;
      this.idToChar[id] = token;
    });
    
    // Add regular characters (limit to prevent large vocab)
    const maxRegularChars = this.vocabSize - Object.keys(this.specialTokens).length;
    console.log('SLM: Adding regular characters, max:', maxRegularChars);
    
    sortedChars.slice(0, maxRegularChars).forEach((char, index) => {
      const id = index + Object.keys(this.specialTokens).length;
      this.charToId[char] = id;
      this.idToChar[id] = char;
    });
    
    const endTime = performance.now();
    console.log(`SLM: Vocabulary built in ${(endTime - startTime).toFixed(2)}ms: ${Object.keys(this.charToId).length} tokens`);
  }

  encode(text) {
    console.log('SLM: Encoding text of length:', text.length);
    const startTime = performance.now();
    
    const tokens = text.split('').map(char => 
      this.charToId[char] || this.charToId['[UNK]']
    );
    const result = [this.charToId['[BOS]'], ...tokens, this.charToId['[EOS]']];
    
    const endTime = performance.now();
    console.log(`SLM: Encoding completed in ${(endTime - startTime).toFixed(2)}ms, tokens:`, result.length);
    return result;
  }

  decode(ids) {
    console.log('SLM: Decoding', ids.length, 'tokens');
    const startTime = performance.now();
    
    const result = ids.map(id => this.idToChar[id] || '[UNK]').join('');
    
    const endTime = performance.now();
    console.log(`SLM: Decoding completed in ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  }
}

// SLM Model Architecture (Simplified and Lighter)
class SLMModel {
  constructor(config) {
    console.log('SLM: Creating SLMModel with config:', config);
    const startTime = performance.now();
    
    this.config = config;
    this.model = this.buildModel();
    
    const endTime = performance.now();
    console.log(`SLM: Model creation completed in ${(endTime - startTime).toFixed(2)}ms`);
  }

  buildModel() {
    console.log('SLM: Building model architecture');
    const startTime = performance.now();
    
    const model = tf.sequential();
    
    // Check if model would be too large
    const estimatedParams = this.config.vocabSize * this.config.embeddingDim + 
                          this.config.embeddingDim * this.config.embeddingDim * this.config.numLayers +
                          this.config.embeddingDim * this.config.vocabSize;
    
    console.log('SLM: Estimated model parameters:', estimatedParams);
    
    if (estimatedParams > 50000) {  // Limit to prevent freezing
      throw new Error(`Model too large (${estimatedParams} parameters). Reduce vocab size, embedding dim, or layers. Current values: vocabSize=${this.config.vocabSize}, embeddingDim=${this.config.embeddingDim}, numLayers=${this.config.numLayers}`);
    }
    
    // Custom fast initializer to avoid orthogonal initialization slowness
    const fastInitializer = {
      className: 'RandomNormal',
      config: {
        mean: 0,
        stddev: 0.1
      }
    };
    
    // Embedding layer
    console.log('SLM: Adding embedding layer');
    model.add(tf.layers.embedding({
      inputDim: this.config.vocabSize,
      outputDim: this.config.embeddingDim,
      inputLength: this.config.maxLength,
      maskZero: true,
      embeddingsInitializer: {
        className: 'GlorotUniform',
        config: {}
      }
    }));
    
    // Simple LSTM-based architecture (more reliable than transformer)
    console.log('SLM: Adding LSTM layer');
    model.add(tf.layers.lstm({
      units: this.config.embeddingDim,
      returnSequences: false,
      dropout: this.config.dropout,
      kernelInitializer: fastInitializer,
      recurrentInitializer: fastInitializer
    }));
    
    // Dense layers (reduced number)
    console.log('SLM: Adding dense layers, count:', this.config.numLayers);
    for (let i = 0; i < this.config.numLayers; i++) {
      console.log(`SLM: Adding dense layer ${i + 1}`);
      model.add(tf.layers.dense({
        units: this.config.embeddingDim,
        activation: 'relu',
        kernelInitializer: {
          className: 'GlorotUniform',
          config: {}
        }
      }));
      
      model.add(tf.layers.dropout({ rate: this.config.dropout }));
    }
    
    // Output layer
    console.log('SLM: Adding output layer');
    model.add(tf.layers.dense({
      units: this.config.vocabSize,
      activation: 'softmax',
      kernelInitializer: {
        className: 'GlorotUniform',
        config: {}
      }
    }));
    
    console.log('SLM: Compiling model');
    model.compile({
      optimizer: tf.train.adam(this.config.learningRate),
      loss: 'sparseCategoricalCrossentropy',
      metrics: ['accuracy']
    });
    
    const endTime = performance.now();
    console.log(`SLM: Model build completed in ${(endTime - startTime).toFixed(2)}ms`);
    return model;
  }

  async train(data, epochs, callbacks) {
    console.log('SLM: Starting training with epochs:', epochs);
    console.log('SLM: Training data shape:', data.xs.shape);
    
    // Check data size before training
    const dataSize = data.xs.shape[0] * data.xs.shape[1];
    console.log('SLM: Training data size:', dataSize, 'elements');
    
    if (dataSize > 10000) {
      throw new Error(`Training data too large (${dataSize} elements). Use shorter text or reduce sequence length.`);
    }
    
    // Force garbage collection before training to free memory
    if (typeof window !== 'undefined' && window.gc) {
      console.log('SLM: Running garbage collection before training');
      window.gc();
    }
    
    const startTime = performance.now();
    
    // Use smaller batch size and add memory management
    const trainingConfig = {
      epochs: epochs,
      batchSize: Math.min(this.config.batchSize, 2), // Reduce batch size to prevent memory issues
      validationSplit: 0.2,
      callbacks: callbacks,
      verbose: 0
    };
    
    console.log('SLM: Training config:', trainingConfig);
    
    const history = await this.model.fit(data.xs, data.ys, trainingConfig);
    
    const endTime = performance.now();
    console.log(`SLM: Training completed in ${(endTime - startTime).toFixed(2)}ms`);
    return history;
  }

  predict(input) {
    console.log('SLM: Making prediction, input shape:', input.shape);
    const startTime = performance.now();
    
    const result = this.model.predict(input);
    
    const endTime = performance.now();
    console.log(`SLM: Prediction completed in ${(endTime - startTime).toFixed(2)}ms`);
    return result;
  }
}

// SLM Training Visualization
let slmTrainingChart = null;
let slmLossData = [];
let slmAnimationFrame = null;
let slmGenerationVisualization = null;

function initSLMVisualization() {
  console.log('SLM: Initializing SLM visualization');
  const startTime = performance.now();
  
  const container = document.getElementById('slm-vis');
  if (!container) {
    console.error('SLM: Container #slm-vis not found');
    return;
  }

  // Remove existing SLM visualization
  const existingSLM = container.querySelector('.slm-viz-container');
  if (existingSLM) {
    console.log('SLM: Removing existing SLM visualization');
    existingSLM.remove();
  }

  console.log('SLM: Creating SLM visualization section');
  // Create SLM visualization section
  const slmVizSection = document.createElement('div');
  slmVizSection.className = 'slm-viz-container';
  slmVizSection.innerHTML = `
    <h3>Small Language Model (SLM) Training</h3>
    
    <!-- Training Controls -->
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
          <input type="number" id="slm-layers" value="1" min="1" max="2">
        </div>
        <div class="param-group">
          <label for="slm-embedding">Embedding Dim:</label>
          <input type="number" id="slm-embedding" value="32" min="16" max="64">
        </div>
      </div>
      
      <div class="button-group">
        <button id="slm-train-btn" class="train-btn">Train SLM</button>
      </div>
      
      <div id="slm-train-status" class="train-status">Ready to train</div>
    </div>
    
    <!-- Training Visualization -->
    <div class="slm-training-viz">
      <div class="training-chart-container">
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
    
    <!-- Tokenizer Visualization -->
    <div class="slm-tokenizer-viz">
      <h4>Tokenizer Analysis</h4>
      <div class="tokenizer-info">
        <div class="tokenizer-stats">
          <div class="stat-item">
            <span class="stat-label">Vocabulary Size:</span>
            <span id="slm-vocab-size" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Special Tokens:</span>
            <span id="slm-special-tokens" class="stat-value">0</span>
          </div>
          <div class="stat-item">
            <span class="stat-label">Unique Characters:</span>
            <span id="slm-unique-chars" class="stat-value">0</span>
          </div>
        </div>
        <div class="tokenizer-preview">
          <label>Sample Tokenization:</label>
          <div id="slm-tokenization-preview" class="tokenization-display"></div>
        </div>
      </div>
    </div>
  `;

  container.appendChild(slmVizSection);
  console.log('SLM: Visualization section added to container');

  // Add event listeners
  console.log('SLM: Adding event listeners');
  const trainBtn = document.getElementById('slm-train-btn');

  if (trainBtn) {
    trainBtn.onclick = () => {
      console.log('SLM: Train button clicked');
      trainSLM();
    };
  } else {
    console.error('SLM: Train button not found');
  }

  // Initialize training chart
  console.log('SLM: Initializing training chart');
  initSLMTrainingChart();
  
  const endTime = performance.now();
  console.log(`SLM: Visualization initialization completed in ${(endTime - startTime).toFixed(2)}ms`);
}

function initSLMTrainingChart() {
  const canvas = document.getElementById('slm-training-chart');
  if (!canvas) {
    console.error('SLM: training-chart canvas not found');
    return;
  }
  
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    console.error('SLM: Could not get canvas context');
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
    console.error('SLM: slmTrainingChart not initialized');
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
    
    // Update metrics display
    updateSLMMetricsDisplay(epoch, loss, minLoss);
  });
}

function updateSLMMetricsDisplay(epoch, loss, minLoss) {
  const currentLossEl = document.getElementById('slm-current-loss');
  const currentEpochEl = document.getElementById('slm-current-epoch');
  const bestLossEl = document.getElementById('slm-best-loss');
  
  if (currentLossEl) currentLossEl.textContent = loss.toFixed(4);
  if (currentEpochEl) currentEpochEl.textContent = epoch;
  if (bestLossEl) bestLossEl.textContent = minLoss.toFixed(4);
}

function updateSLMProgressBar(currentEpoch, totalEpochs) {
  const progressFill = document.getElementById('slm-progress-fill');
  const progressText = document.getElementById('slm-progress-text');
  
  if (progressFill) {
    const progress = (currentEpoch / totalEpochs) * 100;
    progressFill.style.width = `${progress}%`;
  }
  
  if (progressText) {
    progressText.textContent = `Training... Epoch ${currentEpoch}/${totalEpochs}`;
  }
}

// Function to update tokenizer visualization
function updateTokenizerViz(tokenizer, sampleText = "Hello world!") {
  console.log('SLM: Updating tokenizer visualization');
  
  if (!tokenizer) return;
  
  // Update stats
  const vocabSizeEl = document.getElementById('slm-vocab-size');
  const specialTokensEl = document.getElementById('slm-special-tokens');
  const uniqueCharsEl = document.getElementById('slm-unique-chars');
  
  if (vocabSizeEl) vocabSizeEl.textContent = Object.keys(tokenizer.charToId).length;
  if (specialTokensEl) specialTokensEl.textContent = Object.keys(tokenizer.specialTokens).length;
  if (uniqueCharsEl) uniqueCharsEl.textContent = Object.keys(tokenizer.charToId).length - Object.keys(tokenizer.specialTokens).length;
  
  // Show sample tokenization
  const previewEl = document.getElementById('slm-tokenization-preview');
  if (previewEl) {
    try {
      const tokens = tokenizer.encode(sampleText);
      const decoded = tokenizer.decode(tokens);
      
      previewEl.innerHTML = `
        <div class="tokenization-item">
          <strong>Input:</strong> "${sampleText}"
        </div>
        <div class="tokenization-item">
          <strong>Tokens:</strong> [${tokens.join(', ')}]
        </div>
        <div class="tokenization-item">
          <strong>Decoded:</strong> "${decoded}"
        </div>
      `;
    } catch (error) {
      previewEl.innerHTML = `<div class="error">Error tokenizing sample text</div>`;
    }
  }
}

async function trainSLM() {
  console.log('SLM: trainSLM function called');
  const startTime = performance.now();
  
  // Check and configure backend
  try {
    const currentBackend = tf.getBackend();
    console.log('SLM: Current backend:', currentBackend);
    
    // If WASM backend is causing issues, fallback to CPU
    if (currentBackend === 'wasm') {
      console.log('SLM: WASM backend detected, switching to CPU for stability');
      await tf.setBackend('cpu');
    }
    
    // Ensure we have a working backend
    if (!tf.getBackend()) {
      console.log('SLM: No backend detected, setting CPU backend');
      await tf.setBackend('cpu');
    }
    
    console.log('SLM: Using backend:', tf.getBackend());
  } catch (error) {
    console.error('SLM: Backend configuration error:', error);
    // Continue with whatever backend is available
  }
  
  const trainText = document.getElementById('slm-train-text').value;
  const epochs = parseInt(document.getElementById('slm-epochs').value);
  const batchSize = parseInt(document.getElementById('slm-batch-size').value);
  const seqLength = parseInt(document.getElementById('slm-seq-length').value);

  console.log('SLM: Training parameters - text length:', trainText.length, 'epochs:', epochs, 'batchSize:', batchSize, 'seqLength:', seqLength);

  if (!trainText || trainText.length < 50) {
    showPopupAlert('Please enter more training text (at least 50 characters)');
    return;
  }

  try {
    // Update status
    const status = document.getElementById('slm-status');
    if (status) {
      status.textContent = 'Preparing data...';
    }
    
    console.log('SLM: Initializing tokenizer');
    const tokenizerStartTime = performance.now();
    
    // Initialize tokenizer and build vocabulary
    slmTokenizer = new SimpleTokenizer(SLM_CONFIG.vocabSize);
    slmTokenizer.buildVocab(trainText);
    
    // Update tokenizer visualization
    updateTokenizerViz(slmTokenizer, trainText.substring(0, 50) + "...");
    
    const tokenizerEndTime = performance.now();
    console.log(`SLM: Tokenizer initialization completed in ${(tokenizerEndTime - tokenizerStartTime).toFixed(2)}ms`);

    console.log('SLM: Preparing training data');
    const dataPrepStartTime = performance.now();
    
    // Prepare training data
    const sequences = prepareSLMSequences(trainText, slmTokenizer);
    const { xs, ys } = vectorizeSLMData(sequences, slmTokenizer);
    
    const dataPrepEndTime = performance.now();
    console.log(`SLM: Data preparation completed in ${(dataPrepEndTime - dataPrepStartTime).toFixed(2)}ms`);

    console.log('SLM: Creating model');
    const modelStartTime = performance.now();
    
    // Update SLM_CONFIG with new parameters
    SLM_CONFIG.maxLength = seqLength;
    SLM_CONFIG.batchSize = batchSize;
    
    // Create and train model
    slmModel = new SLMModel(SLM_CONFIG);
    
    const modelEndTime = performance.now();
    console.log(`SLM: Model creation completed in ${(modelEndTime - modelStartTime).toFixed(2)}ms`);

    // Set global variables
    window.slmModel = slmModel;
    window.slmTokenizer = slmTokenizer;
    window.slmTotalEpochs = epochs;

    // Initialize training visualization
    slmTrainingHistory = [];
    // initSLMTrainingChart(); // This is now handled by initSLMVisualization

    // Training callbacks
    const callbacks = {
      onEpochEnd: (epoch, logs) => {
        const loss = logs.loss;
        const accuracy = logs.accuracy || 0;
        
        slmTrainingHistory.push({ epoch: epoch + 1, loss, accuracy });
        updateSLMTrainingVisualization(epoch + 1, loss);
        
        console.log(`SLM Epoch ${epoch + 1}/${epochs} - Loss: ${loss.toFixed(4)}, Accuracy: ${(accuracy * 100).toFixed(2)}%`);
        
        // Force tensor cleanup after each epoch to prevent memory buildup
        if (epoch % 5 === 0) {
          console.log('SLM: Running tensor cleanup after epoch', epoch + 1);
          tf.tidy(() => {
            // This will clean up any tensors created during the epoch
          });
        }
      }
    };

    console.log('SLM: Starting model training');
    const trainingStartTime = performance.now();
    
    // Train the model
    await slmModel.train({ xs, ys }, epochs, callbacks);
    
    const trainingEndTime = performance.now();
    console.log(`SLM: Model training completed in ${(trainingEndTime - trainingStartTime).toFixed(2)}ms`);

    // Enable generation
    if (status) {
      status.textContent = 'Training completed! Initializing generation interface...';
      status.style.color = '#28a745';
    }
    
    // Initialize generation visualization
    console.log('SLM: Initializing generation visualization');
    initSLMGenerationVisualization();
    
    // Update status after generation interface is ready
    setTimeout(() => {
      if (status) {
        status.textContent = 'Training completed! Use the generation controls below to generate text.';
      }
    }, 1000);

    const totalTime = performance.now() - startTime;
    console.log(`SLM: Total training process completed in ${totalTime.toFixed(2)}ms`);
    showPopupAlert('SLM training completed! You can now generate text.');

  } catch (error) {
    console.error('SLM training error:', error);
    
    // Provide specific error messages for common issues
    if (error.message.includes('WASM') || error.message.includes('wasm')) {
      showPopupAlert('SLM training failed: WebAssembly loading issue. Please refresh the page and try again.');
    } else if (error.message.includes('backend')) {
      showPopupAlert('SLM training failed: TensorFlow.js backend issue. Please refresh the page and try again.');
    } else {
      showPopupAlert('SLM training failed: ' + error.message);
    }
  }
}

function prepareSLMSequences(text, tokenizer) {
  console.log('SLM: Preparing sequences for text length:', text.length);
  const startTime = performance.now();
  
  const sequences = [];
  const maxLength = SLM_CONFIG.maxLength;
  
  console.log('SLM: Creating overlapping sequences with maxLength:', maxLength);
  
  // Create overlapping sequences
  for (let i = 0; i < text.length - maxLength; i++) {
    const sequence = text.slice(i, i + maxLength);
    const nextChar = text[i + maxLength];
    
    sequences.push({
      input: sequence,
      target: nextChar
    });
  }
  
  const endTime = performance.now();
  console.log(`SLM: Sequence preparation completed in ${(endTime - startTime).toFixed(2)}ms, created ${sequences.length} sequences`);
  return sequences;
}

function vectorizeSLMData(sequences, tokenizer) {
  console.log('SLM: Vectorizing data for', sequences.length, 'sequences');
  const startTime = performance.now();
  
  // Limit sequences to prevent memory issues
  const maxSequences = 500;
  if (sequences.length > maxSequences) {
    sequences = sequences.slice(0, maxSequences);
    console.log(`SLM: Limited sequences to ${maxSequences} to prevent memory issues`);
  }
  
  const xs = [];
  const ys = [];
  
  console.log('SLM: Processing sequences');
  sequences.forEach((seq, index) => {
    if (index % 100 === 0) {
      console.log(`SLM: Processing sequence ${index}/${sequences.length}`);
    }
    
    const inputIds = tokenizer.encode(seq.input);
    const targetId = tokenizer.encode(seq.target)[1]; // Skip BOS token
    
    // Ensure inputIds doesn't exceed maxLength
    if (inputIds.length > SLM_CONFIG.maxLength) {
      inputIds.splice(SLM_CONFIG.maxLength);
    }
    
    // Pad or truncate to maxLength
    while (inputIds.length < SLM_CONFIG.maxLength) {
      inputIds.push(tokenizer.charToId['[PAD]'] || 0);
    }
    
    xs.push(inputIds);
    ys.push(targetId);
  });
  
  // Check tensor size before creating
  const totalElements = xs.length * xs[0].length;
  console.log('SLM: Tensor size check - total elements:', totalElements);
  
  if (totalElements > 10000) {
    throw new Error(`Tensor too large (${totalElements} elements). Use shorter text or reduce sequence length.`);
  }
  
  console.log('SLM: Creating tensors');
  const tensorStartTime = performance.now();
  
  // Use tf.tidy to automatically clean up tensors
  const result = tf.tidy(() => {
    return {
      xs: tf.tensor2d(xs),
      ys: tf.tensor1d(ys)
    };
  });
  
  const tensorEndTime = performance.now();
  console.log(`SLM: Tensor creation completed in ${(tensorEndTime - tensorStartTime).toFixed(2)}ms`);
  
  const endTime = performance.now();
  console.log(`SLM: Vectorization completed in ${(endTime - startTime).toFixed(2)}ms`);
  return result;
}

async function generateSLMText(model, seedText, tokenizer, length = 50, temperature = 0.8) {
  console.log('SLM: generateSLMText function called');
  const startTime = performance.now();
  
  if (!model || !tokenizer) {
    console.error('SLM: Model or tokenizer not available');
    return null;
  }

  console.log('SLM: Generation parameters - seed length:', seedText.length, 'length:', length, 'temperature:', temperature);

  if (!seedText) {
    console.error('SLM: No seed text provided');
    return null;
  }

  try {
    let generatedText = seedText;
    let currentSequence = seedText;

    console.log('SLM: Starting text generation');
    
    for (let i = 0; i < length; i++) {
      if (i % 10 === 0) {
        console.log(`SLM: Generating character ${i + 1}/${length}`);
      }
      
      // Prepare input
      const inputIds = tokenizer.encode(currentSequence);
      const inputTensor = tf.tensor2d([inputIds], [1, inputIds.length]);

      // Predict next token
      const predictions = model.predict(inputTensor);
      const nextId = sampleWithTemperature(predictions.dataSync(), temperature);
      const nextChar = tokenizer.idToChar[nextId] || ' ';

      // Update sequence
      generatedText += nextChar;
      currentSequence = generatedText.slice(-SLM_CONFIG.maxLength);

      // Clean up tensor
      tf.dispose(inputTensor);
      tf.dispose(predictions);
    }

    const endTime = performance.now();
    console.log(`SLM: Text generation completed in ${(endTime - startTime).toFixed(2)}ms`);
    
    return generatedText;

  } catch (error) {
    console.error('SLM generation error:', error);
    return null;
  }
}

// Helper function for temperature sampling
function sampleWithTemperature(logits, temperature) {
  console.log('SLM: Sampling with temperature:', temperature, 'logits length:', logits.length);
  const startTime = performance.now();
  
  const logitsArray = Array.from(logits);
  const scaledLogits = logitsArray.map(logit => logit / temperature);
  const maxLogit = Math.max(...scaledLogits);
  const expLogits = scaledLogits.map(logit => Math.exp(logit - maxLogit));
  const sumExpLogits = expLogits.reduce((sum, exp) => sum + exp, 0);
  const probabilities = expLogits.map(exp => exp / sumExpLogits);
  
  // Sample from the distribution
  const random = Math.random();
  let cumulative = 0;
  for (let i = 0; i < probabilities.length; i++) {
    cumulative += probabilities[i];
    if (random <= cumulative) {
      const endTime = performance.now();
      console.log(`SLM: Sampling completed in ${(endTime - startTime).toFixed(2)}ms, selected index:`, i);
      return i;
    }
  }
  
  const endTime = performance.now();
  console.log(`SLM: Sampling completed in ${(endTime - startTime).toFixed(2)}ms, fallback index:`, probabilities.length - 1);
  return probabilities.length - 1;
}

// Expose functions to global scope
window.initSLMVisualization = initSLMVisualization;
window.trainSLM = trainSLM;
window.generateSLMText = generateSLMText;
window.generateSLMNextCharacter = generateSLMNextCharacter;

// Initialize SLM visualization when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  // SLM option is already in HTML, no need to add it here
});

console.log('SLM: Script loading completed successfully'); 

// SLM Generation Visualization
function initSLMGenerationVisualization() {
  const visContainer = document.getElementById('slm-vis');
  if (!visContainer) return;
  
  // Remove any existing generation visualization
  const existingGenViz = visContainer.querySelector('.slm-generation-viz-container');
  if (existingGenViz) {
    existingGenViz.remove();
  }
  
  // Add generation visualization section
  const genVizSection = document.createElement('div');
  genVizSection.className = 'slm-generation-viz-container';
  genVizSection.innerHTML = `
    <h3>Real-Time SLM Text Generation</h3>
    <div class="generation-controls">
      <div class="input-group">
        <label for="slm-generation-seed">Seed Text:</label>
        <input type="text" id="slm-generation-seed" placeholder="Roses are" value="Roses are" style="width: 300px;">
      </div>
      <div class="input-group">
        <label for="slm-generation-length">Length:</label>
        <input type="number" id="slm-generation-length" value="50" min="10" max="200">
      </div>
      <div class="input-group">
        <label for="slm-generation-temp">Temperature:</label>
        <input type="number" id="slm-generation-temp" value="0.8" min="0.1" max="2" step="0.1">
      </div>
      <div class="input-group">
        <label for="slm-generation-speed">Speed:</label>
        <input type="range" id="slm-generation-speed" min="50" max="500" value="200">
        <span id="slm-speed-value">200ms</span>
      </div>
    </div>
    <div class="generation-display">
      <div class="seed-text-container">
        <label>Seed Text:</label>
        <div id="slm-seed-display" class="seed-display"></div>
      </div>
      <div class="generation-container">
        <label>Generated Text:</label>
        <div id="slm-generation-display" class="generation-display"></div>
      </div>
      <div class="prediction-container">
        <label>Next Character Prediction:</label>
        <div id="slm-prediction-display" class="prediction-display"></div>
      </div>
    </div>
    <div class="generation-controls">
      <button id="slm-start-generation" class="gen-btn">Start Generation</button>
      <button id="slm-pause-generation" class="gen-btn" disabled>Pause</button>
      <button id="slm-reset-generation" class="gen-btn">Reset</button>
    </div>
  `;
  
  visContainer.appendChild(genVizSection);
  
  // Add event listeners
  const startBtn = document.getElementById('slm-start-generation');
  const pauseBtn = document.getElementById('slm-pause-generation');
  const resetBtn = document.getElementById('slm-reset-generation');
  const speedSlider = document.getElementById('slm-generation-speed');
  const speedValue = document.getElementById('slm-speed-value');
  
  if (startBtn) {
    startBtn.onclick = () => startSLMGenerationVisualization();
  }
  if (pauseBtn) {
    pauseBtn.onclick = () => pauseSLMGenerationVisualization();
  }
  if (resetBtn) {
    resetBtn.onclick = () => resetSLMGenerationVisualization();
  }
  if (speedSlider) {
    speedSlider.oninput = (e) => {
      speedValue.textContent = e.target.value + 'ms';
      if (slmGenerationVisualization) {
        slmGenerationVisualization.speed = parseInt(e.target.value);
      }
    };
  }
  
  slmGenerationVisualization = {
    isGenerating: false,
    speed: 200,
    currentText: '',
    seedText: '',
    timer: null
  };
}

function startSLMGenerationVisualization() {
  if (!window.slmModel || !window.slmTokenizer) {
    showPopupAlert('Train the SLM model first!');
    return;
  }
  
  const seedInput = document.getElementById('slm-generation-seed');
  if (!seedInput || !seedInput.value) {
    showPopupAlert('Enter a seed text first!');
    return;
  }
  
  const startBtn = document.getElementById('slm-start-generation');
  const pauseBtn = document.getElementById('slm-pause-generation');
  const seedDisplay = document.getElementById('slm-seed-display');
  const generationDisplay = document.getElementById('slm-generation-display');
  const predictionDisplay = document.getElementById('slm-prediction-display');
  
  if (startBtn) startBtn.disabled = true;
  if (pauseBtn) pauseBtn.disabled = false;
  
  slmGenerationVisualization.isGenerating = true;
  slmGenerationVisualization.seedText = seedInput.value;
  slmGenerationVisualization.currentText = slmGenerationVisualization.seedText;
  
  if (seedDisplay) {
    seedDisplay.textContent = slmGenerationVisualization.seedText;
    seedDisplay.className = 'seed-display active';
  }
  
  if (generationDisplay) {
    generationDisplay.textContent = '';
    generationDisplay.className = 'generation-display active';
  }
  
  if (predictionDisplay) {
    predictionDisplay.innerHTML = '';
    predictionDisplay.className = 'prediction-display active';
  }
  
  // Start generation loop
  slmGenerationVisualization.timer = setInterval(() => {
    if (!slmGenerationVisualization.isGenerating) return;
    
    generateSLMNextCharacter();
  }, slmGenerationVisualization.speed);
}

function pauseSLMGenerationVisualization() {
  slmGenerationVisualization.isGenerating = false;
  
  const startBtn = document.getElementById('slm-start-generation');
  const pauseBtn = document.getElementById('slm-pause-generation');
  
  if (startBtn) startBtn.disabled = false;
  if (pauseBtn) pauseBtn.disabled = true;
  
  if (slmGenerationVisualization.timer) {
    clearInterval(slmGenerationVisualization.timer);
  }
}

function resetSLMGenerationVisualization() {
  pauseSLMGenerationVisualization();
  
  const seedDisplay = document.getElementById('slm-seed-display');
  const generationDisplay = document.getElementById('slm-generation-display');
  const predictionDisplay = document.getElementById('slm-prediction-display');
  
  if (seedDisplay) {
    seedDisplay.textContent = '';
    seedDisplay.className = 'seed-display';
  }
  
  if (generationDisplay) {
    generationDisplay.textContent = '';
    generationDisplay.className = 'generation-display';
  }
  
  if (predictionDisplay) {
    predictionDisplay.innerHTML = '';
    predictionDisplay.className = 'prediction-display';
  }
  
  slmGenerationVisualization.currentText = '';
  slmGenerationVisualization.seedText = '';
}

async function generateSLMNextCharacter() {
  console.log('SLM: generateSLMNextCharacter called');
  
  if (!window.slmModel || !window.slmTokenizer) {
    console.error('SLM: Model or tokenizer not available');
    return;
  }
  
  try {
    // Get current sequence
    const currentText = slmGenerationVisualization.currentText;
    const maxLength = parseInt(document.getElementById('slm-generation-length')?.value || 50);
    const temperature = parseFloat(document.getElementById('slm-generation-temp')?.value || 0.8);
    
    if (currentText.length >= maxLength) {
      pauseSLMGenerationVisualization();
      return;
    }
    
    // Generate next character using the updated function
    const nextChar = await generateSLMText(window.slmModel, currentText, window.slmTokenizer, 1, temperature);
    
    if (nextChar && nextChar.length > currentText.length) {
      // Extract just the next character
      const newChar = nextChar.slice(currentText.length);
      
      // Update current text
      slmGenerationVisualization.currentText += newChar;
      
      // Update displays
      updateSLMGenerationDisplays(newChar);
      
      // Update generation display
      const generationDisplay = document.getElementById('slm-generation-display');
      if (generationDisplay) {
        generationDisplay.textContent = slmGenerationVisualization.currentText.slice(slmGenerationVisualization.seedText.length);
      }
    }
    
  } catch (error) {
    console.error('SLM: Error generating next character:', error);
    pauseSLMGenerationVisualization();
  }
}

function updateSLMGenerationDisplays(nextChar) {
  const predictionDisplay = document.getElementById('slm-prediction-display');
  
  if (predictionDisplay) {
    // Create character display without animation
    const charSpan = document.createElement('span');
    charSpan.textContent = nextChar;
    charSpan.className = 'generated-char';
    
    predictionDisplay.appendChild(charSpan);
    
    // Clear after a short delay
    setTimeout(() => {
      if (charSpan.parentNode) {
        charSpan.parentNode.removeChild(charSpan);
      }
    }, 300);
  }
} 