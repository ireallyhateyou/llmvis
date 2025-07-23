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
    updateProgressBar(epoch, window.totalEpochs || 25);
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
  // Use window.totalEpochs if available
  const total = window.totalEpochs || totalEpochs || 40;
  if (progressFill && progressText) {
    const percentage = (currentEpoch / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressFill.style.transition = 'width 0.3s ease';
    progressText.textContent = `Training: ${currentEpoch}/${total} epochs (${percentage.toFixed(1)}%)`;
  }
}

// --- Improved Data Processing ---
function getUniqueChars(text) {
  return Array.from(new Set(text.split('')));
}

function textToIndices(text, charToIdx) {
  return text.split('').map(c => charToIdx[c] || 0);
}

function indicesToText(indices, idxToChar) {
  return indices.map(i => idxToChar[i] || '?').join('');
}

// --- FIXED: Proper LSTM implementation based on working examples ---
function createLSTMModel(seqLength, vocabSize) {
  const model = tf.sequential();
  
  // Check available backend and optimize accordingly
  const backend = tf.getBackend();
  console.log('Creating LSTM model for backend:', backend);
  
  // Stacked LSTM layers based on successful examples
  model.add(tf.layers.lstm({
    units: 256,
    inputShape: [seqLength, vocabSize],
    returnSequences: true,
    dropout: 0.2,
    recurrentDropout: 0.2,
    kernelInitializer: 'glorotNormal'
  }));
  
  model.add(tf.layers.lstm({
    units: 128,
    returnSequences: false,
    dropout: 0.2,
    recurrentDropout: 0.2,
    kernelInitializer: 'glorotNormal'
  }));
  
  // Dense output layer
  model.add(tf.layers.dense({
    units: vocabSize,
    activation: 'softmax',
    kernelInitializer: 'glorotNormal'
  }));
  
  // Better optimizer with proper learning rate
  const optimizer = tf.train.adam(0.01); // Higher learning rate
  
  model.compile({
    loss: 'categoricalCrossentropy',
    optimizer,
    metrics: ['accuracy']
  });
  
  console.log('Model created with backend:', backend, 'Backend info:', tf.getBackend());
  return model;
}

// --- FIXED: Enhanced Shakespeare model (stacked) ---
function createShakespeareLSTMModel(seqLength, vocabSize) {
  const model = tf.sequential();
  
  // Check available backend and optimize accordingly
  const backend = tf.getBackend();
  console.log('Creating Shakespeare LSTM model for backend:', backend);
  
  // Stacked LSTM layers for Shakespeare
  model.add(tf.layers.lstm({
    units: 512,
    inputShape: [seqLength, vocabSize],
    returnSequences: true,
    dropout: 0.3,
    recurrentDropout: 0.3,
    kernelInitializer: 'glorotNormal'
  }));
  
  model.add(tf.layers.lstm({
    units: 256,
    returnSequences: false,
    dropout: 0.3,
    recurrentDropout: 0.3,
    kernelInitializer: 'glorotNormal'
  }));
  
  // Dense output layer
  model.add(tf.layers.dense({
    units: vocabSize,
    activation: 'softmax',
    kernelInitializer: 'glorotNormal'
  }));
  
  const optimizer = tf.train.adam(0.01); // Higher learning rate
  
  model.compile({
    loss: 'categoricalCrossentropy',
    optimizer,
    metrics: ['accuracy']
  });
  
  console.log('Shakespeare model created with backend:', backend);
  return model;
}

// --- FIXED: Better sequence creation with more data ---
function createSequences(text, seqLength, charToIdx) {
  const inputs = [];
  const labels = [];
  
  // Use more training data for better learning
  const maxSequences = Math.min(Math.floor((text.length - seqLength) * 0.8), 1000);
  
  for (let i = 0; i < maxSequences; ++i) {
    const inputSeq = text.slice(i, i + seqLength);
    const labelChar = text[i + seqLength];
    
    // Only add if label character exists in vocabulary
    if (labelChar in charToIdx) {
      inputs.push(textToIndices(inputSeq, charToIdx));
      labels.push(charToIdx[labelChar]);
    }
  }
  
  console.log(`Created ${inputs.length} training sequences from ${text.length} characters`);
  return {inputs, labels};
}

// --- FIXED: Better training function with proper learning ---
async function trainLSTMModel(model, xs, ys, epochs, batchSize, statusCallback) {
  console.log('Starting training with:', { 
    epochs, 
    batchSize, 
    xsShape: xs.shape, 
    ysShape: ys.shape,
    numSequences: xs.shape[0],
    backend: tf.getBackend()
  });
  
  // Log some sample data to verify it's correct
  console.log('Sample input data:', xs.slice([0, 0, 0], [1, 5, 5]).arraySync());
  console.log('Sample output data:', ys.slice([0, 0], [1, 5]).arraySync());
  
  window.totalEpochs = epochs;
  const history = { loss: [], accuracy: [] };
  
  // Better learning rate scheduling
  const learningRateScheduler = (epoch) => {
    if (epoch < 10) return 0.01;
    if (epoch < 20) return 0.005;
    return 0.001;
  };
  
  try {
    for (let epoch = 0; epoch < epochs; epoch++) {
      console.log(`Starting epoch ${epoch + 1}/${epochs}`);
      
      // Update learning rate
      const currentLR = learningRateScheduler(epoch);
      model.optimizer.learningRate = currentLR;
      
      // Train for one epoch with memory cleanup
      const fitResult = await model.fit(xs, ys, {
        batchSize: batchSize,
        epochs: 1,
        shuffle: true,
        callbacks: {
          onEpochEnd: (epochIdx, logs) => {
            if (logs && typeof logs.loss === 'number' && logs.loss > 0) {
              if (statusCallback) {
                const minLoss = history.loss.length > 0 ? Math.min(...history.loss) : logs.loss;
                statusCallback(epoch + 1, logs.loss, minLoss, currentLR);
              }
            }
            // Aggressive memory cleanup
            tf.tidy(() => {});
            // Force garbage collection
            if (typeof window.gc === 'function') {
              window.gc();
            }
          }
        }
      });
      
      // Get loss/accuracy from last batch
      const result = fitResult && fitResult.history ? fitResult : { history: { loss: [0], accuracy: [0] } };
      const loss = result.history.loss && typeof result.history.loss[0] === 'number' ? result.history.loss[0] : 0;
      const accuracy = result.history.accuracy && typeof result.history.accuracy[0] === 'number' ? result.history.accuracy[0] : 0;
      
      history.loss.push(loss);
      history.accuracy.push(accuracy);
      
      console.log(`Epoch ${epoch + 1}: Loss=${loss.toFixed(4)}, Accuracy=${accuracy.toFixed(4)}, LR=${currentLR.toFixed(6)}`);
      
      // Only update visualization at the end of each epoch
      if (statusCallback) {
        const minLoss = Math.min(...history.loss);
        statusCallback(epoch + 1, loss, minLoss, currentLR);
      }
      
      // Force memory cleanup between epochs
      await tf.nextFrame();
      tf.tidy(() => {});
      
      // Small delay to prevent browser freezing
      await new Promise(resolve => setTimeout(resolve, 10));
    }
  } catch (error) {
    console.error('Training error:', error);
    throw error;
  }
  
  console.log('Training completed successfully');
  console.log('Final loss history:', history.loss);
  console.log('Final accuracy history:', history.accuracy);
  return history;
}

// --- FIXED: Better text generation with proper sampling ---
async function generateText(model, seed, charToIdx, idxToChar, genLength, temperature) {
  let inputIndices = textToIndices(seed, charToIdx);
  let generated = seed;
  
  for (let i = 0; i < genLength; ++i) {
    try {
      // Prepare input tensor with proper padding
      const inputTensor = tf.tidy(() => {
        const seqLength = model.inputs[0].shape[1];
        const vocabSize = model.outputs[0].shape[1];
        
        // Pad or truncate to match sequence length
        let paddedIndices = [...inputIndices];
        if (paddedIndices.length < seqLength) {
          // Pad with the first character instead of zeros
          const padChar = paddedIndices[0] || 0;
          while (paddedIndices.length < seqLength) {
            paddedIndices.unshift(padChar);
          }
        } else if (paddedIndices.length > seqLength) {
          paddedIndices = paddedIndices.slice(-seqLength);
        }
        
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
      const preds = model.predict(inputTensor).dataSync();
      const nextIdx = sampleWithTemperature(preds, temperature);
      const nextChar = idxToChar[nextIdx] || '?';
      
      generated += nextChar;
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

// --- FIXED: Better sampling function ---
function sampleWithTemperature(logits, temperature) {
  let logitsArr = Array.from(logits);
  
  // Remove NaNs and negative/infinite values
  logitsArr = logitsArr.map(x => (isFinite(x) && x > 0 ? x : 1e-8));
  
  // Apply temperature
  const exp = logitsArr.map(x => Math.exp(x / temperature));
  let sum = exp.reduce((a, b) => a + b, 0);
  
  // If sum is not finite or zero, fall back to uniform
  if (!isFinite(sum) || sum <= 0) {
    const n = logitsArr.length;
    return Math.floor(Math.random() * n);
  }
  
  const probs = exp.map(x => x / sum);
  let r = Math.random();
  
  for (let i = 0; i < probs.length; ++i) {
    r -= probs[i];
    if (r <= 0) return i;
  }
  
  // Fallback: return most probable index
  let maxProb = -Infinity, maxIdx = 0;
  for (let i = 0; i < probs.length; ++i) {
    if (probs[i] > maxProb) {
      maxProb = probs[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}

// --- Generation Visualization ---
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
        <input type="text" id="generation-seed" placeholder="To be, or not to be" value="To be, or not to be" style="width: 300px;">
        <small id="seed-note" style="color:#888;display:block;">Only the first <span id="seq-len-note"></span> characters will be used as seed.</small>
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
        <label>Seed Text Used:</label>
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
  
  // Show seqLength in note
  const seqLenNote = document.getElementById('seq-len-note');
  if (seqLenNote) seqLenNote.textContent = window.seqLength || 15;
  
  // Auto-truncate seed input as user types
  const seedInput = document.getElementById('generation-seed');
  if (seedInput) {
    seedInput.addEventListener('input', function() {
      const maxLen = window.seqLength || 15;
      if (this.value.length > maxLen) {
        this.value = this.value.slice(0, maxLen);
      }
      // Update the display immediately
      const seedDisplay = document.getElementById('seed-display');
      if (seedDisplay) seedDisplay.textContent = this.value;
    });
  }
  
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
  
  const startBtn = document.getElementById('start-generation');
  const pauseBtn = document.getElementById('pause-generation');
  const seedDisplay = document.getElementById('seed-display');
  const generationDisplay = document.getElementById('generation-display');
  const predictionDisplay = document.getElementById('prediction-display');
  
  if (startBtn) startBtn.disabled = true;
  if (pauseBtn) pauseBtn.disabled = false;
  
  // Sanitize the seed
  const rawSeed = seedInput.value;
  const sanitizedSeed = sanitizeSeed(rawSeed, window.charToIdx);
  
  if (sanitizedSeed.length < rawSeed.length) {
    showPopupAlert('Some characters in your seed are not in the model vocabulary and will be ignored.');
  }
  
  generationVisualization.isGenerating = true;
  generationVisualization.seedText = sanitizedSeed.slice(0, window.seqLength);
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
  if (!window.lstmModel || !window.charToIdx || !window.idxToChar) {
    console.error('Missing global variables for generation');
    return;
  }
  
  try {
    // Defensive: ensure currentText is initialized
    if (!generationVisualization.currentText || typeof generationVisualization.currentText !== 'string' || generationVisualization.currentText.length === 0) {
      showPopupAlert('Seed/context is empty. Please reset and try again.');
      pauseGenerationVisualization();
      return;
    }
    
    const inputIndices = textToIndices(generationVisualization.currentText, window.charToIdx);
    
    // If all indices are 0, warn
    if (inputIndices.every(i => i === 0)) {
      showPopupAlert('All input indices are 0. This means your seed/context is not matching the vocabulary. Please check your seed and training text.');
      pauseGenerationVisualization();
      return;
    }
    
    // Ensure we have the right sequence length
    const seqLength = window.seqLength || 15;
    const vocabSize = Array.isArray(window.idxToChar) ? window.idxToChar.length : Object.keys(window.idxToChar).length;
    
    // Pad or truncate input to match sequence length
    let paddedIndices = [...inputIndices];
    if (paddedIndices.length < seqLength) {
      // Pad with the first character instead of zeros
      const padChar = paddedIndices[0] || 0;
      while (paddedIndices.length < seqLength) {
        paddedIndices.unshift(padChar);
      }
    }
    if (paddedIndices.length > seqLength) {
      paddedIndices = paddedIndices.slice(-seqLength);
    }
    
    // Guard: check for invalid indices
    if (paddedIndices.some(i => typeof i !== 'number' || isNaN(i) || i < 0 || i >= vocabSize)) {
      console.error('Invalid input indices:', paddedIndices);
      showPopupAlert('Invalid input indices detected. Please check your seed and training text.');
      pauseGenerationVisualization();
      return;
    }
    
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
    
    // Better error handling for predictions
    if (!preds || preds.length === 0) {
      console.error('Model returned empty predictions');
      showPopupAlert('Model returned empty predictions. Please retrain the model.');
      pauseGenerationVisualization();
      return;
    }
    
    // Check for NaN or infinite values in predictions
    if (preds.some(p => !isFinite(p))) {
      console.error('Model returned NaN or infinite predictions:', preds);
      showPopupAlert('Model returned invalid predictions. Please retrain the model.');
      pauseGenerationVisualization();
      return;
    }
    
    // Use improved sampling based on successful examples
    let nextIdx = sampleWithTemperatureImproved(preds, 0.8);
    const vocabLen = Array.isArray(window.idxToChar) ? window.idxToChar.length : Object.keys(window.idxToChar).length;
    
    // Defensive fix: if nextIdx is not a valid index, pick the most probable valid index
    if (typeof nextIdx !== 'number' || isNaN(nextIdx) || nextIdx < 0 || nextIdx >= vocabLen) {
      let maxProb = -Infinity, maxIdx = 0;
      for (let i = 0; i < preds.length && i < vocabLen; ++i) {
        if (preds[i] > maxProb) {
          maxProb = preds[i];
          maxIdx = i;
        }
      }
      console.warn('nextIdx out of bounds:', nextIdx, 'Falling back to maxIdx:', maxIdx);
      nextIdx = maxIdx;
    }
    
    const nextChar = window.idxToChar[nextIdx] || '?';
    
    // Prevent '?' from corrupting context
    if (!nextChar || nextChar === '?') {
      showPopupAlert('Model generated an invalid character ("?"). Generation stopped. Try training with more data, more epochs, or a slightly larger model if you still see this popup.');
      pauseGenerationVisualization();
      return;
    }
    
    // Only append valid, in-vocab characters to context
    generationVisualization.currentText += nextChar;
    if (generationVisualization.currentText.length > seqLength) {
      generationVisualization.currentText = generationVisualization.currentText.slice(1);
    }
    
    // Update displays
    updateGenerationDisplays(nextChar, preds, nextIdx);
    tf.dispose(inputTensor);
    
  } catch (error) {
    console.error('Generation error:', error);
    showPopupAlert('Generation error: ' + error.message);
    pauseGenerationVisualization();
  }
}

function sampleWithTemperatureImproved(logits, temperature) {
  // Convert to array and handle edge cases
  let logitsArr = Array.from(logits);
  
  // Remove NaNs and negative/infinite values
  logitsArr = logitsArr.map(x => (isFinite(x) && x > 0 ? x : 1e-8));
  
  // Apply temperature (higher temperature = more random)
  const exp = logitsArr.map(x => Math.exp(x / temperature));
  let sum = exp.reduce((a, b) => a + b, 0);
  
  // If sum is not finite or zero, fall back to uniform
  if (!isFinite(sum) || sum <= 0) {
    const n = logitsArr.length;
    return Math.floor(Math.random() * n);
  }
  
  const probs = exp.map(x => x / sum);
  
  // Use cumulative distribution for sampling
  let r = Math.random();
  let cumulative = 0;
  
  for (let i = 0; i < probs.length; ++i) {
    cumulative += probs[i];
    if (r <= cumulative) {
      return i;
    }
  }
  
  // Fallback: return most probable index
  let maxProb = -Infinity, maxIdx = 0;
  for (let i = 0; i < probs.length; ++i) {
    if (probs[i] > maxProb) {
      maxProb = probs[i];
      maxIdx = i;
    }
  }
  return maxIdx;
}

function updateGenerationDisplays(nextChar, predictions, selectedIdx) {
  const generationDisplay = document.getElementById('generation-display');
  const predictionDisplay = document.getElementById('prediction-display');
  
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
  }
}

// --- Helper functions ---
function sanitizeSeed(seed, charToIdx) {
  let sanitized = '';
  for (const c of seed) {
    if (c in charToIdx) sanitized += c;
  }
  return sanitized.length > 0 ? sanitized : Object.keys(charToIdx)[0];
}

// Shakespeare corpus loading function
async function loadShakespeareCorpus() {
  try {
    const response = await fetch('https://raw.githubusercontent.com/atrybyme/LSTM-Shakespearean-Text-Generation/master/shakespeare.txt');
    const text = await response.text();
    return text.toLowerCase()
      .replace(/\n/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  } catch (error) {
    console.error('Failed to load Shakespeare corpus:', error);
    // Fallback to a smaller sample
    return `to be or not to be that is the question whether tis nobler in the mind to suffer the slings and arrows of outrageous fortune or to take arms against a sea of troubles and by opposing end them to die to sleep no more and by a sleep to say we end the heart ache and the thousand natural shocks that flesh is heir to tis a consummation devoutly to be wished to die to sleep to sleep perchance to dream ay there's the rub for in that sleep of death what dreams may come when we have shuffled off this mortal coil must give us pause there's the respect that makes calamity of so long life for who would bear the whips and scorns of time the oppressor's wrong the proud man's contumely the pangs of despised love the law's delay the insolence of office and the spurns that patient merit of the unworthy takes when he himself might his quietus make with a bare bodkin who would fardels bear to grunt and sweat under a weary life but that the dread of something after death the undiscovered country from whose bourn no traveller returns puzzles the will and makes us rather bear those ills we have than fly to others that we know not of thus conscience does make cowards of us all and thus the native hue of resolution is sicklied o'er with the pale cast of thought and enterprises of great pitch and moment with this regard their currents turn awry and lose the name of action`;
  }
}

// --- FIXED: Proper tensor creation ---
function vectorizeData(inputs, labels, seqLength, vocabSize) {
  const xsBuffer = tf.buffer([inputs.length, seqLength, vocabSize]);
  const ysBuffer = tf.buffer([labels.length, vocabSize]);
  
  for (let i = 0; i < inputs.length; ++i) {
    // Input sequence - one-hot encode
    for (let t = 0; t < seqLength; ++t) {
      const charIdx = inputs[i][t];
      if (charIdx >= 0 && charIdx < vocabSize) {
        xsBuffer.set(1, i, t, charIdx);
      }
    }
    
    // Output - one-hot encode
    const labelIdx = labels[i];
    if (labelIdx >= 0 && labelIdx < vocabSize) {
      ysBuffer.set(1, i, labelIdx);
    }
  }
  
  return {
    xs: xsBuffer.toTensor(),
    ys: ysBuffer.toTensor()
  };
}

// Expose functions to global scope
window.initTrainingVisualization = initTrainingVisualization;
window.updateTrainingVisualization = updateTrainingVisualization;
window.initGenerationVisualization = initGenerationVisualization;
window.trainLSTMModel = trainLSTMModel;
window.createLSTMModel = createLSTMModel;
window.createShakespeareLSTMModel = createShakespeareLSTMModel;
window.startGenerationVisualization = startGenerationVisualization;
window.pauseGenerationVisualization = pauseGenerationVisualization;
window.resetGenerationVisualization = resetGenerationVisualization; 

async function trainLSTM() {
  console.log('trainLSTM called');
  // Parse DOM and get settings
  const trainText = document.getElementById('lstm-train-text').value.trim();
  const seqLength = parseInt(document.getElementById('lstm-seq-length').value);
  const epochs = parseInt(document.getElementById('lstm-epochs').value);
  const batchSize = parseInt(document.getElementById('lstm-batch-size').value);
  const shakespeareMode = window.shakespeareMode;

  // Estimate parameter count for LSTM model (do this BEFORE model creation)
  const chars = [...new Set(trainText)].sort();
  const vocabSize = chars.length;
  let totalParams = 0;
  if (shakespeareMode) {
    const lstm1 = 4 * (512 * (512 + vocabSize));
    const lstm2 = 4 * (256 * (256 + 512));
    const dense = 256 * vocabSize + vocabSize;
    totalParams = lstm1 + lstm2 + dense;
  } else {
    const lstm1 = 4 * (256 * (256 + vocabSize));
    const lstm2 = 4 * (128 * (128 + 256));
    const dense = 128 * vocabSize + vocabSize;
    totalParams = lstm1 + lstm2 + dense;
  }
  // Reduce estimate to 1/4 of previous calculation
  const estMinutes = Math.max(1, Math.round((totalParams / 50000) * epochs * 0.05));

  // Show modal and wait for user confirmation BEFORE model creation
  console.log('About to show model warning modal', {totalParams, estMinutes});
  if (typeof window.showModelWarning === 'function') {
    // Ensure modal is closed before proceeding
    await new Promise(resolve => {
      window.showModelWarning(
        totalParams,
        estMinutes,
        () => {
          const modal = document.getElementById('model-warning-modal');
          if (modal) modal.style.display = 'none';
          setTimeout(resolve, 0); // allow DOM to update
        },
        '(by the way, expect gibberish given the small training text)'
      );
    });
    console.log('User closed model warning modal, proceeding to ALL TensorFlow.js code');
  } else {
    // Fallback: show alert if modal function is missing
    alert(`Warning: you are about to create a model that has ${totalParams.toLocaleString()} parameters, expect your browser to freeze for about ${estMinutes} minute(s). (by the way, expect gibberish given the small training text)`);
    console.log('Fallback alert shown, proceeding to ALL TensorFlow.js code');
  }

  // --- ALL TensorFlow.js code must be after this point ---
  console.log('About to run TensorFlow.js code (data prep, tensors, model creation, training)');

  // Initialize visualization
  if (window.initTrainingVisualization) {
    console.log('Initializing training visualization');
    window.initTrainingVisualization();
  }

  try {
    const status = document.getElementById('lstm-status');
    status.textContent = 'Preparing data...';
    console.log('Preparing data...');
    // Get unique characters
    const chars = [...new Set(trainText)].sort();
    const vocabSize = chars.length;
    console.log('Vocabulary size:', vocabSize);
    // Create character mappings
    const charToIdx = {};
    const idxToChar = {};
    chars.forEach((char, idx) => {
      charToIdx[char] = idx;
      idxToChar[idx] = char;
    });
    // Create sequences
    const sequences = [];
    for (let i = 0; i <= trainText.length - seqLength; i++) {
      const sequence = trainText.slice(i, i + seqLength);
      const nextChar = trainText[i + seqLength];
      sequences.push({ input: sequence, label: nextChar });
    }
    console.log('Created', sequences.length, 'sequences');
    // Vectorize data
    console.log('Vectorizing data...');
    const xs = tf.buffer([sequences.length, seqLength, vocabSize]);
    const ys = tf.buffer([sequences.length, vocabSize]);
    sequences.forEach((seq, i) => {
      // Input sequence
      for (let t = 0; t < seqLength; t++) {
        xs.set(1, i, t, charToIdx[seq.input[t]]);
      }
      // Output (next character)
      ys.set(1, i, charToIdx[seq.label]);
    });
    const xsTensor = xs.toTensor();
    const ysTensor = ys.toTensor();
    console.log('Tensors created:', xsTensor.shape, ysTensor.shape);
    status.textContent = 'Creating model...';
    console.log('Creating model...');
    // Create model
    let model;
    if (shakespeareMode) {
      console.log('Creating Shakespeare model');
      model = window.createShakespeareLSTMModel(seqLength, vocabSize);
    } else {
      console.log('Creating standard model');
      model = window.createLSTMModel(seqLength, vocabSize);
    }
    console.log('Model created with backend:', tf.getBackend());
    status.textContent = 'Training... (watch the chart below!)';
    console.log('Starting training...');
    // Train model using the function from lstm.js
    await window.trainLSTMModel(model, xsTensor, ysTensor, epochs, batchSize, (epoch, loss, minLoss, lr) => {
      console.log(`Training callback: epoch ${epoch}, loss ${loss}`);
      if (window.updateTrainingVisualization) {
        window.updateTrainingVisualization(epoch, loss);
      }
      status.textContent = `Epoch ${epoch}/${epochs}: Loss=${loss.toFixed(4)}, Min=${minLoss.toFixed(4)}, LR=${lr.toFixed(6)}`;
    });
    // Clean up tensors
    xsTensor.dispose();
    ysTensor.dispose();
    // Store model and mappings
    window.lstmModel = model;
    window.charToIdx = charToIdx;
    window.idxToChar = idxToChar;
    window.seqLength = seqLength;
    // Initialize generation visualization
    if (window.initGenerationVisualization) {
      window.initGenerationVisualization();
    }
    status.textContent = 'Training complete! You can now generate text.';
    console.log('Training completed successfully');
    showPopupAlert('Training complete! You can now generate text.');
  } catch (error) {
    console.error('Training error:', error);
    const status = document.getElementById('lstm-status');
    status.textContent = 'Training failed: ' + error.message;
    showPopupAlert('Training failed: ' + error.message);
  }
} 

// --- LSTM Memory State Visualization ---
function drawLSTMMemoryHeatmap(states) {
  let canvas = document.getElementById('lstm-memory-heatmap');
  if (!states || !states.length || !Array.isArray(states[0])) {
    if (canvas) canvas.style.display = 'none';
    return;
  }
  if (!canvas) {
    canvas = document.createElement('canvas');
    canvas.id = 'lstm-memory-heatmap';
    canvas.width = 400;
    canvas.height = 120;
    canvas.style.border = '1px solid #ccc';
    canvas.style.background = '#fff';
    canvas.style.display = 'block';
    canvas.style.marginTop = '2em';
    const label = document.createElement('label');
    label.innerHTML = '<b>LSTM Memory State (Hidden State) Heatmap</b>';
    const container = document.getElementById('lstm-vis') || document.getElementById('lstm-container');
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

// --- LSTM Model with returnState for Generation ---
function createLSTMModelWithState(seqLength, vocabSize) {
  const input = tf.input({shape: [seqLength, vocabSize]});
  const lstm = tf.layers.lstm({
    units: 128,
    returnSequences: true,
    returnState: true,
    dropout: 0.2,
    recurrentDropout: 0.2,
    kernelInitializer: 'glorotNormal'
  });
  const lstmOut = lstm.apply(input);
  const lstmSeq = Array.isArray(lstmOut) ? lstmOut[0] : lstmOut;
  const lstmHidden = Array.isArray(lstmOut) ? lstmOut[1] : null;
  const dense = tf.layers.dense({
    units: vocabSize,
    activation: 'softmax',
    kernelInitializer: 'glorotNormal'
  }).apply(lstmSeq);
  const model = tf.model({inputs: input, outputs: [dense, lstmHidden]});
  model.compile({
    loss: 'categoricalCrossentropy',
    optimizer: tf.train.adam(0.01),
    metrics: ['accuracy']
  });
  return model;
}

// --- LSTM Generation Visualization with Memory Heatmap ---
let lstmMemoryStates = [];

function initLSTMGenerationVisualizationWithMemory() {
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
        <input type="text" id="generation-seed" placeholder="To be, or not to be" value="To be, or not to be" style="width: 300px;">
        <small id="seed-note" style="color:#888;display:block;">Only the first <span id="seq-len-note"></span> characters will be used as seed.</small>
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
        <label>Seed Text Used:</label>
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
    <div style="margin-top:2em;">
      <label><b>LSTM Memory State (Hidden State) Heatmap</b></label>
      <canvas id="lstm-memory-heatmap" width="400" height="120"></canvas>
    </div>
  `;
  visContainer.appendChild(genVizSection);
  // Add event listeners (reuse from previous logic)
  const startBtn = document.getElementById('start-generation');
  const pauseBtn = document.getElementById('pause-generation');
  const resetBtn = document.getElementById('reset-generation');
  const speedSlider = document.getElementById('generation-speed');
  const speedValue = document.getElementById('speed-value');
  // Show seqLength in note
  const seqLenNote = document.getElementById('seq-len-note');
  if (seqLenNote) seqLenNote.textContent = window.seqLength || 15;
  if (startBtn) {
    startBtn.onclick = () => startLSTMGenerationWithMemory();
  }
  if (pauseBtn) {
    pauseBtn.onclick = () => pauseLSTMGenerationWithMemory();
  }
  if (resetBtn) {
    resetBtn.onclick = () => resetLSTMGenerationWithMemory();
  }
  if (speedSlider) {
    speedSlider.oninput = (e) => {
      speedValue.textContent = e.target.value + 'ms';
    };
  }
}

let lstmGenTimer = null;
let lstmGenCurrentText = '';
let lstmGenSeedText = '';

function startLSTMGenerationWithMemory() {
  if (!window.lstmModel || !window.charToIdx || !window.idxToChar) {
    showPopupAlert('Train the model first!');
    return;
  }
  const seedInput = document.getElementById('generation-seed');
  if (!seedInput || !seedInput.value) {
    showPopupAlert('Enter a seed text first!');
    return;
  }
  const startBtn = document.getElementById('start-generation');
  const pauseBtn = document.getElementById('pause-generation');
  const seedDisplay = document.getElementById('seed-display');
  const generationDisplay = document.getElementById('generation-display');
  const predictionDisplay = document.getElementById('prediction-display');
  if (startBtn) startBtn.disabled = true;
  if (pauseBtn) pauseBtn.disabled = false;
  // Sanitize the seed
  const rawSeed = seedInput.value;
  const sanitizedSeed = sanitizeSeed(rawSeed, window.charToIdx);
  lstmGenSeedText = sanitizedSeed.slice(0, window.seqLength);
  lstmGenCurrentText = lstmGenSeedText;
  lstmMemoryStates = [];
  if (seedDisplay) {
    seedDisplay.textContent = lstmGenSeedText;
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
  lstmGenTimer = setInterval(() => {
    generateNextLSTMCharacterWithMemory();
  }, parseInt(document.getElementById('generation-speed').value));
}

function pauseLSTMGenerationWithMemory() {
  const startBtn = document.getElementById('start-generation');
  const pauseBtn = document.getElementById('pause-generation');
  if (startBtn) startBtn.disabled = false;
  if (pauseBtn) pauseBtn.disabled = true;
  if (lstmGenTimer) {
    clearInterval(lstmGenTimer);
  }
}

function resetLSTMGenerationWithMemory() {
  pauseLSTMGenerationWithMemory();
  lstmGenCurrentText = '';
  lstmGenSeedText = '';
  lstmMemoryStates = [];
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
  drawLSTMMemoryHeatmap([]);
}

async function generateNextLSTMCharacterWithMemory() {
  if (!window.lstmModel || !window.charToIdx || !window.idxToChar) {
    console.error('Missing global variables for generation');
    return;
  }
  try {
    if (!lstmGenCurrentText || typeof lstmGenCurrentText !== 'string' || lstmGenCurrentText.length === 0) {
      showPopupAlert('Seed/context is empty. Please reset and try again.');
      pauseLSTMGenerationWithMemory();
      return;
    }
    const inputIndices = textToIndices(lstmGenCurrentText, window.charToIdx);
    const seqLength = window.seqLength || 15;
    const vocabSize = Array.isArray(window.idxToChar) ? window.idxToChar.length : Object.keys(window.idxToChar).length;
    let paddedIndices = [...inputIndices];
    if (paddedIndices.length < seqLength) {
      const padChar = paddedIndices[0] || 0;
      while (paddedIndices.length < seqLength) {
        paddedIndices.unshift(padChar);
      }
    }
    if (paddedIndices.length > seqLength) {
      paddedIndices = paddedIndices.slice(-seqLength);
    }
    if (paddedIndices.some(i => typeof i !== 'number' || isNaN(i) || i < 0 || i >= vocabSize)) {
      console.error('Invalid input indices:', paddedIndices);
      showPopupAlert('Invalid input indices detected. Please check your seed and training text.');
      pauseLSTMGenerationWithMemory();
      return;
    }
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
    // Predict next char and get hidden state
    let preds, hiddenState;
    if (window.lstmModel.outputs.length === 2) {
      [preds, hiddenState] = window.lstmModel.predict(inputTensor);
    } else {
      preds = window.lstmModel.predict(inputTensor);
      hiddenState = null;
    }
    if (!preds || preds.length === 0) {
      console.error('Model returned empty predictions');
      showPopupAlert('Model returned empty predictions. Please retrain the model.');
      pauseLSTMGenerationWithMemory();
      return;
    }
    if (preds.some(p => !isFinite(p))) {
      console.error('Model returned NaN or infinite predictions:', preds);
      showPopupAlert('Model returned invalid predictions. Please retrain the model.');
      pauseLSTMGenerationWithMemory();
      return;
    }
    let nextIdx = sampleWithTemperatureImproved(preds.dataSync(), 0.8);
    const vocabLen = Array.isArray(window.idxToChar) ? window.idxToChar.length : Object.keys(window.idxToChar).length;
    if (typeof nextIdx !== 'number' || isNaN(nextIdx) || nextIdx < 0 || nextIdx >= vocabLen) {
      let maxProb = -Infinity, maxIdx = 0;
      for (let i = 0; i < preds.length && i < vocabLen; ++i) {
        if (preds[i] > maxProb) {
          maxProb = preds[i];
          maxIdx = i;
        }
      }
      nextIdx = maxIdx;
    }
    const nextChar = window.idxToChar[nextIdx] || '?';
    if (!nextChar || nextChar === '?') {
      showPopupAlert('Model generated an invalid character ("?"). Generation stopped. Try training with more data, more epochs, or a slightly larger model if you still see this popup.');
      pauseLSTMGenerationWithMemory();
      return;
    }
    lstmGenCurrentText += nextChar;
    if (lstmGenCurrentText.length > seqLength) {
      lstmGenCurrentText = lstmGenCurrentText.slice(1);
    }
    // Update displays
    updateGenerationDisplays(nextChar, preds.dataSync(), nextIdx);
    // Store and draw memory state
    if (hiddenState && hiddenState.arraySync) {
      const stateArr = hiddenState.arraySync()[0];
      lstmMemoryStates.push(stateArr);
      if (lstmMemoryStates.length > 10) lstmMemoryStates.shift();
      drawLSTMMemoryHeatmap(lstmMemoryStates);
    }
    tf.dispose(inputTensor);
    if (preds.dispose) preds.dispose();
    if (hiddenState && hiddenState.dispose) hiddenState.dispose();
  } catch (error) {
    console.error('Generation error:', error);
    showPopupAlert('Generation error: ' + error.message);
    pauseLSTMGenerationWithMemory();
  }
} 