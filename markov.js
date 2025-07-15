// Ensure all code runs after DOM is loaded
window.addEventListener('DOMContentLoaded', function() {
  let markov = null;

  const inputText = document.getElementById('inputText');
  const orderInput = document.getElementById('order');
  const trainBtn = document.getElementById('trainBtn');
  const generateBtn = document.getElementById('generateBtn');
  const seedInput = document.getElementById('seed');
  const maxWordsInput = document.getElementById('maxWords');
  const output = document.getElementById('output');

  // Disable generate button initially
  generateBtn.disabled = true;

  trainBtn.onclick = function() {
    const text = inputText.value.trim();
    const order = parseInt(orderInput.value, 10);
    if (!text) {
      output.textContent = 'Please enter some training text.';
      generateBtn.disabled = true;
      return;
    }
    markov = new MarkovChain(order);
    markov.train(text);
    if (Object.keys(markov.chain).length === 0) {
      output.textContent = 'Training failed: not enough data for the selected order.';
      generateBtn.disabled = true;
      return;
    }
    output.textContent = 'Model trained! You can now generate text.';
    generateBtn.disabled = false;
    renderMarkovGraph(markov);
  };

  generateBtn.onclick = function() {
    if (!markov || Object.keys(markov.chain).length === 0) {
      output.textContent = 'Please train the model before generating text.';
      return;
    }
    const seed = seedInput.value.trim();
    const maxWords = parseInt(maxWordsInput.value, 10) || 50;
    let generated = '';
    let path = [];
    try {
      // If your MarkovChain.generate returns a path, use it; else, reconstruct
      if (markov.generate.length >= 3) {
        // generate(maxWords, seed, recordPath)
        const result = markov.generate(maxWords, seed, true);
        generated = result.text;
        path = result.path;
      } else {
        generated = markov.generate(maxWords, seed);
        // Reconstruct path from generated text
        const words = generated.split(/\s+/);
        for (let i = 0; i <= words.length - markov.order; i++) {
          path.push(words.slice(i, i + markov.order).join(' '));
        }
      }
    } catch (e) {
      output.textContent = 'Error during generation: ' + e.message;
      return;
    }
    output.textContent = generated;
    // Highlight n-grams in generated text
    const highlightNgrams = new Set(path);
    renderMarkovGraph(markov, highlightNgrams, path);
  };
});

class MarkovChain {
  constructor(order = 2) {
    this.order = order;
    this.chain = {};
  }

  train(text) {
    const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
    for (let i = 0; i <= words.length - this.order; i++) {
      const key = words.slice(i, i + this.order).join(' ');
      const nextWord = words[i + this.order];
      if (!this.chain[key]) this.chain[key] = [];
      if (nextWord) this.chain[key].push(nextWord);
    }
  }

  generate(maxWords = 50, seed = null, recordPath = false) {
    const keys = Object.keys(this.chain);
    if (keys.length === 0) {
      if (recordPath) return { text: '', path: [] };
      return '';
    }
    let current = seed && this.chain[seed] ? seed : keys[Math.floor(Math.random() * keys.length)];
    if (typeof current !== 'string' || !current) current = keys[0];
    const result = current.split(' ');
    const path = [current];
    while (result.length < maxWords) {
      const key = result.slice(-this.order).join(' ');
      const nextWords = this.chain[key];
      if (!nextWords || nextWords.length === 0) break;
      const next = nextWords[Math.floor(Math.random() * nextWords.length)];
      result.push(next);
      const nextKey = result.slice(-this.order).join(' ');
      path.push(nextKey);
    }
    if (recordPath) return { text: result.join(' '), path };
    return result.join(' ');
  }
}

let lastNgrams = new Set();
let focusedNodeId = null;
let stationaryDist = {};
let genPath = [];
let genPathStep = 0;
let genPathTimer = null;

function extractNgrams(text, order) {
  if (!text) return new Set();
  const words = text.toLowerCase().replace(/[^\w\s]/g, '').split(/\s+/).filter(Boolean);
  const ngrams = new Set();
  for (let i = 0; i <= words.length - order; i++) {
    ngrams.add(words.slice(i, i + order).join(' '));
  }
  return ngrams;
}

function computeProbabilities(chain) {
  const edgeCounts = {};
  for (const key in chain) {
    const total = chain[key].length;
    const counts = {};
    chain[key].forEach(nextWord => {
      const keyParts = key.split(' ');
      const nextKey = [...keyParts.slice(1), nextWord].join(' ');
      counts[nextKey] = (counts[nextKey] || 0) + 1;
    });
    edgeCounts[key] = { total, counts };
  }
  return edgeCounts;
}

function computeStationaryDistribution(chain) {
  const keys = Object.keys(chain);
  if (keys.length === 0) return {};
  const idx = Object.fromEntries(keys.map((k, i) => [k, i]));
  const n = keys.length;
  const P = Array.from({ length: n }, () => Array(n).fill(0));
  for (let i = 0; i < n; ++i) {
    const key = keys[i];
    const nexts = chain[key] || [];
    const total = nexts.length;
    if (total === 0) continue;
    const counts = {};
    nexts.forEach(nextWord => {
      const keyParts = key.split(' ');
      const nextKey = [...keyParts.slice(1), nextWord].join(' ');
      if (idx[nextKey] !== undefined) {
        counts[nextKey] = (counts[nextKey] || 0) + 1;
      }
    });
    for (const [nextKey, count] of Object.entries(counts)) {
      P[i][idx[nextKey]] = count / total;
    }
  }
  let v = Array(n).fill(1 / n);
  let vNext = Array(n).fill(0);
  let maxDelta = 1;
  let iter = 0;
  while (maxDelta > 1e-8 && iter < 1000) {
    for (let j = 0; j < n; ++j) {
      vNext[j] = 0;
      for (let i = 0; i < n; ++i) {
        vNext[j] += v[i] * P[i][j];
      }
    }
    maxDelta = Math.max(...vNext.map((x, i) => Math.abs(x - v[i])));
    [v, vNext] = [vNext, v];
    iter++;
  }
  const result = {};
  for (let i = 0; i < n; ++i) result[keys[i]] = v[i];
  return result;
}

function visualizeMarkovChain(chain, highlightNgrams = new Set(), focusId = null, stationary = {}, path = [], pathStep = -1) {
  const nodes = [];
  const nodeIds = new Set();
  const links = [];
  for (const key in chain) {
    if (!nodeIds.has(key)) {
      nodes.push({ id: key });
      nodeIds.add(key);
    }
    const nextWords = chain[key];
    nextWords.forEach(nextWord => {
      const keyParts = key.split(' ');
      const nextKey = [...keyParts.slice(1), nextWord].join(' ');
      if (!nodeIds.has(nextKey)) {
        nodes.push({ id: nextKey });
        nodeIds.add(nextKey);
      }
      links.push({ source: key, target: nextKey });
    });
  }

  const edgeProbs = computeProbabilities(chain);
  const linkCounts = {};
  links.forEach(link => {
    const { counts, total } = edgeProbs[link.source];
    link.prob = counts[link.target] / total;
    const key = link.source + '->' + link.target;
    linkCounts[key] = (linkCounts[key] || 0) + 1;
    link.parallelIndex = linkCounts[key];
  });

  const width = document.getElementById('graph').clientWidth || 800;
  const height = document.getElementById('graph').clientHeight || 500;

  const svg = d3.select('#graph')
    .append('svg')
    .attr('width', width)
    .attr('height', height)
    .style('cursor', focusId ? 'pointer' : 'default')
    .on('click', function(event) {
      if (event.target === this) {
        focusedNodeId = null;
        visualizeMarkovChain(chain, highlightNgrams, null, stationary, path, pathStep);
      }
    });

  const minR = 14, maxR = 36;
  const probs = nodes.map(n => stationary[n.id] || 0);
  const minP = Math.min(...probs), maxP = Math.max(...probs);
  const rScale = p => minR + (maxR - minR) * ((p - minP) / (maxP - minP + 1e-12));

  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(80))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(width / 2, height / 2));

  const pathSet = new Set(path.slice(0, pathStep + 1));
  const pathEdgeSet = new Set();
  for (let i = 1; i <= pathStep; ++i) {
    pathEdgeSet.add(path[i - 1] + '->' + path[i]);
  }

  const link = svg.append('g')
    .attr('stroke', '#999')
    .attr('stroke-opacity', 0.6)
    .selectAll('line')
    .data(links)
    .join('line')
    .attr('stroke-width', d => pathEdgeSet.has(d.source.id + '->' + d.target.id) ? 4 : (focusId && d.source.id === focusId ? 3 : 1.5))
    .attr('stroke', d => pathEdgeSet.has(d.source.id + '->' + d.target.id) ? '#ff2222' : (focusId && d.source.id === focusId ? '#ffb347' : '#999'))
    .attr('opacity', d => focusId && d.source.id !== focusId ? 0.2 : 1);

  const probLabels = svg.append('g')
    .selectAll('text')
    .data(links)
    .join('text')
    .attr('class', 'prob-label')
    .text(d => (d.prob * 100).toFixed(1) + '%');

  const node = svg.append('g')
    .attr('stroke', '#fff')
    .attr('stroke-width', 1.5)
    .selectAll('circle')
    .data(nodes)
    .join('circle')
    .attr('r', d => rScale(stationary[d.id] || 0))
    .attr('fill', d => pathSet.has(d.id) ? '#ff2222' : (focusId && d.id === focusId ? '#ffb347' : '#69b3a2'))
    .attr('class', d => [highlightNgrams.has(d.id) ? 'node-glow' : '', focusId && d.id === focusId ? 'focused-node' : ''].join(' '))
    .on('click', function(event, d) {
      event.stopPropagation();
      if (focusId === d.id) {
        focusedNodeId = null;
        visualizeMarkovChain(chain, highlightNgrams, null, stationary, path, pathStep);
      } else {
        focusedNodeId = d.id;
        visualizeMarkovChain(chain, highlightNgrams, d.id, stationary, path, pathStep);
      }
    })
    .call(drag(simulation));

  const statLabels = svg.append('g')
    .selectAll('text')
    .data(nodes)
    .join('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '2.2em')
    .attr('font-size', 11)
    .attr('fill', '#333')
    .text(d => stationary[d.id] ? (stationary[d.id] * 100).toFixed(2) + '%' : '');

  const label = svg.append('g')
    .selectAll('text')
    .data(nodes)
    .join('text')
    .attr('text-anchor', 'middle')
    .attr('dy', '.35em')
    .attr('font-size', 12)
    .text(d => d.id);

  simulation.on('tick', () => {
    link
      .attr('x1', d => d.source.x)
      .attr('y1', d => d.source.y)
      .attr('x2', d => d.target.x)
      .attr('y2', d => d.target.y);
    node
      .attr('cx', d => d.x)
      .attr('cy', d => d.y);
    label
      .attr('x', d => d.x)
      .attr('y', d => d.y);
    statLabels
      .attr('x', d => d.x)
      .attr('y', d => d.y + rScale(stationary[d.id] || 0) + 10);
    probLabels
      .attr('x', d => (d.source.x + d.target.x) / 2)
      .attr('y', d => (d.source.y + d.target.y) / 2 - 8);
  });

  function drag(simulation) {
    function dragstarted(event, d) {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    }
    function dragged(event, d) {
      d.fx = event.x;
      d.fy = event.y;
    }
    function dragended(event, d) {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    }
    return d3.drag()
      .on('start', dragstarted)
      .on('drag', dragged)
      .on('end', dragended);
  }
}

function showPathControls(path, stationary) {
  let controls = document.getElementById('path-controls');
  if (!controls) {
    controls = document.createElement('div');
    controls.id = 'path-controls';
    controls.style.margin = '1em 0';
    controls.innerHTML = `
      <button id="path-prev">Prev</button>
      <button id="path-next">Next</button>
      <button id="path-play">Play</button>
      <button id="path-stop">Stop</button>
      <span id="path-step-label"></span>
    `;
    document.getElementById('graph').parentNode.insertBefore(controls, document.getElementById('graph'));
  }
  document.getElementById('path-step-label').textContent = path.length ? `Step ${genPathStep + 1} / ${path.length}` : '';
  document.getElementById('path-prev').onclick = () => {
    if (genPathStep > 0) {
      genPathStep--;
      visualizeMarkovChain(markov.chain, lastNgrams, focusedNodeId, stationary, genPath, genPathStep);
      showPathControls(genPath, stationary);
    }
  };
  document.getElementById('path-next').onclick = () => {
    if (genPathStep < genPath.length - 1) {
      genPathStep++;
      visualizeMarkovChain(markov.chain, lastNgrams, focusedNodeId, stationary, genPath, genPathStep);
      showPathControls(genPath, stationary);
    }
  };
  document.getElementById('path-play').onclick = () => {
    if (genPathTimer) return;
    genPathTimer = setInterval(() => {
      if (genPathStep < genPath.length - 1) {
        genPathStep++;
        visualizeMarkovChain(markov.chain, lastNgrams, focusedNodeId, stationary, genPath, genPathStep);
        showPathControls(genPath, stationary);
      } else {
        clearInterval(genPathTimer);
        genPathTimer = null;
      }
    }, 600);
  };
  document.getElementById('path-stop').onclick = () => {
    if (genPathTimer) {
      clearInterval(genPathTimer);
      genPathTimer = null;
    }
  };
}

function hidePathControls() {
  const controls = document.getElementById('path-controls');
  if (controls) controls.remove();
}

// --- Visualization ---
function renderMarkovGraph(markov, highlightNgrams = new Set(), path = []) {
  console.log('renderMarkovGraph called');
  const canvas = document.getElementById('graphCanvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // --- DEBUG: Test canvas rendering ---
  if (window.DEBUG_MARKOV_CANVAS) {
    ctx.beginPath();
    ctx.arc(100, 100, 40, 0, 2 * Math.PI);
    ctx.fillStyle = 'red';
    ctx.fill();
    ctx.beginPath();
    ctx.arc(300, 200, 60, 0, 2 * Math.PI);
    ctx.fillStyle = 'blue';
    ctx.fill();
    ctx.font = '32px sans-serif';
    ctx.fillStyle = 'black';
    ctx.fillText('Canvas works!', 400, 100);
    return;
  }

  // --- Robust node/link construction ---
  // Collect all keys (states) and all nextWords (possible targets)
  const keySet = new Set(Object.keys(markov.chain));
  const nextWords = new Set();
  for (const tos of Object.values(markov.chain)) {
    tos.forEach(w => nextWords.add(w));
  }
  // Add any nextWord not already a key as a node
  nextWords.forEach(w => {
    if (!keySet.has(w)) keySet.add(w);
  });
  const nodes = Array.from(keySet).map((key, i) => ({ id: key, index: i }));
  const nodeIndex = Object.fromEntries(nodes.map((n, i) => [n.id, i]));

  // Build links
  const links = [];
  for (const [from, tos] of Object.entries(markov.chain)) {
    const counts = {};
    tos.forEach(to => { counts[to] = (counts[to] || 0) + 1; });
    const total = tos.length;
    for (const [to, count] of Object.entries(counts)) {
      links.push({
        source: from,
        target: to,
        value: count,
        prob: (count / total)
      });
    }
  }

  console.log('Nodes:', nodes);
  console.log('Links:', links);

  if (nodes.length === 0) {
    ctx.font = '20px sans-serif';
    ctx.fillStyle = '#888';
    ctx.fillText('No Markov states to display.', 40, 60);
    return;
  }

  const width = canvas.width;
  const height = canvas.height;

  // Highlight path: build a set of node ids and edge pairs
  const pathNodes = new Set(path);
  const pathEdges = new Set();
  for (let i = 0; i < path.length - 1; ++i) {
    pathEdges.add(path[i] + '->' + path[i + 1]);
  }

  // Node size: degree (or use stationary if available)
  const degree = {};
  links.forEach(l => {
    degree[l.source] = (degree[l.source] || 0) + 1;
    degree[l.target] = (degree[l.target] || 0) + 1;
  });
  const minR = 18, maxR = 36;
  const degVals = Object.values(degree);
  const minDeg = Math.min(...degVals), maxDeg = Math.max(...degVals);
  function nodeRadius(id) {
    if (minDeg === maxDeg) return (minR + maxR) / 2;
    return minR + (maxR - minR) * ((degree[id] - minDeg) / (maxDeg - minDeg));
  }

  // --- Force simulation ---
  // Initialize nodes at center for "blow up" effect
  nodes.forEach(n => {
    n.x = width / 2;
    n.y = height / 2;
    n.vx = (Math.random() - 0.5) * 8; // more visible blow up
    n.vy = (Math.random() - 0.5) * 8;
  });

  // D3 force simulation
  const simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(120))
    .force('charge', d3.forceManyBody().strength(-400))
    .force('center', d3.forceCenter(width / 2, height / 2))
    .alpha(1)
    .alphaDecay(0.03)
    .on('tick', ticked)
    .on('end', () => simulation.stop());

  // --- Zoom and pan ---
  let transform = d3.zoomIdentity;
  d3.select(canvas).call(
    d3.zoom()
      .scaleExtent([0.2, 5])
      .on('zoom', (event) => {
        transform = event.transform;
        ticked();
      })
  );

  // --- Node dragging ---
  let draggingNode = null;
  let dragOffset = { x: 0, y: 0 };

  canvas.onmousedown = function(e) {
    const rect = canvas.getBoundingClientRect();
    const mx = (e.clientX - rect.left - transform.x) / transform.k;
    const my = (e.clientY - rect.top - transform.y) / transform.k;
    for (const n of nodes) {
      const r = nodeRadius(n.id);
      if ((mx - n.x) ** 2 + (my - n.y) ** 2 < r * r) {
        draggingNode = n;
        dragOffset.x = n.x - mx;
        dragOffset.y = n.y - my;
        simulation.alphaTarget(0.3).restart();
        break;
      }
    }
  };
  canvas.onmousemove = function(e) {
    if (draggingNode) {
      const rect = canvas.getBoundingClientRect();
      const mx = (e.clientX - rect.left - transform.x) / transform.k;
      const my = (e.clientY - rect.top - transform.y) / transform.k;
      draggingNode.fx = mx + dragOffset.x;
      draggingNode.fy = my + dragOffset.y;
      simulation.alphaTarget(0.3).restart();
    }
  };
  canvas.onmouseup = function(e) {
    if (draggingNode) {
      draggingNode.fx = null;
      draggingNode.fy = null;
      simulation.alphaTarget(0);
      draggingNode = null;
    }
  };
  canvas.onmouseleave = function(e) {
    if (draggingNode) {
      draggingNode.fx = null;
      draggingNode.fy = null;
      simulation.alphaTarget(0);
      draggingNode = null;
    }
  };

  function ticked() {
    console.log('Force simulation tick');
    ctx.save();
    ctx.clearRect(0, 0, width, height);
    ctx.translate(transform.x, transform.y);
    ctx.scale(transform.k, transform.k);
    // Clamp node positions to canvas area
    const margin = 40;
    nodes.forEach(n => {
      n.x = Math.max(margin, Math.min(width - margin, n.x));
      n.y = Math.max(margin, Math.min(height - margin, n.y));
    });
    // Draw links
    ctx.save();
    links.forEach(l => {
      const source = typeof l.source === 'object' ? l.source : nodes[nodeIndex[l.source]];
      const target = typeof l.target === 'object' ? l.target : nodes[nodeIndex[l.target]];
      ctx.beginPath();
      ctx.moveTo(source.x, source.y);
      ctx.lineTo(target.x, target.y);
      ctx.strokeStyle = pathEdges.has((source.id || source.index) + '->' + (target.id || target.index)) ? '#e74c3c' : '#aaa';
      ctx.lineWidth = Math.max(2, 6 * l.prob);
      ctx.globalAlpha = 0.7;
      ctx.stroke();
      ctx.globalAlpha = 1;
      // Draw probability label
      const mx = (source.x + target.x) / 2;
      const my = (source.y + target.y) / 2;
      ctx.font = '12px sans-serif';
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 4;
      ctx.strokeText((l.prob * 100).toFixed(0) + '%', mx, my - 8);
      ctx.fillStyle = '#333';
      ctx.fillText((l.prob * 100).toFixed(0) + '%', mx, my - 8);
    });
    ctx.restore();
    // Draw nodes
    nodes.forEach(n => {
      ctx.save();
      ctx.beginPath();
      ctx.arc(n.x, n.y, nodeRadius(n.id), 0, 2 * Math.PI);
      if (pathNodes.has(n.id)) {
        ctx.fillStyle = '#e74c3c';
      } else if (highlightNgrams.has(n.id)) {
        ctx.shadowColor = '#ffd700';
        ctx.shadowBlur = 24;
        ctx.fillStyle = '#ffd700';
      } else {
        ctx.fillStyle = '#69b3a2';
      }
      ctx.fill();
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#fff';
      ctx.stroke();
      ctx.restore();
      // Node label
      ctx.font = '14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = '#222';
      ctx.fillText(n.id, n.x, n.y);
    });
    ctx.restore();
  }
}

// --- Hook up visualization to training and generation ---
window.addEventListener('DOMContentLoaded', function() {
  let markov = null;

  const inputText = document.getElementById('inputText');
  const orderInput = document.getElementById('order');
  const trainBtn = document.getElementById('trainBtn');
  const generateBtn = document.getElementById('generateBtn');
  const seedInput = document.getElementById('seed');
  const maxWordsInput = document.getElementById('maxWords');
  const output = document.getElementById('output');

  generateBtn.disabled = true;

  trainBtn.onclick = function() {
    const text = inputText.value.trim();
    const order = parseInt(orderInput.value, 10);
    if (!text) {
      output.textContent = 'Please enter some training text.';
      generateBtn.disabled = true;
    return;
  }
  markov = new MarkovChain(order);
  markov.train(text);
    if (Object.keys(markov.chain).length === 0) {
      output.textContent = 'Training failed: not enough data for the selected order.';
      generateBtn.disabled = true;
      return;
    }
    output.textContent = 'Model trained! You can now generate text.';
    generateBtn.disabled = false;
    renderMarkovGraph(markov);
  };

  generateBtn.onclick = function() {
  if (!markov || Object.keys(markov.chain).length === 0) {
      output.textContent = 'Please train the model before generating text.';
      return;
    }
    const seed = seedInput.value.trim();
    const maxWords = parseInt(maxWordsInput.value, 10) || 50;
    let generated = '';
    let path = [];
    try {
      // If your MarkovChain.generate returns a path, use it; else, reconstruct
      if (markov.generate.length >= 3) {
        // generate(maxWords, seed, recordPath)
        const result = markov.generate(maxWords, seed, true);
        generated = result.text;
        path = result.path;
      } else {
        generated = markov.generate(maxWords, seed);
        // Reconstruct path from generated text
        const words = generated.split(/\s+/);
        for (let i = 0; i <= words.length - markov.order; i++) {
          path.push(words.slice(i, i + markov.order).join(' '));
        }
      }
    } catch (e) {
      output.textContent = 'Error during generation: ' + e.message;
    return;
  }
    output.textContent = generated;
    // Highlight n-grams in generated text
    const highlightNgrams = new Set(path);
    renderMarkovGraph(markov, highlightNgrams, path);
  };
});