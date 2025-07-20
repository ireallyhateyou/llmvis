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
  // Use window.totalEpochs if available
  const total = window.totalEpochs || totalEpochs || 40;
  if (progressFill && progressText) {
    const percentage = (currentEpoch / total) * 100;
    progressFill.style.width = `${percentage}%`;
    progressFill.style.transition = 'width 0.3s ease';
    progressText.textContent = `Training: ${currentEpoch}/${total} epochs (${percentage.toFixed(1)}%)`;
  }
}

// --- Sample Training Text ---
const SAMPLE_TRAINING_TEXT = `Hello world
This is a simple test
For the LSTM model
The Undercity Incident is crazy`;

// --- 1. Tokenization Utilities ---
function getUniqueChars(text) {
  // Always return an array
  return Array.from(new Set(text.split('')));
}
function textToIndices(text, charToIdx) {
  // Fallback to 0 if char not found
  return text.split('').map(c => (c in charToIdx ? charToIdx[c] : 0));
}
function indicesToText(indices, idxToChar) {
  // idxToChar is always an array
  return indices.map(i => idxToChar[i] || '?').join('');
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
  model.add(tf.layers.lstm({
    units: 64,
    inputShape: [seqLength, vocabSize],
    returnSequences: true
  }));
  model.add(tf.layers.lstm({
    units: 64,
    returnSequences: false
  }));
  model.add(tf.layers.dense({units: vocabSize, activation: 'softmax'}));
  // Adam with gradient clipping if available
  let optimizer;
  if (tf.train.adam.length >= 2) {
    optimizer = tf.train.adam(0.0005, undefined, undefined, undefined, 1.0, 5.0); // clipNorm=5.0
  } else {
    optimizer = tf.train.adam(0.0005);
  }
  model.compile({
    loss: 'categoricalCrossentropy',
    optimizer
  });
  return model;
}

// Enhanced model creation for Shakespeare (even bigger)
function createShakespeareLSTMModel(seqLength, vocabSize) {
  const model = tf.sequential();
  model.add(tf.layers.lstm({
    units: 64, // Keep at 64 for Shakespeare
    returnSequences: false,
    inputShape: [seqLength, vocabSize],
    dropout: 0.0,
    recurrentDropout: 0.0
  }));
  model.add(tf.layers.dense({
    units: vocabSize,
    activation: 'softmax'
  }));
  model.compile({
    optimizer: tf.train.adam(0.001), // Lowered learning rate
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
  window.totalEpochs = epochs;
  const history = {
    loss: [],
    accuracy: []
  };
  // Batch progress text setup
  let batchProgressText = document.getElementById('lstm-batch-progress');
  if (!batchProgressText) {
    batchProgressText = document.createElement('div');
    batchProgressText.id = 'lstm-batch-progress';
    batchProgressText.style.margin = '0.5em 0';
    batchProgressText.style.fontWeight = 'bold';
    const status = document.getElementById('lstm-status') || document.body;
    status.parentNode.insertBefore(batchProgressText, status.nextSibling);
  }
  const totalBatches = epochs * Math.ceil(xs.shape[0] / batchSize);
  let batchCount = 0;
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
      // Train for one epoch
      const fitResult = await model.fit(xs, ys, {
        batchSize: batchSize,
        epochs: 1,
        shuffle: true,
        callbacks: {
          onBatchBegin: (batch, logs) => {
            batchCount++;
            if (batchProgressText) {
              batchProgressText.textContent = `Batch ${batchCount} / ${totalBatches}`;
            }
            // Only call statusCallback if loss is a valid, nonzero number
            if (logs && typeof logs.loss === 'number' && logs.loss > 0) {
              if (statusCallback) statusCallback(epoch + 1, logs.loss, Math.min(...history.loss, logs.loss), currentLR);
            }
          },
          onBatchEnd: (batch, logs) => {
            if (batchProgressText) {
              batchProgressText.textContent = `Batch ${batchCount} / ${totalBatches}`;
            }
            // Only call statusCallback if loss is a valid, nonzero number
            if (logs && typeof logs.loss === 'number' && logs.loss > 0) {
              if (statusCallback) statusCallback(epoch + 1, logs.loss, Math.min(...history.loss, logs.loss), currentLR);
            }
            // Memory cleanup
            tf.tidy(() => {});
          }
        }
      });
      // Get loss/accuracy from last batch
      const result = fitResult && fitResult.history ? fitResult : { history: { loss: [0], accuracy: [0] } };
      const loss = result.history.loss && typeof result.history.loss[0] === 'number' ? result.history.loss[0] : 0;
      const accuracy = result.history.accuracy && typeof result.history.accuracy[0] === 'number' ? result.history.accuracy[0] : 0;
      history.loss.push(loss);
      history.accuracy.push(accuracy);
      if (statusCallback) statusCallback(epoch + 1, loss, Math.min(...history.loss), currentLR);
      await tf.nextFrame();
      // After 5 epochs, check if loss has decreased. If not, log a warning.
      if (epoch === 5 && history.loss.length >= 5) {
        if (history.loss[4] >= history.loss[0]) {
          console.warn('Warning: Loss has not decreased after 5 epochs. Check model/data.');
        }
      }
    }
  } catch (error) {
    console.error('Training error:', error);
    if (batchProgressText) batchProgressText.style.color = '#b00';
    throw error;
  }
  if (batchProgressText) {
    batchProgressText.textContent = 'Batches: Done';
    setTimeout(() => { if (batchProgressText) batchProgressText.remove(); }, 2000);
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

// --- Ensure idxToChar is always an array ---
function ensureIdxToCharArray() {
  if (!Array.isArray(window.idxToChar) && window.charToIdx) {
    // Rebuild idxToChar as an array
    const arr = [];
    Object.keys(window.charToIdx).forEach(c => {
      arr[window.charToIdx[c]] = c;
    });
    window.idxToChar = arr;
    console.warn('idxToChar was not an array, rebuilt from charToIdx:', arr);
  }
}

// --- User-configurable max training sequences ---
window.maxLSTMSequences = 1000; // Default limit, can be overridden by user

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
  if (seqInput) seqInput.value = 30; // Larger default sequence length
  if (epochsInput) epochsInput.value = 40; // More epochs
  if (batchInput) batchInput.value = 16; // Larger batch size

  if (sampleBtn && trainTextArea) {
    sampleBtn.onclick = () => {
      trainTextArea.value = SAMPLE_TRAINING_TEXT;
    };
  }

  if (trainBtn) {
    trainBtn.onclick = async () => {
      try {
        let text = trainTextArea.value;
        const shakespeareMode = shakespeareModeToggle.checked;
        
        if (shakespeareMode) {
          // Load Shakespeare corpus
          trainTextArea.value = 'Loading Shakespeare corpus...';
          const corpus = await loadShakespeareCorpus();
          trainTextArea.value = corpus;
          
          // Update parameters for Shakespeare
          seqInput.value = '60';   // Even longer sequences
          epochsInput.value = '30';      // More epochs
          batchInput.value = '16';    // Larger batch size
          
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
        
        // After vectorizeData in trainLSTM, print the first 3 input/output pairs as indices and decoded text
        for (let i = 0; i < Math.min(3, inputs.length); ++i) {
          console.log('Sample', i, 'input indices:', inputs[i], 'as text:', indicesToText(inputs[i], idxToChar));
          console.log('Sample', i, 'label index:', labels[i], 'as char:', idxToChar[labels[i]]);
        }
        
        if (xs.shape[2] !== idxToChar.length || ys.shape[1] !== idxToChar.length) {
          console.warn('Vectorized data shape mismatch: xs.shape', xs.shape, 'ys.shape', ys.shape, 'vocab size', idxToChar.length);
        }
        
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
        
        // Show the vocabulary to the user
        trainStatus.textContent += '\nVocabulary: ' + idxToChar.join('');
        
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

// --- Seed sanitization for generation ---
function sanitizeSeed(seed, charToIdx) {
  let sanitized = '';
  for (const c of seed) {
    if (c in charToIdx) sanitized += c;
  }
  return sanitized.length > 0 ? sanitized : Object.keys(charToIdx)[0];
}

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
  ensureIdxToCharArray();
  // Debug: print mapping for every character in the actual seed
  const seed = generationVisualization && generationVisualization.seedText
    ? generationVisualization.seedText
    : (typeof seedInput !== 'undefined' && seedInput ? seedInput.value : '');
  console.log('Seed mapping:');
  for (const c of seed) {
    console.log(`'${c}':`, window.charToIdx ? window.charToIdx[c] : undefined);
  }
  // Debug: show currentText
  console.log('Current generationVisualization.currentText:', generationVisualization.currentText);
  console.log('generateNextCharacter called');
  console.log('Global variables:', {
    lstmModel: !!window.lstmModel,
    charToIdx: !!window.charToIdx,
    idxToChar: !!window.idxToChar,
    seqLength: window.seqLength,
    vocabSize: Array.isArray(window.idxToChar) ? window.idxToChar.length : Object.keys(window.idxToChar).length
  });
  console.log('idxToChar details:', {
    type: typeof window.idxToChar,
    isArray: Array.isArray(window.idxToChar),
    length: window.idxToChar ? (Array.isArray(window.idxToChar) ? window.idxToChar.length : Object.keys(window.idxToChar).length) : 'N/A',
    sample: window.idxToChar && Array.isArray(window.idxToChar) ? window.idxToChar.slice(0, 5) : 'N/A',
    keys: window.idxToChar && typeof window.idxToChar === 'object' ? Object.keys(window.idxToChar).slice(0, 5) : 'N/A'
  });
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
    console.log('inputIndices:', inputIndices);
    // If all indices are 0, warn
    if (inputIndices.every(i => i === 0)) {
      showPopupAlert('All input indices are 0. This means your seed/context is not matching the vocabulary. Please check your seed and training text.');
      pauseGenerationVisualization();
      return;
    }
    // Ensure we have the right sequence length
    const seqLength = window.seqLength || 15;
    const vocabSize = Array.isArray(window.idxToChar) ? window.idxToChar.length : Object.keys(window.idxToChar).length;
    console.log('Using vocab size:', vocabSize);
    // Pad or truncate input to match sequence length
    let paddedIndices = [...inputIndices];
    while (paddedIndices.length < seqLength) {
      paddedIndices.unshift(0); // Pad with zeros at the beginning
    }
    if (paddedIndices.length > seqLength) {
      paddedIndices = paddedIndices.slice(-seqLength); // Take last seqLength elements
    }
    // Guard: check for invalid indices
    if (paddedIndices.some(i => typeof i !== 'number' || isNaN(i) || i < 0 || i >= vocabSize)) {
      console.error('Invalid input indices:', paddedIndices);
      showPopupAlert('Invalid input indices detected. Please check your seed and training text.');
      pauseGenerationVisualization();
      return;
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
    let nextIdx;
    const preds = window.lstmModel.predict(inputTensor).dataSync();
    nextIdx = sampleWithTemperature(preds, 0.8); // Use temperature for variety
    const vocabLen = Array.isArray(window.idxToChar) ? window.idxToChar.length : Object.keys(window.idxToChar).length;
    console.log('Sampled nextIdx:', nextIdx, 'idxToChar.length:', vocabLen, 'preds:', preds);
    // Defensive fix: if nextIdx is not a valid index, pick the most probable valid index
    if (typeof nextIdx !== 'number' || isNaN(nextIdx) || nextIdx < 0 || nextIdx >= vocabLen) {
      // Find the most probable valid index
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
    // --- PATCH: Prevent '?' from corrupting context ---
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

function drawLSTMMemoryHeatmap(states) {
  const canvas = document.getElementById('lstm-memory-heatmap');
  if (!canvas || !states.length) return;
  const ctx = canvas.getContext('2d');
  const rows = states.length;
  const cols = states[0].length;
  const cellWidth = canvas.width / cols;
  const cellHeight = canvas.height / rows;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      // Normalize value to [0,1] for color
      const v = states[y][x];
      const norm = (v + 1) / 2; // assuming tanh output in [-1,1]
      ctx.fillStyle = `rgba(0,0,0,${norm})`;
      ctx.fillRect(x * cellWidth, y * cellHeight, cellWidth, cellHeight);
    }
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

// Also update any .toFixed() calls in status/progress updates to guard for undefined or non-number values
function safeFixed(val, digits) {
  return (typeof val === 'number' && isFinite(val)) ? val.toFixed(digits) : 'N/A';
} 