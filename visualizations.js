// ========================================
// LLMVis Advanced Visualization Features
// ========================================

// Neural Network Architecture Viewer
class NeuralNetworkViewer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.layers = [];
    this.animations = [];
    this.isAnimating = false;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.drawNetwork();
  }
  
  setupEventListeners() {
    document.getElementById('animate-forward-pass')?.addEventListener('click', () => this.animateForwardPass());
    document.getElementById('animate-backward-pass')?.addEventListener('click', () => this.animateBackwardPass());
    document.getElementById('reset-animation')?.addEventListener('click', () => this.resetAnimation());
  }
  
  setLayers(inputSize, lstmSize, outputSize) {
    this.layers = [
      { type: 'input', size: inputSize, x: 100, y: 200, width: 60, height: inputSize * 3 },
      { type: 'lstm', size: lstmSize, x: 300, y: 150, width: 80, height: lstmSize * 2 },
      { type: 'output', size: outputSize, x: 500, y: 200, width: 60, height: outputSize * 3 }
    ];
    
    this.updateLayerInfo();
    this.drawNetwork();
  }
  
  updateLayerInfo() {
    const inputSize = this.layers[0]?.size || 0;
    const lstmSize = this.layers[1]?.size || 0;
    const outputSize = this.layers[2]?.size || 0;
    const totalParams = inputSize * lstmSize * 4 + lstmSize * lstmSize * 4 + lstmSize * outputSize;
    
    document.getElementById('input-size').textContent = inputSize;
    document.getElementById('lstm-size').textContent = lstmSize;
    document.getElementById('output-size').textContent = outputSize;
    document.getElementById('total-params').textContent = totalParams.toLocaleString();
  }
  
  drawNetwork() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Draw layers
    this.layers.forEach(layer => {
      this.drawLayer(layer);
    });
    
    // Draw connections
    this.drawConnections();
  }
  
  drawLayer(layer) {
    const { x, y, width, height, type, size } = layer;
    
    // Layer background
    this.ctx.fillStyle = type === 'lstm' ? '#4CAF50' : '#2196F3';
    this.ctx.fillRect(x, y, width, height);
    
    // Layer border
    this.ctx.strokeStyle = '#333';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(x, y, width, height);
    
    // Layer label
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(type.toUpperCase(), x + width/2, y + height + 20);
    
    // Neuron count
    this.ctx.fillStyle = '#333';
    this.ctx.font = '12px Arial';
    this.ctx.fillText(`${size} units`, x + width/2, y + height + 35);
    
    // Draw neurons
    this.drawNeurons(layer);
  }
  
  drawNeurons(layer) {
    const { x, y, width, height, size } = layer;
    const neuronSize = Math.min(8, height / (size + 1));
    const spacing = height / (size + 1);
    
    this.ctx.fillStyle = '#fff';
    for (let i = 0; i < size; i++) {
      const neuronY = y + spacing * (i + 1);
      this.ctx.beginPath();
      this.ctx.arc(x + width/2, neuronY, neuronSize, 0, 2 * Math.PI);
      this.ctx.fill();
      this.ctx.stroke();
    }
  }
  
  drawConnections() {
    if (this.layers.length < 2) return;
    
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 1;
    
    // Connect input to LSTM
    if (this.layers[0] && this.layers[1]) {
      this.drawLayerConnections(this.layers[0], this.layers[1]);
    }
    
    // Connect LSTM to output
    if (this.layers[1] && this.layers[2]) {
      this.drawLayerConnections(this.layers[1], this.layers[2]);
    }
  }
  
  drawLayerConnections(from, to) {
    const fromX = from.x + from.width;
    const toX = to.x;
    
    for (let i = 0; i < Math.min(from.size, 10); i++) {
      for (let j = 0; j < Math.min(to.size, 10); j++) {
        const fromY = from.y + (from.height / (from.size + 1)) * (i + 1);
        const toY = to.y + (to.height / (to.size + 1)) * (j + 1);
        
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(toX, toY);
        this.ctx.stroke();
      }
    }
  }
  
  animateForwardPass() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    const animation = {
      type: 'forward',
      step: 0,
      maxSteps: 50,
      interval: setInterval(() => {
        this.animateStep(animation);
      }, 100)
    };
    
    this.animations.push(animation);
  }
  
  animateBackwardPass() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    const animation = {
      type: 'backward',
      step: 0,
      maxSteps: 50,
      interval: setInterval(() => {
        this.animateStep(animation);
      }, 100)
    };
    
    this.animations.push(animation);
  }
  
  animateStep(animation) {
    animation.step++;
    
    if (animation.step >= animation.maxSteps) {
      this.stopAnimation(animation);
      return;
    }
    
    // Draw activation flow
    this.drawActivationFlow(animation);
  }
  
  drawActivationFlow(animation) {
    const progress = animation.step / animation.maxSteps;
    
    // Highlight connections based on animation progress
    this.ctx.strokeStyle = animation.type === 'forward' ? '#FF5722' : '#9C27B0';
    this.ctx.lineWidth = 3;
    
    if (this.layers.length >= 2) {
      const from = this.layers[0];
      const to = this.layers[1];
      const fromX = from.x + from.width;
      const toX = to.x;
      
      // Animate a few key connections
      for (let i = 0; i < 3; i++) {
        const fromY = from.y + (from.height / (from.size + 1)) * (i + 1);
        const toY = to.y + (to.height / (to.size + 1)) * (i + 1);
        this.ctx.beginPath();
        this.ctx.moveTo(fromX, fromY);
        this.ctx.lineTo(fromX + (toX - fromX) * progress, fromY + (toY - fromY) * progress);
        this.ctx.stroke();
      }
    }
    
    // Redraw the network to show the animation
    this.drawNetwork();
  }
  
  stopAnimation(animation) {
    clearInterval(animation.interval);
    this.animations = this.animations.filter(a => a !== animation);
    this.isAnimating = this.animations.length > 0;
    this.drawNetwork();
  }
  
  resetAnimation() {
    this.animations.forEach(animation => {
      clearInterval(animation.interval);
    });
    this.animations = [];
    this.isAnimating = false;
    this.drawNetwork();
  }
}

// Attention Flow Animation
class AttentionFlowAnimation {
  constructor(containerId) {
    console.log(`Creating AttentionFlowAnimation for container: ${containerId}`);
    
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`Container ${containerId} not found`);
      throw new Error(`Container ${containerId} not found`);
    }
    
    // Look for existing canvas first
    this.canvas = this.container.querySelector('#attention-flow-canvas');
    if (!this.canvas) {
      console.error('Canvas element not found in container');
      throw new Error('Canvas element not found in container');
    }
    
    console.log('Canvas found/created:', this.canvas);
    console.log('Canvas type:', typeof this.canvas);
    console.log('Canvas getContext method:', typeof this.canvas.getContext);
    console.log('Canvas tagName:', this.canvas.tagName);
    console.log('Canvas instanceof HTMLCanvasElement:', this.canvas instanceof HTMLCanvasElement);
    
    // Verify this is actually a canvas element
    if (!(this.canvas instanceof HTMLCanvasElement)) {
      console.error('Element is not a proper HTMLCanvasElement');
      console.error('Element:', this.canvas);
      throw new Error('Element is not a proper HTMLCanvasElement');
    }
    
    this.ctx = this.canvas.getContext('2d');
    if (!this.ctx) {
      console.error('Could not get canvas context');
      throw new Error('Could not get canvas context');
    }
    
    this.isPlaying = false;
    this.animationId = null;
    this.currentStep = 0;
    this.maxSteps = 100;
    this.speed = 1;
    this.zoom = 1.8; // default zoom level
    this.init();
  }
  
  init() {
    console.log('Initializing AttentionFlowAnimation');
    this.setupEventListeners();
    this.draw();
    console.log('AttentionFlowAnimation initialized successfully');
  }
  
  setupEventListeners() {
    console.log('Setting up event listeners for attention flow');
    
    const playBtn = document.getElementById('play-attention-flow');
    const pauseBtn = document.getElementById('pause-attention-flow');
    const resetBtn = document.getElementById('reset-attention-flow');
    const speedInput = document.getElementById('attention-speed');
    
    if (playBtn) {
      console.log('Found play button, adding event listener');
      playBtn.addEventListener('click', () => this.play());
    } else {
      console.log('Play button not found');
    }
    
    if (pauseBtn) {
      console.log('Found pause button, adding event listener');
      pauseBtn.addEventListener('click', () => this.pause());
    } else {
      console.log('Pause button not found');
    }
    
    if (resetBtn) {
      console.log('Found reset button, adding event listener');
      resetBtn.addEventListener('click', () => this.reset());
    } else {
      console.log('Reset button not found');
    }
    
    if (speedInput) {
      console.log('Found speed input, adding event listener');
      speedInput.addEventListener('input', (e) => {
        this.speed = parseFloat(e.target.value);
        const speedLabel = document.getElementById('speed-label');
        if (speedLabel) {
          speedLabel.textContent = `Speed: ${this.speed}x`;
        }
      });
    } else {
      console.log('Speed input not found');
    }
    
    // Add zoom control event listener
    const zoomInput = document.getElementById('attention-zoom');
    if (zoomInput) {
      console.log('Found zoom input, adding event listener');
      zoomInput.addEventListener('input', (e) => {
        this.zoom = parseFloat(e.target.value);
        const zoomLabel = document.getElementById('zoom-label');
        if (zoomLabel) {
          zoomLabel.textContent = `Zoom: ${this.zoom}x`;
        }
        // Redraw with new zoom level
        this.draw();
      });
    } else {
      console.log('Zoom input not found');
    }
    
    // Add mouse wheel zoom support
    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const zoomFactor = 0.1;
      const delta = e.deltaY > 0 ? -zoomFactor : zoomFactor;
      this.zoom = Math.min(Math.max(0.5, this.zoom + delta), 3);
      
      // Update the zoom slider and label
      if (zoomInput) zoomInput.value = this.zoom;
      const zoomLabel = document.getElementById('zoom-label');
      if (zoomLabel) zoomLabel.textContent = `Zoom: ${this.zoom.toFixed(1)}x`;
      
      // Redraw with new zoom level
      this.draw();
    });
  }
  
  play() {
    console.log('Play method called');
    if (this.isPlaying) {
      console.log('Already playing, returning');
      return;
    }
    console.log('Starting animation');
    this.isPlaying = true;
    this.animate();
  }
  
  pause() {
    this.isPlaying = false;
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
  
  reset() {
    this.pause();
    this.currentStep = 0;
    this.draw();
  }
  
  animate() {
    if (!this.isPlaying) {
      console.log('Animation stopped, not playing');
      return;
    }
    
    this.currentStep += this.speed;
    if (this.currentStep >= this.maxSteps) {
      this.currentStep = 0;
    }
    
    this.draw();
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  draw() {
    console.log('Draw method called, canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Apply zoom transformation for better visibility
    this.ctx.save(); // Save the current state
    this.ctx.scale(this.zoom, this.zoom);
    
    // Center the scaled content
    const offsetX = (this.canvas.width / this.zoom - this.canvas.width) / 2;
    const offsetY = (this.canvas.height / this.zoom - this.canvas.height) / 2;
    this.ctx.translate(offsetX, offsetY);
    
    // Draw attention flow visualization
    this.drawAttentionFlow();
    
    this.ctx.restore(); // Restore to the original state
  }
  
  drawAttentionFlow() {
    console.log('Drawing attention flow, canvas dimensions:', this.canvas.width, 'x', this.canvas.height);
    
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.3;
    
    console.log('Center coordinates:', centerX, centerY, 'Radius:', radius);
    
    // Draw central token
    this.ctx.fillStyle = '#4CAF50';
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, 20, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Add text label for central token
    this.ctx.fillStyle = '#333';
    this.ctx.font = '14px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Focus', centerX, centerY + 5);
    
    // Draw attention connections
    const numTokens = 8;
    for (let i = 0; i < numTokens; i++) {
      const angle = (i / numTokens) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      // Draw token
      this.ctx.fillStyle = '#2196F3';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 15, 0, 2 * Math.PI);
      this.ctx.fill();
      
      // Draw attention line with animation
      const attentionStrength = this.calculateAttentionStrength(i);
      this.ctx.strokeStyle = `rgba(255, 87, 34, ${attentionStrength})`;
      this.ctx.lineWidth = attentionStrength * 5;
      
      this.ctx.beginPath();
      this.ctx.moveTo(centerX, centerY);
      this.ctx.lineTo(x, y);
      this.ctx.stroke();
      
      // Draw attention strength indicator
      this.ctx.fillStyle = '#333';
      this.ctx.font = '12px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.fillText(`${(attentionStrength * 100).toFixed(0)}%`, x, y + 25);
      
      // Add token labels
      const tokenLabels = ['The', 'girl', "'s", 'paper', 'ship', 'was', 'wrecked', 'in'];
      if (tokenLabels[i]) {
        this.ctx.fillStyle = '#666';
        this.ctx.font = '10px Arial';
        this.ctx.fillText(tokenLabels[i], x, y - 20);
      }
    }
    
    // Draw animated attention flow particles
    this.drawAttentionParticles();
  }
  
  drawAttentionParticles() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.3;
    
    // Create flowing particles along attention connections
    for (let i = 0; i < 3; i++) {
      const particleProgress = (this.currentStep + i * 30) % this.maxSteps / this.maxSteps;
      const angle = (i / 3) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius * particleProgress;
      const y = centerY + Math.sin(angle) * radius * particleProgress;
      
      // Draw particle
      this.ctx.fillStyle = `rgba(255, 255, 0, ${1 - particleProgress})`;
      this.ctx.beginPath();
      this.ctx.arc(x, y, 3, 0, 2 * Math.PI);
      this.ctx.fill();
    }
  }
  
  calculateAttentionStrength(tokenIndex) {
    const step = this.currentStep / this.maxSteps;
    const baseStrength = 0.3;
    const variation = Math.sin(step * 2 * Math.PI + tokenIndex) * 0.4;
    return Math.max(0.1, Math.min(1, baseStrength + variation));
  }
}

// Markov Chain Transition Visualizer
class MarkovTransitionVisualizer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.transitions = {};
    this.states = [];
    this.isAnimating = false;
    this.animationId = null;
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.draw();
  }
  
  setupEventListeners() {
    document.getElementById('animate-transitions')?.addEventListener('click', () => this.animateTransitions());
    document.getElementById('highlight-path')?.addEventListener('click', () => this.highlightPath());
    document.getElementById('reset-transitions')?.addEventListener('click', () => this.reset());
  }
  
  setTransitions(chain) {
    this.transitions = chain.chain || {};
    this.states = Object.keys(this.transitions);
    this.updateTransitionMatrix();
    this.draw();
  }
  
  updateTransitionMatrix() {
    const matrixContainer = document.getElementById('transition-matrix');
    if (!matrixContainer) return;
    
    if (this.states.length === 0) {
      matrixContainer.innerHTML = '<div style="text-align: center; color: #666;">Train a model to see transitions</div>';
      return;
    }
    
    let matrixHTML = '<table style="width: 100%; border-collapse: collapse;">';
    matrixHTML += '<tr><th>State</th><th>Next Words</th><th>Count</th></tr>';
    
    this.states.forEach(state => {
      const nextWords = this.transitions[state] || [];
      const count = nextWords.length;
      const uniqueWords = [...new Set(nextWords)];
      
      matrixHTML += `<tr style="border-bottom: 1px solid #ddd;">
        <td style="padding: 5px; font-weight: bold;">${state}</td>
        <td style="padding: 5px;">${uniqueWords.slice(0, 3).join(', ')}${uniqueWords.length > 3 ? '...' : ''}</td>
        <td style="padding: 5px; text-align: center;">${count}</td>
      </tr>`;
    });
    
    matrixHTML += '</table>';
    matrixContainer.innerHTML = matrixHTML;
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.states.length === 0) {
      this.drawEmptyState();
      return;
    }
    
    this.drawStates();
    this.drawTransitions();
  }
  
  drawEmptyState() {
    this.ctx.fillStyle = '#999';
    this.ctx.font = '16px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Train a Markov model to see transitions', this.canvas.width / 2, this.canvas.height / 2);
  }
  
  drawStates() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const radius = Math.min(centerX, centerY) * 0.3;
    
    this.states.forEach((state, index) => {
      const angle = (index / this.states.length) * 2 * Math.PI;
      const x = centerX + Math.cos(angle) * radius;
      const y = centerY + Math.sin(angle) * radius;
      
      // Draw state node
      this.ctx.fillStyle = '#4CAF50';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 25, 0, 2 * Math.PI);
      this.ctx.fill();
      
      // Draw state border
      this.ctx.strokeStyle = '#333';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();
      
      // Draw state text
      this.ctx.fillStyle = '#fff';
      this.ctx.font = '10px Arial';
      this.ctx.textAlign = 'center';
      const words = state.split(' ');
      words.forEach((word, wordIndex) => {
        this.ctx.fillText(word, x, y - 5 + wordIndex * 12);
      });
    });
  }
  
  drawTransitions() {
    if (this.states.length < 2) return;
    
    this.ctx.strokeStyle = '#666';
    this.ctx.lineWidth = 1;
    
    this.states.forEach((fromState, fromIndex) => {
      const fromAngle = (fromIndex / this.states.length) * 2 * Math.PI;
      const fromX = this.canvas.width / 2 + Math.cos(fromAngle) * (Math.min(this.canvas.width, this.canvas.height) / 2 * 0.3);
      const fromY = this.canvas.height / 2 + Math.sin(fromAngle) * (Math.min(this.canvas.width, this.canvas.height) / 2 * 0.3);
      
      const nextWords = this.transitions[fromState] || [];
      nextWords.forEach(nextWord => {
        // Find the state that contains this next word
        const toState = this.states.find(state => state.includes(nextWord));
        if (toState && toState !== fromState) {
          const toIndex = this.states.indexOf(toState);
          const toAngle = (toIndex / this.states.length) * 2 * Math.PI;
          const toX = this.canvas.width / 2 + Math.cos(toAngle) * (Math.min(this.canvas.width, this.canvas.height) / 2 * 0.3);
          const toY = this.canvas.height / 2 + Math.sin(toAngle) * (Math.min(this.canvas.width, this.canvas.height) / 2 * 0.3);
          
          // Draw transition arrow
          this.drawArrow(fromX, fromY, toX, toY);
        }
      });
    });
  }
  
  drawArrow(fromX, fromY, toX, toY) {
    const dx = toX - fromX;
    const dy = toY - fromY;
    const angle = Math.atan2(dy, dx);
    
    // Adjust arrow position to avoid overlapping with nodes
    const nodeRadius = 25;
    const adjustedFromX = fromX + Math.cos(angle) * nodeRadius;
    const adjustedFromY = fromY + Math.sin(angle) * nodeRadius;
    const adjustedToX = toX - Math.cos(angle) * nodeRadius;
    const adjustedToY = toY - Math.sin(angle) * nodeRadius;
    
    // Draw line
    this.ctx.beginPath();
    this.ctx.moveTo(adjustedFromX, adjustedFromY);
    this.ctx.lineTo(adjustedToX, adjustedToY);
    this.ctx.stroke();
    
    // Draw arrowhead
    const arrowLength = 10;
    const arrowAngle = Math.PI / 6;
    
    this.ctx.beginPath();
    this.ctx.moveTo(adjustedToX, adjustedToY);
    this.ctx.lineTo(
      adjustedToX - arrowLength * Math.cos(angle - arrowAngle),
      adjustedToY - arrowLength * Math.sin(angle - arrowAngle)
    );
    this.ctx.moveTo(adjustedToX, adjustedToY);
    this.ctx.lineTo(
      adjustedToX - arrowLength * Math.cos(angle + arrowAngle),
      adjustedToY - arrowLength * Math.sin(angle + arrowAngle)
    );
    this.ctx.stroke();
  }
  
  animateTransitions() {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    const animate = () => {
      if (!this.isAnimating) return;
      
      // Add some animation effect
      this.ctx.globalAlpha = 0.7;
      this.draw();
      this.ctx.globalAlpha = 1.0;
      
      setTimeout(() => {
        this.draw();
        if (this.isAnimating) {
          requestAnimationFrame(animate);
        }
      }, 1000);
    };
    
    animate();
  }
  
  highlightPath() {
    // Highlight a random path through the transitions
    if (this.states.length === 0) return;
    
    const path = this.generateRandomPath();
    this.highlightPathOnCanvas(path);
  }
  
  generateRandomPath() {
    const path = [];
    let currentState = this.states[Math.floor(Math.random() * this.states.length)];
    path.push(currentState);
    
    for (let i = 0; i < 3; i++) {
      const nextWords = this.transitions[currentState] || [];
      if (nextWords.length === 0) break;
      
      const nextWord = nextWords[Math.floor(Math.random() * nextWords.length)];
      const nextState = this.states.find(state => state.includes(nextWord));
      
      if (nextState && nextState !== currentState) {
        path.push(nextState);
        currentState = nextState;
      } else {
        break;
      }
    }
    
    return path;
  }
  
  highlightPathOnCanvas(path) {
    // Redraw with highlighted path
    this.draw();
    
    if (path.length < 2) return;
    
    this.ctx.strokeStyle = '#FF5722';
    this.ctx.lineWidth = 3;
    
    for (let i = 0; i < path.length - 1; i++) {
      const fromState = path[i];
      const toState = path[i + 1];
      
      const fromIndex = this.states.indexOf(fromState);
      const toIndex = this.states.indexOf(toState);
      
      if (fromIndex !== -1 && toIndex !== -1) {
        const fromAngle = (fromIndex / this.states.length) * 2 * Math.PI;
        const toAngle = (toIndex / this.states.length) * 2 * Math.PI;
        
        const fromX = this.canvas.width / 2 + Math.cos(fromAngle) * (Math.min(this.canvas.width, this.canvas.height) / 2 * 0.3);
        const fromY = this.canvas.height / 2 + Math.sin(fromAngle) * (Math.min(this.canvas.width, this.canvas.height) / 2 * 0.3);
        const toX = this.canvas.width / 2 + Math.cos(toAngle) * (Math.min(this.canvas.width, this.canvas.height) / 2 * 0.3);
        const toY = this.canvas.height / 2 + Math.sin(toAngle) * (Math.min(this.canvas.width, this.canvas.height) / 2 * 0.3);
        
        this.drawArrow(fromX, fromY, toX, toY);
      }
    }
  }
  
  reset() {
    this.isAnimating = false;
    this.draw();
  }
}

// 3D Word Embeddings Viewer
class EmbeddingsViewer {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.ctx = this.canvas.getContext('2d');
    this.embeddings = [];
    this.rotationX = 0;
    this.zoom = 1;
    this.isDragging = false;
    this.lastMousePos = { x: 0, y: 0 };
    
    this.init();
  }
  
  init() {
    this.setupEventListeners();
    this.loadSampleEmbeddings();
    this.draw();
  }
  
  setupEventListeners() {
    document.getElementById('rotation-x')?.addEventListener('input', (e) => {
      this.rotationX = parseInt(e.target.value);
      this.draw();
    });
    
    document.getElementById('zoom-level')?.addEventListener('input', (e) => {
      this.zoom = parseFloat(e.target.value);
      this.draw();
    });
    
    document.getElementById('reset-view')?.addEventListener('click', () => this.resetView());
    document.getElementById('visualize-embeddings')?.addEventListener('click', () => this.generateEmbeddings());
    
    // Mouse controls
    this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
    this.canvas.addEventListener('mousemove', (e) => this.drag(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrag());
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
  }
  
  loadSampleEmbeddings() {
    // Generate sample 3D embeddings for demonstration
    const words = ['king', 'queen', 'man', 'woman', 'computer', 'technology', 'love', 'hate', 'happy', 'sad'];
    this.embeddings = words.map((word, index) => ({
      word,
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      z: (Math.random() - 0.5) * 200,
      color: this.getWordColor(word)
    }));
  }
  
  getWordColor(word) {
    const colors = ['#FF5722', '#4CAF50', '#2196F3', '#9C27B0', '#FF9800', '#795548', '#607D8B', '#E91E63', '#00BCD4', '#8BC34A'];
    return colors[word.length % colors.length];
  }
  
  generateEmbeddings() {
    const input = document.getElementById('embedding-input')?.value || '';
    if (!input.trim()) return;
    
    const words = input.split(',').map(w => w.trim()).filter(w => w);
    this.embeddings = words.map((word, index) => ({
      word,
      x: (Math.random() - 0.5) * 200,
      y: (Math.random() - 0.5) * 200,
      z: (Math.random() - 0.5) * 200,
      color: this.getWordColor(word)
    }));
    
    this.draw();
  }
  
  startDrag(e) {
    this.isDragging = true;
    this.lastMousePos = { x: e.clientX, y: e.clientY };
  }
  
  drag(e) {
    if (!this.isDragging) return;
    
    const deltaX = e.clientX - this.lastMousePos.x;
    const deltaY = e.clientY - this.lastMousePos.y;
    
    this.rotationX += deltaX * 0.5;
    this.rotationX = this.rotationX % 360;
    
    this.lastMousePos = { x: e.clientX, y: e.clientY };
    this.draw();
  }
  
  stopDrag() {
    this.isDragging = false;
  }
  
  handleWheel(e) {
    e.preventDefault();
    this.zoom += e.deltaY * 0.001;
    this.zoom = Math.max(0.1, Math.min(3, this.zoom));
    this.draw();
  }
  
  resetView() {
    this.rotationX = 0;
    this.zoom = 1;
    document.getElementById('rotation-x').value = 0;
    document.getElementById('zoom-level').value = 1;
    this.draw();
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Set background
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.embeddings.length === 0) return;
    
    // Sort embeddings by Z coordinate for proper depth ordering
    const sortedEmbeddings = [...this.embeddings].sort((a, b) => b.z - a.z);
    
    // Draw coordinate axes
    this.drawAxes();
    
    // Draw embeddings
    sortedEmbeddings.forEach(embedding => {
      this.drawEmbedding(embedding);
    });
    
    // Draw connections between similar embeddings
    this.drawConnections();
  }
  
  drawAxes() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    const axisLength = 100 * this.zoom;
    
    // X-axis (red)
    this.ctx.strokeStyle = '#FF0000';
    this.ctx.lineWidth = 2;
    this.ctx.beginPath();
    this.ctx.moveTo(centerX - axisLength, centerY);
    this.ctx.lineTo(centerX + axisLength, centerY);
    this.ctx.stroke();
    
    // Y-axis (green)
    this.ctx.strokeStyle = '#00FF00';
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY - axisLength);
    this.ctx.lineTo(centerX, centerY + axisLength);
    this.ctx.stroke();
    
    // Z-axis (blue) - projected
    this.ctx.strokeStyle = '#0000FF';
    this.ctx.beginPath();
    this.ctx.moveTo(centerX, centerY);
    this.ctx.lineTo(centerX + axisLength * 0.7, centerY - axisLength * 0.7);
    this.ctx.stroke();
  }
  
  drawEmbedding(embedding) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Apply 3D transformations
    const rotatedX = embedding.x * Math.cos(this.rotationX * Math.PI / 180) - embedding.z * Math.sin(this.rotationX * Math.PI / 180);
    const rotatedZ = embedding.x * Math.sin(this.rotationX * Math.PI / 180) + embedding.z * Math.cos(this.rotationX * Math.PI / 180);
    
    // Project 3D to 2D
    const projectedX = centerX + rotatedX * this.zoom;
    const projectedY = centerY + embedding.y * this.zoom - rotatedZ * this.zoom * 0.5;
    
    // Draw embedding point
    this.ctx.fillStyle = embedding.color;
    this.ctx.beginPath();
    this.ctx.arc(projectedX, projectedY, 8, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Draw word label
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(embedding.word, projectedX, projectedY - 15);
  }
  
  drawConnections() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    
    // Connect embeddings that are close in 3D space
    for (let i = 0; i < this.embeddings.length; i++) {
      for (let j = i + 1; j < this.embeddings.length; j++) {
        const a = this.embeddings[i];
        const b = this.embeddings[j];
        
        const distance = Math.sqrt(
          Math.pow(a.x - b.x, 2) + 
          Math.pow(a.y - b.y, 2) + 
          Math.pow(a.z - b.z, 2)
        );
        
        if (distance < 150) {
          // Apply 3D transformations
          const aRotatedX = a.x * Math.cos(this.rotationX * Math.PI / 180) - a.z * Math.sin(this.rotationX * Math.PI / 180);
          const aRotatedZ = a.x * Math.sin(this.rotationX * Math.PI / 180) + a.z * Math.cos(this.rotationX * Math.PI / 180);
          const bRotatedX = b.x * Math.cos(this.rotationX * Math.PI / 180) - b.z * Math.sin(this.rotationX * Math.PI / 180);
          const bRotatedZ = b.x * Math.sin(this.rotationX * Math.PI / 180) + b.z * Math.cos(this.rotationX * Math.PI / 180);
          
          // Project to 2D
          const aX = centerX + aRotatedX * this.zoom;
          const aY = centerY + a.y * this.zoom - aRotatedZ * this.zoom * 0.5;
          const bX = centerX + bRotatedX * this.zoom;
          const bY = centerY + b.y * this.zoom - bRotatedZ * this.zoom * 0.5;
          
          // Draw connection
          this.ctx.beginPath();
          this.ctx.moveTo(aX, aY);
          this.ctx.lineTo(bX, bY);
          this.ctx.stroke();
        }
      }
    }
  }
}



// Initialize all visualizations when the page loads
window.addEventListener('DOMContentLoaded', function() {
  console.log('DOM loaded, setting up lazy initialization for visualizations');
  
  // Only initialize visualizations that are immediately visible
  // Others will be initialized when their containers are first accessed
  
  // Initialize neural network viewer if it exists
  if (document.getElementById('nn-architecture-canvas')) {
    window.nnViewer = new NeuralNetworkViewer('nn-architecture-canvas');
  }
  
  // Initialize Markov transitions visualizer if it exists
  if (document.getElementById('markov-transitions-canvas')) {
    window.markovViz = new MarkovTransitionVisualizer('markov-transitions-canvas');
  }
  
  // Initialize embeddings viewer if it exists
  if (document.getElementById('embeddings-3d-canvas')) {
    window.embeddingsViewer = new EmbeddingsViewer('embeddings-3d-canvas');
  }
  
  // Attention flow will be initialized lazily when GPT-2 tab is selected
  console.log('Lazy initialization setup complete');
});



window.initEmbeddingsViewer = function() {
  if (window.embeddingsViewer) {
    window.embeddingsViewer.draw();
  }
};

// Show attention flow container when GPT-2 is loaded
window.showAttentionFlow = function() {
  console.log('showAttentionFlow called');
  const container = document.getElementById('attention-flow-container');
  if (container) {
    console.log('Found attention-flow-container, showing it');
    container.style.display = 'block';
    
    // Initialize attention flow animation if it doesn't exist yet
    if (!window.attentionFlow) {
      console.log('Initializing AttentionFlowAnimation for the first time');
      try {
        window.attentionFlow = new AttentionFlowAnimation('attention-flow-container');
        console.log('AttentionFlowAnimation created successfully:', window.attentionFlow);
      } catch (error) {
        console.error('Failed to create AttentionFlowAnimation:', error);
        return;
      }
    }
    
    // Force a redraw of the attention flow animation
    if (window.attentionFlow) {
      console.log('Redrawing attention flow animation');
      try {
        window.attentionFlow.draw();
      } catch (error) {
        console.error('Error drawing attention flow:', error);
      }
    } else {
      console.log('attentionFlow still not available after initialization');
    }
  } else {
    console.error('attention-flow-container not found');
  }
};

// Show neural network architecture when LSTM is trained
window.showNeuralNetwork = function(inputSize, lstmSize, outputSize) {
  const container = document.getElementById('nn-architecture-container');
  if (container && window.nnViewer) {
    container.style.display = 'block';
    window.nnViewer.setLayers(inputSize, lstmSize, outputSize);
  }
};

// Show Markov transitions when Markov model is trained
window.showMarkovTransitions = function(chain) {
  const container = document.getElementById('markov-transitions-container');
  if (container && window.markovViz) {
    container.style.display = 'block';
    window.markovViz.setTransitions(chain);
  }
};
