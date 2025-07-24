import "https://cdn.jsdelivr.net/npm/onnxruntime-web/dist/ort.min.js";
import "https://cdn.jsdelivr.net/npm/d3@7";

const MODEL_URL = "https://huggingface.co/Amanvir/gpt-2-onnx-test/resolve/main/gpt2.onnx";

let session = null;
let modelLoaded = false;
let modelLoading = false;

function setStatus(msg, isError = false) {
  const status = document.getElementById("attn-status");
  status.textContent = msg;
  status.style.color = isError ? "#c00" : "#333";
}

function setSpinner(visible, msg = "Loading...") {
  let spinner = document.getElementById("attn-spinner");
  if (!spinner) {
    spinner = document.createElement("div");
    spinner.id = "attn-spinner";
    spinner.style = "margin:1em;font-size:1.2em;";
    spinner.innerHTML = "<span style='display:inline-block;width:1em;height:1em;border:2px solid #1976d2;border-radius:50%;border-top:2px solid #fff;animation:spin 1s linear infinite;vertical-align:middle;'></span> <span id='attn-spinner-msg'>"+msg+"</span>";
    // Use ²correct container
    const container = document.getElementById("gpt2-container");
    if (container) {
      container.appendChild(spinner);
    }
    const style = document.createElement('style');
    style.innerHTML = `@keyframes spin { 0% { transform: rotate(0deg);} 100% { transform: rotate(360deg);} }`;
    document.head.appendChild(style);
  }
  spinner.style.display = visible ? "block" : "none";
  if (visible) {
    spinner.querySelector('#attn-spinner-msg').textContent = msg;
  }
}

function setModelProgress(percent) {
  const runBtn = document.getElementById("attn-run-btn");
  if (!runBtn) return;
  if (percent === null) {
    runBtn.textContent = "Visualize Attention";
  } else {
    runBtn.textContent = `Downloading: ${percent}%`;
  }
}

async function loadModel() {
  if (modelLoaded || modelLoading) return;
  modelLoading = true;
  setStatus("Loading model and tokenizer...");
  setSpinner(true, "Downloading model...");
  setModelProgress(0);
  const runBtn = document.getElementById("attn-run-btn");
  if (runBtn) runBtn.disabled = true;
  try {
    // Download ONNX model as ArrayBuffer with progress
    const response = await fetch(MODEL_URL);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const contentLength = response.headers.get('content-length');
    const total = contentLength ? parseInt(contentLength) : null;
    const reader = response.body.getReader();
    let received = 0;
    let chunks = [];
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      chunks.push(value);
      received += value.length;
      if (total) setModelProgress(Math.floor(received / total * 100));
    }
    setModelProgress(null);
    setSpinner(true, "Initializing model...");
    const modelArray = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      modelArray.set(chunk, offset);
      offset += chunk.length;
    }
    // Load ONNX model from ArrayBuffer
    session = await ort.InferenceSession.create(modelArray.buffer);
    
    // Debug: Print model input and output names
    console.log('ONNX Model Input Names:', session.inputNames);
    console.log('ONNX Model Output Names:', session.outputNames);
    
    // Check tokenizer
    if (typeof window.encode !== 'function' || typeof window.decode !== 'function') {
      setStatus("Tokenizer functions not loaded. Please check the <script type=\"module\"> block in index.html.", true);
      setSpinner(false);
      modelLoading = false;
      return;
    }
    modelLoaded = true;
    setStatus("Model and tokenizer loaded. Ready to visualize.");
    setSpinner(false);
    if (runBtn) {
      runBtn.disabled = false;
      runBtn.textContent = "Visualize Attention";
    }
    document.getElementById("attn-load-model-btn").disabled = true;
  } catch (e) {
    setStatus("Failed to load model: " + e.message, true);
    setSpinner(false);
    setModelProgress(null);
    if (runBtn) runBtn.disabled = true;
    modelLoading = false;
  }
}

async function run() {
  const btn = document.getElementById("attn-run-btn");
  btn.disabled = true;
  setStatus("");
  if (!modelLoaded || !session) {
    setStatus("Model not loaded. Please click 'Load Model' first.", true);
    btn.disabled = false;
    return;
  }
  const prompt = document.getElementById("attn-prompt").value;
  const layerIdx = parseInt(document.getElementById("attn-layer").value);
  const headIdx = parseInt(document.getElementById("attn-head").value);
  
  setStatus("Tokenizing...");
  let inputIds;
  try {
    inputIds = window.encode(prompt);
    
    // ADD DEBUGGING HERE
    console.log('Input text:', prompt);
    console.log('Token IDs:', inputIds);
    console.log('Max token ID:', Math.max(...inputIds));
    console.log('Min token ID:', Math.min(...inputIds));
    
    // ADD VALIDATION HERE
    const maxValidTokenId = 50256; // GPT-2 vocab size
    const invalidTokens = inputIds.filter(id => id > maxValidTokenId || id < 0);
    console.log('Invalid tokens found:', invalidTokens);
    if (invalidTokens.length > 0) {
      setStatus(`Invalid token IDs found: [${invalidTokens.join(', ')}]. Max allowed: ${maxValidTokenId}`, true);
      console.error('Stopping execution due to invalid token IDs');
      btn.disabled = false;
      return;
    }
    console.log('All token IDs are valid');
    
  } catch (e) {
    setStatus("Tokenizer error: " + e.message, true);
    btn.disabled = false;
    return;
  }
  
  const inputIdsBigInt = new BigInt64Array(inputIds.map(x => BigInt(x)));
  let tokens = [];
  try {
    tokens = inputIds.map(id => window.decode([id]));
  } catch (e) {
    setStatus("Token decode error: " + e.message, true);
    btn.disabled = false;
    return;
  }
  document.getElementById("attn-tokens").textContent = "Tokens: " + tokens.join(" ");

  setStatus("Running model...");
  setSpinner(true, "Running model...");
  let results;
  try {
    const feeds = { "input": new ort.Tensor("int64", inputIdsBigInt, [1, inputIds.length]) };
    results = await session.run(feeds);
    
    // Debug: Print all available result keys
    console.log('ONNX Model Results Keys:', Object.keys(results));
    console.log('ONNX Model Results:', results);
    
  } catch (e) {
    setStatus("Model inference error: " + e.message, true);
    setSpinner(false);
    btn.disabled = false;
    return;
  }
  
  // ... rest of the function remains the same
  let attn;
  if (results.attentions) {
    console.log('Found attentions in results.attentions');
    attn = results.attentions[layerIdx][headIdx];
  } else if (results['attentions']) {
    console.log('Found attentions in results["attentions"]');
    attn = results['attentions'][layerIdx][headIdx];
  } else {
    // Prefer softmaxed attention weights for visualization
    const attnSoftmaxKey = `block_${layerIdx}_attn_head_${headIdx}_attn_softmax`;
    const attnKey = `block_${layerIdx}_attn_head_${headIdx}_attn`;
    if (results[attnSoftmaxKey]) {
      console.log(`Found attention in ${attnSoftmaxKey} (softmaxed, normalized)`);
      attn = results[attnSoftmaxKey];
    } else if (results[attnKey]) {
      console.warn(`Softmaxed attention not found, using raw attention logits from ${attnKey}. This may not be accurate!`);
      attn = results[attnKey];
    } else {
      console.log('No attentions found. Available keys:', Object.keys(results));
      console.log('Results structure:', results);
      setStatus('Model did not return attention weights.', true);
      setSpinner(false);
      btn.disabled = false;
      return;
    }
  }
  // Debug: Print min, max, and a sample of attention values
  if (attn && attn.data && attn.data.length) {
    const min = Math.min(...attn.data);
    const max = Math.max(...attn.data);
    const sample = attn.data.slice(0, 10);
    console.log('Attention values: min =', min, ', max =', max, ', sample =', sample);
  } else {
    console.log('Attention tensor is missing data or empty:', attn);
  }
  setSpinner(false);
  drawHeatmap(attn, tokens);
  drawGraph(attn, tokens);
  btn.disabled = false;
  setStatus("Model run complete.");
}

function drawHeatmap(attn, tokens) {
  const svg = d3.select("#attention-heatmap");
  svg.selectAll("*").remove();
  
  // Handle 3D tensor: extract the 2D attention matrix from the first batch
  let attnMatrix;
  if (attn.dims && attn.dims.length === 3) {
    // Tensor has shape [batch, seq_len, seq_len]
    const batchSize = attn.dims[0];
    const seqLen = attn.dims[1];
    attnMatrix = new Array(seqLen);
    for (let i = 0; i < seqLen; i++) {
      attnMatrix[i] = new Array(seqLen);
      for (let j = 0; j < seqLen; j++) {
        // Extract from the first batch (batch index 0)
        attnMatrix[i][j] = attn.data[i * seqLen + j];
      }
    }
  } else {
    // Assume it's already 2D
    attnMatrix = attn;
  }
  
  const margin = { top: 60, right: 60, bottom: 80, left: 80 };
  const size = Math.min(600, 35 * tokens.length);
  const width = size + margin.left + margin.right;
  const height = size + margin.top + margin.bottom;
  
  svg.attr("width", width).attr("height", height);
  
  // Create color scale with better colors
  // Use perceptually uniform colormap and fixed domain for better contrast
  const colorScale = d3.scaleSequential()
    .domain([0, 0.2]) // show more detail in the low range
    .interpolator(d3.interpolateViridis)
    .clamp(true);

  const cellSize = size / tokens.length;
  
  // Add title
  svg.append("text")
    .attr("x", width / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Attention Heatmap");
  
  // Create main group for the heatmap
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
  // Draw heatmap cells
  for (let i = 0; i < tokens.length; ++i) {
    for (let j = 0; j < tokens.length; ++j) {
      g.append("rect")
        .attr("x", j * cellSize)
        .attr("y", i * cellSize)
        .attr("width", cellSize)
        .attr("height", cellSize)
        .attr("fill", colorScale(attnMatrix[i][j]))
        .attr("stroke", "#ddd")
        .attr("stroke-width", 0.5)
        .attr("opacity", 0.8)
        .on("mouseover", function() {
          d3.select(this).attr("opacity", 1).attr("stroke-width", 2);
        })
        .on("mouseout", function() {
          d3.select(this).attr("opacity", 0.8).attr("stroke-width", 0.5);
        })
        .append("title")
        .text(`Token ${i} → Token ${j}: ${(attnMatrix[i][j] * 100).toFixed(1)}%`);
    }
  }
  
  // Add token labels on x-axis (bottom)
  tokens.forEach((t, i) => {
    g.append("text")
      .attr("x", i * cellSize + cellSize / 2)
      .attr("y", size + 15)
      .attr("text-anchor", "middle")
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .text(t);
  });
  
  // Add token labels on y-axis (left)
  tokens.forEach((t, i) => {
    g.append("text")
      .attr("x", -5)
      .attr("y", i * cellSize + cellSize / 2 + 4)
      .attr("text-anchor", "end")
      .attr("font-size", "10px")
      .attr("fill", "#333")
      .text(t);
  });
  
  // Add color legend
  const legendWidth = 200;
  const legendHeight = 20;
  const legendX = width - margin.right - legendWidth;
  const legendY = height - 40;

  // Update legend scale and axis to match new color scale domain
  const legendScale = d3.scaleLinear()
    .domain([0, 0.2])
    .range([0, legendWidth]);

  const legendAxis = d3.axisBottom(legendScale)
    .ticks(5)
    .tickFormat(d => (d * 100).toFixed(0) + "%");

  const legendGroup = svg.append("g")
    .attr("transform", `translate(${legendX}, ${legendY})`);

  // Draw legend gradient
  const defs = svg.append("defs");
  const gradient = defs.append("linearGradient")
    .attr("id", "heatmap-gradient")
    .attr("x1", "0%").attr("y1", "0%")
    .attr("x2", "100%").attr("y2", "0%");

  gradient.append("stop")
    .attr("offset", "0%")
    .attr("stop-color", colorScale(0));

  gradient.append("stop")
    .attr("offset", "100%")
    .attr("stop-color", colorScale(0.2));

  legendGroup.append("rect")
    .attr("width", legendWidth)
    .attr("height", legendHeight)
    .attr("fill", "url(#heatmap-gradient)");

  legendGroup.append("g")
    .attr("transform", `translate(0, ${legendHeight})`)
    .call(legendAxis);

  // Add legend title (label)
  svg.append("text")
    .attr("x", legendX + legendWidth / 2)
    .attr("y", legendY - 5)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .text("Attention Weight");
}

function drawGraph(attn, tokens) {
  const svg = d3.select("#attention-graph");
  svg.selectAll("*").remove();
  
  // Handle 3D tensor: extract the 2D attention matrix from the first batch
  let attnMatrix;
  if (attn.dims && attn.dims.length === 3) {
    // Tensor has shape [batch, seq_len, seq_len]
    const batchSize = attn.dims[0];
    const seqLen = attn.dims[1];
    attnMatrix = new Array(seqLen);
    for (let i = 0; i < seqLen; i++) {
      attnMatrix[i] = new Array(seqLen);
      for (let j = 0; j < seqLen; j++) {
        // Extract from the first batch (batch index 0)
        attnMatrix[i][j] = attn.data[i * seqLen + j];
      }
    }
  } else {
    // Assume it's already 2D
    attnMatrix = attn;
  }
  
  const margin = { top: 40, right: 40, bottom: 80, left: 40 };
  const width = +svg.attr("width") - margin.left - margin.right;
  const height = +svg.attr("height") - margin.top - margin.bottom;
  const n = tokens.length;
  
  // Add title
  svg.append("text")
    .attr("x", (width + margin.left + margin.right) / 2)
    .attr("y", 20)
    .attr("text-anchor", "middle")
    .attr("font-size", "16px")
    .attr("font-weight", "bold")
    .text("Attention Graph");
  
  // Create main group
  const g = svg.append("g")
    .attr("transform", `translate(${margin.left}, ${margin.top})`);
  
  const nodeY = height / 2;
  const nodeSpacing = width / (n + 1);
  
  // Draw attention connections first (so they appear behind nodes)
  for (let i = 0; i < n; ++i) {
    for (let j = 0; j < n; ++j) {
      if (attnMatrix[i][j] > 0.05) { // Show connections with >5% attention
        g.append("line")
          .attr("x1", (i + 1) * nodeSpacing)
          .attr("y1", nodeY)
          .attr("x2", (j + 1) * nodeSpacing)
          .attr("y2", nodeY)
          .attr("stroke", "#4a90e2")
          .attr("stroke-width", Math.max(0.5, attnMatrix[i][j] * 8))
          .attr("opacity", Math.max(0.1, attnMatrix[i][j]))
          .attr("stroke-dasharray", attnMatrix[i][j] > 0.3 ? "none" : "2,2");
      }
    }
  }
  
  // Draw nodes
  tokens.forEach((t, i) => {
    // Node circle
    g.append("circle")
      .attr("cx", (i + 1) * nodeSpacing)
      .attr("cy", nodeY)
      .attr("r", 12)
      .attr("fill", "#69b3a2")
      .attr("stroke", "#2c5f5a")
      .attr("stroke-width", 2)
      .on("mouseover", function() {
        d3.select(this).attr("r", 16).attr("fill", "#4a90e2");
      })
      .on("mouseout", function() {
        d3.select(this).attr("r", 12).attr("fill", "#69b3a2");
      });
    
    // Token text
    g.append("text")
      .attr("x", (i + 1) * nodeSpacing)
      .attr("y", nodeY + 25)
      .attr("text-anchor", "middle")
      .attr("font-size", "11px")
      .attr("font-weight", "bold")
      .attr("fill", "#333")
      .text(t);
  });
  
  // Add legend
  const legendY = height + 20;
  g.append("text")
    .attr("x", width / 2)
    .attr("y", legendY)
    .attr("text-anchor", "middle")
    .attr("font-size", "12px")
    .attr("font-weight", "bold")
    .text("Line thickness and opacity indicate attention strength");
  
  // Add attention strength indicators
  const legendX = 10;
  const legendSpacing = 80;
  
  [0.1, 0.3, 0.5].forEach((strength, i) => {
    const x = legendX + i * legendSpacing;
    
    g.append("line")
      .attr("x1", x)
      .attr("y1", legendY + 15)
      .attr("x2", x + 30)
      .attr("y2", legendY + 15)
      .attr("stroke", "#4a90e2")
      .attr("stroke-width", Math.max(0.5, strength * 8))
      .attr("opacity", Math.max(0.1, strength));
    
    g.append("text")
      .attr("x", x + 35)
      .attr("y", legendY + 20)
      .attr("font-size", "10px")
      .attr("fill", "#666")
      .text(`${(strength * 100).toFixed(0)}%`);
  });
}

document.getElementById("attn-load-model-btn").onclick = loadModel;
document.getElementById("attn-run-btn").onclick = run; 

// Ensure the Visualize Attention button is always disabled on page load
window.addEventListener('DOMContentLoaded', function() {
  const runBtn = document.getElementById('attn-run-btn');
  if (runBtn) runBtn.disabled = true;
}); 