// lstm.js

// --- Popup Alert Helper ---
function showPopupAlert(message) {
  const popup = document.getElementById('popup-alert');
  const msg = document.getElementById('popup-alert-message');
  if (msg) msg.textContent = message;
  if (popup) popup.style.display = 'flex';
}

// --- Sample Training Text ---
const SAMPLE_TRAINING_TEXT = `Two roads diverged in a yellow wood,
And sorry I could not travel both
And be one traveler, long I stood
And looked down one as far as I could
To where it bent in the undergrowth;`;

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
  for (let i = 0; i < text.length - seqLength; ++i) {
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
    units: 16, // reduced for demo responsiveness
    inputShape: [seqLength, vocabSize]
  }));
  model.add(tf.layers.dense({units: vocabSize, activation: 'softmax'}));
  model.compile({
    loss: 'categoricalCrossentropy',
    optimizer: tf.train.adam()
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
  const metrics = ['loss'];
  const container = {name: 'LSTM Training', tab: 'Training'};
  tfvis.visor().open(); // Ensure the visor is open
  await model.fit(xs, ys, {
    epochs,
    batchSize,
    shuffle: true,
    callbacks: [
      tfvis.show.fitCallbacks(container, metrics),
      {
        onEpochEnd: async (epoch, logs) => {
          statusCallback(`Epoch ${epoch + 1}: loss=${logs.loss.toFixed(4)}`);
          await tf.nextFrame(); // Yield to browser
        },
        onBatchEnd: async () => {
          await tf.nextFrame(); // Yield to browser
        }
      }
    ]
  });
}

// --- 6. Text Generation ---
async function generateText(model, seed, charToIdx, idxToChar, genLength, temperature) {
  let inputIndices = textToIndices(seed, charToIdx);
  let generated = seed;
  for (let i = 0; i < genLength; ++i) {
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
    // Sample with temperature
    const nextIdx = sampleWithTemperature(preds, temperature);
    generated += idxToChar[nextIdx];
    inputIndices = inputIndices.slice(1).concat(nextIdx);
    tf.dispose(inputTensor);
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
let lstmModel = null, charToIdx = null, idxToChar = null, seqLength = 10; // default 10 for demo

window.addEventListener('DOMContentLoaded', () => {
  const trainBtn = document.getElementById('lstm-train-btn');
  const trainStatus = document.getElementById('lstm-train-status');
  const genBtn = document.getElementById('lstm-generate-btn');
  const genOutput = document.getElementById('lstm-gen-output');
  const sampleBtn = document.getElementById('lstm-sample-btn');
  const trainTextArea = document.getElementById('lstm-train-text');
  const seqInput = document.getElementById('lstm-seq-length');
  const epochsInput = document.getElementById('lstm-epochs');
  const batchInput = document.getElementById('lstm-batch-size');

  // Set demo-friendly defaults
  if (seqInput) seqInput.value = 10;
  if (epochsInput) epochsInput.value = 1;
  if (batchInput) batchInput.value = 8;

  if (sampleBtn && trainTextArea) {
    sampleBtn.onclick = () => {
      trainTextArea.value = SAMPLE_TRAINING_TEXT;
    };
  }

  if (trainBtn) {
    trainBtn.onclick = async () => {
      const text = trainTextArea.value;
      seqLength = parseInt(seqInput.value);
      const epochs = parseInt(epochsInput.value);
      const batchSize = parseInt(batchInput.value);
      // Warn if settings are likely to freeze the browser
      if (text.length > 500 || seqLength > 20 || epochs > 3 || batchSize > 32) {
        showPopupAlert('Warning: Large training settings may freeze your browser!\nTry using less than 500 characters, sequence length ≤ 20, epochs ≤ 3, and batch size ≤ 32 for best results.');
        return;
      }
      if (!text || text.length < seqLength + 1) {
        showPopupAlert('Please enter more training text.');
        return;
      }
      trainStatus.textContent = 'Preparing data...';
      idxToChar = getUniqueChars(text);
      charToIdx = {};
      idxToChar.forEach((c, i) => charToIdx[c] = i);
      const {inputs, labels} = createSequences(text, seqLength, charToIdx);
      const {xs, ys} = vectorizeData(inputs, labels, seqLength, idxToChar.length);
      lstmModel = createLSTMModel(seqLength, idxToChar.length);
      trainStatus.textContent = 'Training...';
      await trainLSTMModel(lstmModel, xs, ys, epochs, batchSize, msg => {
        trainStatus.textContent = msg;
      });
      xs.dispose();
      ys.dispose();
      trainStatus.textContent = 'Training complete!';
    };
  }

  if (genBtn) {
    genBtn.onclick = async () => {
      if (!lstmModel) {
        showPopupAlert('Train the model first!');
        return;
      }
      const seed = document.getElementById('lstm-seed').value;
      const genLength = parseInt(document.getElementById('lstm-gen-length').value);
      const temp = parseFloat(document.getElementById('lstm-temp').value);
      if (!seed || seed.length < seqLength) {
        showPopupAlert(`Seed must be at least ${seqLength} characters.`);
        return;
      }
      genOutput.textContent = 'Generating...';
      const output = await generateText(lstmModel, seed.slice(0, seqLength), charToIdx, idxToChar, genLength, temp);
      genOutput.textContent = output;
    };
  }
}); 