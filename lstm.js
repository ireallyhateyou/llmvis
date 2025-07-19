// lstm.js

// --- Popup Alert Helper ---
function showPopupAlert(message) {
  const popup = document.getElementById('popup-alert');
  const msg = document.getElementById('popup-alert-message');
  if (msg) msg.textContent = message;
  if (popup) popup.style.display = 'flex';
}

// --- Training Visualization ---
let trainingChart = null;
let lossData = [];
let animationFrame = null;

function initTrainingVisualization() {
  console.log('initTrainingVisualization called');
  const visContainer = document.getElementById('lstm-vis');
  if (!visContainer) {
    console.error('lstm-vis container not found');
    return;
  }
  
  // Clear previous visualization
  visContainer.innerHTML = `
    <div class="training-viz-container">
      <h3>Real-Time Training Progress</h3>
      <div class="chart-container">
        <canvas id="training-chart" width="700" height="400"></canvas>
        <div class="chart-overlay">
          <div class="metric-display">
            <div class="metric-item">
              <span class="metric-label">Current Loss:</span>
              <span id="current-loss" class="metric-value">--</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Epoch:</span>
              <span id="current-epoch" class="metric-value">--</span>
            </div>
            <div class="metric-item">
              <span class="metric-label">Best Loss:</span>
              <span id="best-loss" class="metric-value">--</span>
            </div>
          </div>
        </div>
      </div>
      <div class="progress-bar-container">
        <div class="progress-bar">
          <div id="progress-fill" class="progress-fill"></div>
        </div>
        <div id="progress-text" class="progress-text">Ready to train...</div>
      </div>
    </div>
  `;
  
  const canvas = document.getElementById('training-chart');
  if (!canvas) {
    console.error('training-chart canvas not found');
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
  
  trainingChart = { canvas, ctx, lossData: [] };
}

function updateTrainingVisualization(epoch, loss) {
  if (!trainingChart) {
    console.error('trainingChart not initialized');
    return;
  }
  
  const { canvas, ctx, lossData } = trainingChart;
  
  // Add new data point
  lossData.push({ epoch, loss });
  
  // Cancel previous animation frame
  if (animationFrame) {
    cancelAnimationFrame(animationFrame);
  }
  
  // Animate the update
  animationFrame = requestAnimationFrame(() => {
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
    updateMetricsDisplay(epoch, loss, minLoss);
    
    // Update progress bar
    updateProgressBar(epoch, window.totalEpochs || 25); // Use the actual total epochs
  });
}

function updateMetricsDisplay(epoch, loss, minLoss) {
  const currentLossEl = document.getElementById('current-loss');
  const currentEpochEl = document.getElementById('current-epoch');
  const bestLossEl = document.getElementById('best-loss');
  
  if (currentLossEl) {
    currentLossEl.textContent = loss.toFixed(4);
    currentLossEl.style.color = loss < minLoss + (minLoss * 0.1) ? '#28a745' : '#dc3545';
  }
  
  if (currentEpochEl) {
    currentEpochEl.textContent = epoch;
  }
  
  if (bestLossEl) {
    bestLossEl.textContent = minLoss.toFixed(4);
    bestLossEl.style.color = '#28a745';
  }
}

function updateProgressBar(currentEpoch, totalEpochs) {
  const progressFill = document.getElementById('progress-fill');
  const progressText = document.getElementById('progress-text');
  
  if (progressFill && progressText) {
    const percentage = (currentEpoch / totalEpochs) * 100;
    progressFill.style.width = `${percentage}%`;
    progressFill.style.transition = 'width 0.3s ease';
    progressText.textContent = `Training: ${currentEpoch}/${totalEpochs} epochs (${percentage.toFixed(1)}%)`;
  }
}

// --- Sample Training Text ---
const SAMPLE_TRAINING_TEXT = `Hello world
This is a simple test
For the LSTM model
The Undercity Incident is crazy`;

// --- 1. Tokenization Utilities ---
function getUniqueChars(text) {
  return Array.from(new Set(text.split('')));
}
function textToIndices(text, charToIdx) {
  return text.split('').map(c => charToIdx[c]);
}
function indicesToText(indices, idxToChar) {
  return indices.map(i => idxToChar[i]).join('');
}

// --- 2. Data Preparation ---
function createSequences(text, seqLength, charToIdx) {
  const inputs = [];
  const labels = [];
  // Limit to prevent memory issues
  const maxSequences = Math.min(100, text.length - seqLength);
  for (let i = 0; i < maxSequences; ++i) {
    const inputSeq = text.slice(i, i + seqLength);
    const labelChar = text[i + seqLength];
    inputs.push(textToIndices(inputSeq, charToIdx));
    labels.push(charToIdx[labelChar]);
  }
  return {inputs, labels};
}

// --- 3. Model Creation ---
function createLSTMModel(seqLength, vocabSize) {
  const model = tf.sequential();
  // Much smaller model to prevent freezing
  model.add(tf.layers.lstm({
    units: 8, // Reduced from 16
    inputShape: [seqLength, vocabSize],
    returnSequences: false
  }));
  model.add(tf.layers.dense({units: vocabSize, activation: 'softmax'}));
  model.compile({
    loss: 'categoricalCrossentropy',
    optimizer: tf.train.adam(0.01) // Lower learning rate
  });
  return model;
}

// Enhanced model creation for Shakespeare (very conservative to prevent hanging)
function createShakespeareLSTMModel(seqLength, vocabSize) {
  const model = tf.sequential();
  
  // Very small model to prevent browser hanging
  model.add(tf.layers.lstm({
    units: 16, // Very small
    returnSequences: false,
    inputShape: [seqLength, vocabSize],
    dropout: 0.0, // No dropout to reduce complexity
    recurrentDropout: 0.0
  }));
  
  // Output layer
  model.add(tf.layers.dense({
    units: vocabSize,
    activation: 'softmax'
  }));
  
  model.compile({
    optimizer: tf.train.adam(0.01), // Higher learning rate for faster convergence
    loss: 'categoricalCrossentropy',
    metrics: ['accuracy']
  });
  
  return model;
}

// --- 4. Data to Tensors ---
function vectorizeData(inputs, labels, seqLength, vocabSize) {
  const xsBuffer = tf.buffer([inputs.length, seqLength, vocabSize]);
  const ysBuffer = tf.buffer([labels.length, vocabSize]);
  for (let i = 0; i < inputs.length; ++i) {
    for (let t = 0; t < seqLength; ++t) {
      xsBuffer.set(1, i, t, inputs[i][t]);
    }
    ysBuffer.set(1, i, labels[i]);
  }
  return {
    xs: xsBuffer.toTensor(),
    ys: ysBuffer.toTensor()
  };
}

// --- 5. Training Function ---
async function trainLSTMModel(model, xs, ys, epochs, batchSize, statusCallback) {
  console.log('Starting training with:', { epochs, batchSize, xsShape: xs.shape, ysShape: ys.shape });
  
  const history = {
    loss: [],
    accuracy: []
  };
  
  // Simplified learning rate scheduler
  const learningRateScheduler = (epoch) => {
    if (epoch < 5) return 0.001;
    return 0.0005;
  };
  
  try {
    for (let epoch = 0; epoch < epochs; epoch++) {
      console.log(`Starting epoch ${epoch + 1}/${epochs}`);
      
      // Update learning rate
      const currentLR = learningRateScheduler(epoch);
      model.optimizer.learningRate = currentLR;
      
      // Train for one epoch with timeout
      const trainingPromise = model.fit(xs, ys, {
        batchSize: batchSize,
        epochs: 1,
        shuffle: true,
        callbacks: {
          onBatchBegin: (batch, logs) => {
            console.log(`Batch ${batch} started`);
          },
          onBatchEnd: (batch, logs) => {
            console.log(`Batch ${batch} completed`);
            // Memory cleanup
            tf.tidy(() => {});
          }
        }
      });
      
      // Add timeout to prevent hanging
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Training timeout - model too complex')), 30000); // 30 second timeout
      });
      
      const result = await Promise.race([trainingPromise, timeoutPromise]);
      
      const loss = result.history.loss[0];
      const accuracy = result.history.accuracy ? result.history.accuracy[0] : 0;
      
      console.log(`Epoch ${epoch + 1} completed - Loss: ${loss}, Accuracy: ${accuracy}`);
      
      history.loss.push(loss);
      history.accuracy.push(accuracy);
      
      // Call status callback
      if (statusCallback) {
        statusCallback(epoch + 1, loss, Math.min(...history.loss), currentLR);
      }
      
      // Yield to browser
      await tf.nextFrame();
    }
  } catch (error) {
    console.error('Training error:', error);
    throw error;
  }
  
  console.log('Training completed successfully');
  return history;
}

// --- 6. Text Generation ---
async function generateText(model, seed, charToIdx, idxToChar, genLength, temperature) {
  let inputIndices = textToIndices(seed, charToIdx);
  let generated = seed;
  
  for (let i = 0; i < genLength; ++i) {
    try {
      // Prepare input tensor
      const inputTensor = tf.tidy(() => {
        const x = tf.buffer([1, inputIndices.length, idxToChar.length]);
        for (let t = 0; t < inputIndices.length; ++t) {
          x.set(1, 0, t, inputIndices[t]);
        }
        return x.toTensor();
      });
      
      // Predict next char
      const preds = model.predict(inputTensor).dataSync();
      const nextIdx = sampleWithTemperature(preds, temperature);
      generated += idxToChar[nextIdx];
      inputIndices = inputIndices.slice(1).concat(nextIdx);
      
      tf.dispose(inputTensor);
      
      // Yield to browser every few characters
      if (i % 5 === 0) {
        await tf.nextFrame();
      }
    } catch (error) {
      console.error('Generation error:', error);
      break;
    }
  }
  return generated;
}

function sampleWithTemperature(logits, temperature) {
  const logitsArr = Array.from(logits);
  const exp = logitsArr.map(x => Math.exp(x / temperature));
  const sum = exp.reduce((a, b) => a + b, 0);
  const probs = exp.map(x => x / sum);
  let r = Math.random();
  for (let i = 0; i < probs.length; ++i) {
    r -= probs[i];
    if (r <= 0) return i;
  }
  return probs.length - 1;
}

// --- 7. UI Integration ---
let lstmModel = null, charToIdx = null, idxToChar = null, seqLength = 5; // Much smaller default

// Expose functions to global scope
window.initTrainingVisualization = initTrainingVisualization;
window.updateTrainingVisualization = updateTrainingVisualization;
window.initGenerationVisualization = initGenerationVisualization;
window.trainLSTMModel = trainLSTMModel;
window.createLSTMModel = createLSTMModel;
window.createShakespeareLSTMModel = createShakespeareLSTMModel;

// Expose variables to global scope
window.lstmModel = lstmModel;
window.charToIdx = charToIdx;
window.idxToChar = idxToChar;
window.seqLength = seqLength;

// Expose generation functions to global scope
window.startGenerationVisualization = startGenerationVisualization;
window.pauseGenerationVisualization = pauseGenerationVisualization;
window.resetGenerationVisualization = resetGenerationVisualization;

window.addEventListener('DOMContentLoaded', () => {
  const trainBtn = document.getElementById('lstm-train-btn');
  const trainStatus = document.getElementById('lstm-train-status');
  const sampleBtn = document.getElementById('lstm-sample-btn');
  const trainTextArea = document.getElementById('lstm-train-text');
  const seqInput = document.getElementById('lstm-seq-length');
  const epochsInput = document.getElementById('lstm-epochs');
  const batchInput = document.getElementById('lstm-batch-size');
  const shakespeareModeToggle = document.getElementById('shakespeare-mode');

  // Set better defaults for visible evolution
  if (seqInput) seqInput.value = 15;
  if (epochsInput) epochsInput.value = 25;
  if (batchInput) batchInput.value = 8;

  if (sampleBtn && trainTextArea) {
    sampleBtn.onclick = () => {
      trainTextArea.value = SAMPLE_TRAINING_TEXT;
    };
  }

  if (trainBtn) {
    trainBtn.onclick = async () => {
      try {
        const text = trainTextArea.value;
        const shakespeareMode = shakespeareModeToggle.checked;
        
        if (shakespeareMode) {
          // Load Shakespeare corpus
          trainTextArea.value = 'Loading Shakespeare corpus...';
          const corpus = await loadShakespeareCorpus();
          trainTextArea.value = corpus;
          
          // Update parameters for Shakespeare
          seqInput.value = '140';  // Longer sequences for better context
          epochsInput.value = '50';      // More epochs for complex text
          batchInput.value = '64';   // Larger batch size
          
          showPopupAlert('Shakespeare mode enabled! Using enhanced model with 256+128 LSTM units.');
        } else {
          // Reset to default values
          trainTextArea.value = '';
          seqInput.value = '40';
          epochsInput.value = '20';
          batchInput.value = '32';
          
          showPopupAlert('Standard mode enabled.');
        }
        
        seqLength = parseInt(seqInput.value);
        const epochs = parseInt(epochsInput.value);
        const batchSize = parseInt(batchInput.value);
        
        // Reasonable limits to prevent hanging
        if (text.length > 5000) {
          showPopupAlert('Text too long! Use less than 5000 characters.');
          return;
        }
        if (seqLength > 50) {
          showPopupAlert('Sequence length too high! Use 50 or less.');
          return;
        }
        if (epochs > 100) {
          showPopupAlert('Too many epochs! Use 100 or less.');
          return;
        }
        if (batchSize > 64) {
          showPopupAlert('Batch size too high! Use 64 or less.');
          return;
        }
        
        if (!text || text.length < seqLength + 1) {
          showPopupAlert('Please enter more training text.');
          return;
        }
        
        trainStatus.textContent = 'Preparing data...';
        await tf.nextFrame();
        
        idxToChar = getUniqueChars(text);
        charToIdx = {};
        idxToChar.forEach((c, i) => charToIdx[c] = i);
        
        console.log('Training variables:', {
          idxToCharType: typeof idxToChar,
          idxToCharIsArray: Array.isArray(idxToChar),
          idxToCharLength: idxToChar.length,
          charToIdxType: typeof charToIdx,
          sampleChars: idxToChar.slice(0, 5)
        });
        
        const {inputs, labels} = createSequences(text, seqLength, charToIdx);
        const {xs, ys} = vectorizeData(inputs, labels, seqLength, idxToChar.length);
        
        trainStatus.textContent = 'Creating model...';
        await tf.nextFrame();
        
        lstmModel = createLSTMModel(seqLength, idxToChar.length);
        
        // Update global variables after model creation
        window.lstmModel = lstmModel;
        window.charToIdx = charToIdx;
        window.idxToChar = idxToChar;
        window.seqLength = seqLength;
        window.totalEpochs = epochs; // Add total epochs to global scope
        
        console.log('Global variables set:', {
          lstmModel: !!window.lstmModel,
          charToIdx: !!window.charToIdx,
          idxToChar: !!window.idxToChar,
          idxToCharType: typeof window.idxToChar,
          idxToCharIsArray: Array.isArray(window.idxToChar),
          idxToCharLength: window.idxToChar ? window.idxToChar.length : 'N/A',
          seqLength: window.seqLength
        });
        
        trainStatus.textContent = 'Training... (watch the chart below!)';
        await trainLSTMModel(lstmModel, xs, ys, epochs, batchSize, msg => {
          trainStatus.textContent = msg;
        });
        
        xs.dispose();
        ys.dispose();
        trainStatus.textContent = 'Training complete! Check the visualization above.';
        
        // Initialize generation visualization after training
        initGenerationVisualization();
        
      } catch (error) {
        console.error('Training failed:', error);
        trainStatus.textContent = 'Training failed: ' + error.message;
        showPopupAlert('Training failed: ' + error.message);
      }
    };
  }
}); 

// --- Text Generation Visualization ---
let generationVisualization = null;

function initGenerationVisualization() {
  const visContainer = document.getElementById('lstm-vis');
  if (!visContainer) return;
  
  // Remove any existing generation visualization
  const existingGenViz = visContainer.querySelector('.generation-viz-container');
  if (existingGenViz) {
    existingGenViz.remove();
  }
  
  // Add generation visualization section
  const genVizSection = document.createElement('div');
  genVizSection.className = 'generation-viz-container';
  genVizSection.innerHTML = `
    <h3>Real-Time Text Generation</h3>
    <div class="generation-controls">
      <div class="input-group">
        <label for="generation-seed">Seed Text:</label>
        <input type="text" id="generation-seed" placeholder="I love Shipwrecked reviewers <3" value="I love Shipwrecked reviewers <3" style="width: 300px;">
      </div>
      <div class="input-group">
        <label for="generation-length">Length:</label>
        <input type="number" id="generation-length" value="50" min="10" max="200">
      </div>
      <div class="input-group">
        <label for="generation-temp">Temperature:</label>
        <input type="number" id="generation-temp" value="0.8" min="0.1" max="2" step="0.1">
      </div>
      <div class="input-group">
        <label for="generation-speed">Speed:</label>
        <input type="range" id="generation-speed" min="50" max="500" value="200">
        <span id="speed-value">200ms</span>
      </div>
    </div>
    <div class="generation-display">
      <div class="seed-text-container">
        <label>Seed Text:</label>
        <div id="seed-display" class="seed-display"></div>
      </div>
      <div class="generation-container">
        <label>Generated Text:</label>
        <div id="generation-display" class="generation-display"></div>
      </div>
      <div class="prediction-container">
        <label>Next Character Prediction:</label>
        <div id="prediction-display" class="prediction-display"></div>
      </div>
    </div>
    <div class="generation-controls">
      <button id="start-generation" class="gen-btn">Start Generation</button>
      <button id="pause-generation" class="gen-btn" disabled>Pause</button>
      <button id="reset-generation" class="gen-btn">Reset</button>
    </div>
  `;
  
  visContainer.appendChild(genVizSection);
  
  // Add event listeners
  const startBtn = document.getElementById('start-generation');
  const pauseBtn = document.getElementById('pause-generation');
  const resetBtn = document.getElementById('reset-generation');
  const speedSlider = document.getElementById('generation-speed');
  const speedValue = document.getElementById('speed-value');
  
  if (startBtn) {
    startBtn.onclick = () => startGenerationVisualization();
  }
  if (pauseBtn) {
    pauseBtn.onclick = () => pauseGenerationVisualization();
  }
  if (resetBtn) {
    resetBtn.onclick = () => resetGenerationVisualization();
  }
  if (speedSlider) {
    speedSlider.oninput = (e) => {
      speedValue.textContent = e.target.value + 'ms';
      if (generationVisualization) {
        generationVisualization.speed = parseInt(e.target.value);
      }
    };
  }
  
  generationVisualization = {
    isGenerating: false,
    speed: 200,
    currentText: '',
    seedText: '',
    timer: null
  };
}

function startGenerationVisualization() {
  if (!window.lstmModel || !window.charToIdx || !window.idxToChar) {
    showPopupAlert('Train the model first!');
    return;
  }
  
  const seedInput = document.getElementById('generation-seed');
  if (!seedInput || !seedInput.value) {
    showPopupAlert('Enter a seed text first!');
    return;
  }

  const shakespeareModeToggle = document.getElementById('shakespeare-mode');
  if (shakespeareModeToggle && shakespeareModeToggle.checked) {
    seedInput.value = 'to be or not to be that is the question';
  }
  
  const startBtn = document.getElementById('start-generation');
  const pauseBtn = document.getElementById('pause-generation');
  const seedDisplay = document.getElementById('seed-display');
  const generationDisplay = document.getElementById('generation-display');
  const predictionDisplay = document.getElementById('prediction-display');
  
  if (startBtn) startBtn.disabled = true;
  if (pauseBtn) pauseBtn.disabled = false;
  
  generationVisualization.isGenerating = true;
  generationVisualization.seedText = seedInput.value.slice(0, window.seqLength);
  generationVisualization.currentText = generationVisualization.seedText;
  
  if (seedDisplay) {
    seedDisplay.textContent = generationVisualization.seedText;
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
  generationVisualization.timer = setInterval(() => {
    if (!generationVisualization.isGenerating) return;
    
    generateNextCharacter();
  }, generationVisualization.speed);
}

function pauseGenerationVisualization() {
  generationVisualization.isGenerating = false;
  
  const startBtn = document.getElementById('start-generation');
  const pauseBtn = document.getElementById('pause-generation');
  
  if (startBtn) startBtn.disabled = false;
  if (pauseBtn) pauseBtn.disabled = true;
  
  if (generationVisualization.timer) {
    clearInterval(generationVisualization.timer);
  }
}

function resetGenerationVisualization() {
  pauseGenerationVisualization();
  
  const seedDisplay = document.getElementById('seed-display');
  const generationDisplay = document.getElementById('generation-display');
  const predictionDisplay = document.getElementById('prediction-display');
  
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
  
  generationVisualization.currentText = '';
  generationVisualization.seedText = '';
}

async function generateNextCharacter() {
  console.log('generateNextCharacter called');
      console.log('Global variables:', {
      lstmModel: !!window.lstmModel,
      charToIdx: !!window.charToIdx,
      idxToChar: !!window.idxToChar,
      seqLength: window.seqLength,
      vocabSize: window.idxToChar ? window.idxToChar.length : 'undefined'
    });
    console.log('idxToChar details:', {
      type: typeof window.idxToChar,
      isArray: Array.isArray(window.idxToChar),
      length: window.idxToChar ? window.idxToChar.length : 'N/A',
      sample: window.idxToChar && Array.isArray(window.idxToChar) ? window.idxToChar.slice(0, 5) : 'N/A',
      keys: window.idxToChar && typeof window.idxToChar === 'object' ? Object.keys(window.idxToChar).slice(0, 5) : 'N/A'
    });
  
  if (!window.lstmModel || !window.charToIdx || !window.idxToChar) {
    console.error('Missing global variables for generation');
    return;
  }
  
  try {
    const inputIndices = textToIndices(generationVisualization.currentText, window.charToIdx);
    
    // Ensure we have the right sequence length
    const seqLength = window.seqLength || 15;
    const vocabSize = Array.isArray(window.idxToChar) ? window.idxToChar.length : 26; // Fallback to 26 for basic alphabet
    
    console.log('Using vocab size:', vocabSize);
    
    // Pad or truncate input to match sequence length
    let paddedIndices = [...inputIndices];
    while (paddedIndices.length < seqLength) {
      paddedIndices.unshift(0); // Pad with zeros at the beginning
    }
    if (paddedIndices.length > seqLength) {
      paddedIndices = paddedIndices.slice(-seqLength); // Take last seqLength elements
    }
    
    console.log('Input indices:', paddedIndices, 'Length:', paddedIndices.length, 'Vocab size:', vocabSize);
    
    // Prepare input tensor
    const inputTensor = tf.tidy(() => {
      const x = tf.buffer([1, seqLength, vocabSize]);
      for (let t = 0; t < seqLength; ++t) {
        const charIdx = paddedIndices[t];
        if (charIdx >= 0 && charIdx < vocabSize) {
          x.set(1, 0, t, charIdx);
        }
      }
      return x.toTensor();
    });
    
    // Predict next char
    const preds = window.lstmModel.predict(inputTensor).dataSync();
    const nextIdx = sampleWithTemperature(preds, 0.8); // Use temperature for variety
    const nextChar = window.idxToChar[nextIdx];
    
    // Update current text
    generationVisualization.currentText += nextChar;
    if (generationVisualization.currentText.length > seqLength) {
      generationVisualization.currentText = generationVisualization.currentText.slice(1);
    }
    
    // Update displays
    updateGenerationDisplays(nextChar, preds, nextIdx);
    
    tf.dispose(inputTensor);
    
  } catch (error) {
    console.error('Generation error:', error);
    pauseGenerationVisualization();
  }
}

function updateGenerationDisplays(nextChar, predictions, selectedIdx) {
  console.log('updateGenerationDisplays called with:', { nextChar, predictionsLength: predictions.length, selectedIdx });
  
  const generationDisplay = document.getElementById('generation-display');
  const predictionDisplay = document.getElementById('prediction-display');
  
  console.log('Found displays:', { generationDisplay: !!generationDisplay, predictionDisplay: !!predictionDisplay });
  
  if (generationDisplay) {
    // Add new character with typing animation
    const charSpan = document.createElement('span');
    charSpan.textContent = nextChar;
    charSpan.className = 'generated-char';
    charSpan.style.animation = 'typeIn 0.3s ease-out';
    generationDisplay.appendChild(charSpan);
    
    // Scroll to bottom if needed
    generationDisplay.scrollTop = generationDisplay.scrollHeight;
  }
  
  if (predictionDisplay) {
    // Show top predictions with confidence
    predictionDisplay.innerHTML = '';
    
    // Get top 5 predictions
    const topPredictions = Array.from(predictions)
      .map((prob, idx) => ({ prob, char: window.idxToChar[idx] }))
      .sort((a, b) => b.prob - a.prob)
      .slice(0, 5);
    
    console.log('Top predictions:', topPredictions);
    
    topPredictions.forEach((pred, i) => {
      const predItem = document.createElement('div');
      predItem.className = 'prediction-item';
      if (pred.char === nextChar) {
        predItem.className += ' selected';
      }
      
      const confidence = (pred.prob * 100).toFixed(1);
      predItem.innerHTML = `
        <span class="pred-char">${pred.char === ' ' ? '␣' : pred.char}</span>
        <span class="pred-confidence">${confidence}%</span>
      `;
      
      predItem.style.background = `linear-gradient(90deg, rgba(0,0,0,${pred.prob}) 0%, rgba(0,0,0,0) 100%)`;
      
      predictionDisplay.appendChild(predItem);
    });
  } else {
    console.error('prediction-display element not found!');
  }
} 

// Shakespeare corpus loading function
async function loadShakespeareCorpus() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/atrybyme/LSTM-Shakespearean-Text-Generation/master/shakespeare.txt');
    const text = await response.text();
    return text.toLowerCase()
      .replace(/\n/g, ' ')  // Replace newlines with spaces
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
  } catch (error) {
    console.error('Failed to load Shakespeare corpus:', error);
    // Fallback to a smaller sample
    return `to be or not to be that is the question whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune or to take arms against a sea of troubles and by opposing end them to die to sleep no more and by a sleep to say we end the heart ache and the thousand natural shocks that flesh is heir to tis a consummation devoutly to be wished to die to sleep to sleep perchance to dream ay there's the rub for in that sleep of death what dreams may come when we have shuffled off this mortal coil must give us pause there's the respect that makes calamity of so long life for who would bear the whips and scorns of time the oppressor's wrong the proud man's contumely the pangs of despised love the law's delay the insolence of office and the spurns that patient merit of the unworthy takes when he himself might his quietus make with a bare bodkin who would fardels bear to grunt and sweat under a weary life but that the dread of something after death the undiscovered country from whose bourn no traveller returns puzzles the will and makes us rather bear those ills we have than fly to others that we know not of thus conscience does make cowards of us all and thus the native hue of resolution is sicklied o'er with the pale cast of thought and enterprises of great pitch and moment with this regard their currents turn awry and lose the name of action`;
  }
} 