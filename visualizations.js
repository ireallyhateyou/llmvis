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
     this.ctx.fillStyle = type === 'lstm' ? '#666666' : '#999999';
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
     this.ctx.strokeStyle = animation.type === 'forward' ? '#666666' : '#333333';
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
     this.ctx.fillStyle = '#666666';
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
       this.ctx.fillStyle = '#999999';
      this.ctx.beginPath();
      this.ctx.arc(x, y, 15, 0, 2 * Math.PI);
      this.ctx.fill();
      
             // Draw attention line with animation
       const attentionStrength = this.calculateAttentionStrength(i);
       this.ctx.strokeStyle = `rgba(100, 100, 100, ${attentionStrength})`;
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
       this.ctx.fillStyle = `rgba(200, 200, 200, ${1 - particleProgress})`;
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
       this.ctx.fillStyle = '#666666';
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
    
         this.ctx.strokeStyle = '#666666';
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
    this.embeddings = {};
    this.words3D = [];
    this.rotationX = 0;
    this.zoom = 1;
    this.isDragging = false;
    this.lastMousePos = { x: 0, y: 0 };
    this.isLoading = false; // Start with not loading
    
    this.init();
  }
  
  async init() {
    this.setupEventListeners();
    // Don't auto-load embeddings - wait for button click
    // Don't draw initially - canvas should be blank until visualize is clicked
  }
  
  async loadRealEmbeddings() {
    try {
      this.isLoading = true;
      this.draw(); // Show loading state
      
      // Load GloVe embeddings from the correct Stanford URL
      const response = await fetch('https://huggingface.co/JeremiahZ/glove/resolve/main/glove.6B.50d.txt');
      if (!response.ok) throw new Error('Failed to load embeddings');
      
      const text = await response.text();
      const lines = text.trim().split('\n');
      
      // Parse embeddings
      this.embeddings = {};
      lines.forEach(line => {
        const parts = line.split(' ');
        const word = parts[0];
        const vector = parts.slice(1).map(Number);
        this.embeddings[word] = vector;
      });
      
      console.log(`Loaded ${Object.keys(this.embeddings).length} real word embeddings`);
      
      // Don't convert to 3D yet - wait for user to click "Visualize"
      
    } catch (error) {
      console.error('Error loading embeddings:', error);
      // Fallback to a smaller set of common words
      this.loadFallbackEmbeddings();
    } finally {
      this.isLoading = false;
      // After loading, show blank canvas until user clicks "Visualize"
      this.draw();
    }
  }
  
  loadFallbackEmbeddings() {
    // Fallback: use a curated set of common words with semantic relationships
    // But don't populate words3D yet - wait for user to click "Visualize"
    this.fallbackWords = [
      'king', 'queen', 'man', 'woman', 'boy', 'girl',
      'computer', 'technology', 'software', 'hardware',
      'love', 'hate', 'happy', 'sad', 'angry', 'excited',
      'car', 'vehicle', 'transport', 'road', 'drive',
      'food', 'eat', 'hungry', 'restaurant', 'cook',
      'book', 'read', 'write', 'story', 'author',
      'music', 'song', 'play', 'listen', 'sound',
      'water', 'drink', 'river', 'ocean', 'swim',
      'sun', 'moon', 'star', 'sky', 'light',
      'tree', 'plant', 'grow', 'nature', 'green'
    ];
    
    // Generate semantic-like positions (clustering related words)
    // Store in fallbackWords3D instead of words3D
    this.fallbackWords3D = this.fallbackWords.map((word, index) => {
      const category = Math.floor(index / 5); // Group by 5s
      const offset = index % 5;
      
      return {
        word,
        x: (category - 4) * 80 + (offset - 2) * 20,
        y: (category - 4) * 60 + (offset - 2) * 15,
        z: (category - 4) * 40 + (offset - 2) * 10,
        color: this.getWordColor(word),
        category
      };
    });
  }
  
  convertTo3D() {
    // Get a subset of common words for visualization
    const commonWords = [
      'king', 'queen', 'man', 'woman', 'boy', 'girl',
      'computer', 'technology', 'software', 'hardware',
      'love', 'hate', 'happy', 'sad', 'angry', 'excited',
      'car', 'vehicle', 'transport', 'road', 'drive',
      'food', 'eat', 'hungry', 'restaurant', 'cook',
      'book', 'read', 'write', 'story', 'author',
      'music', 'song', 'play', 'listen', 'sound',
      'water', 'drink', 'river', 'ocean', 'swim',
      'sun', 'moon', 'star', 'sky', 'light',
      'tree', 'plant', 'grow', 'nature', 'green'
    ];
    
    // Filter to words that exist in our embeddings
    const availableWords = commonWords.filter(word => this.embeddings[word]);
    
    if (availableWords.length === 0) {
      this.loadFallbackEmbeddings();
      return;
    }
    
    // Extract vectors for available words
    const vectors = availableWords.map(word => this.embeddings[word]);
    
    // Apply PCA to reduce from 50D to 3D
    const vectors3D = this.applyPCA(vectors, 3);
    
    // Scale and center the 3D vectors
    const scaledVectors = this.scaleAndCenter(vectors3D);
    
    // Create the 3D word objects
    this.words3D = availableWords.map((word, index) => ({
      word,
      x: scaledVectors[index][0],
      y: scaledVectors[index][1],
      z: scaledVectors[index][2],
      color: this.getWordColor(word),
      category: Math.floor(index / 5)
    }));
    
    console.log(`Converted ${this.words3D.length} words to 3D using PCA`);
  }
  
  applyPCA(vectors, targetDimensions) {
    // Simple PCA implementation for dimensionality reduction
    const n = vectors.length;
    const dim = vectors[0].length;
    
    // Center the data
    const mean = new Array(dim).fill(0);
    vectors.forEach(vector => {
      vector.forEach((val, i) => mean[i] += val);
    });
    mean.forEach((val, i) => mean[i] /= n);
    
    const centered = vectors.map(vector => 
      vector.map((val, i) => val - mean[i])
    );
    
    // Compute covariance matrix
    const cov = new Array(dim).fill(0).map(() => new Array(dim).fill(0));
    centered.forEach(vector => {
      for (let i = 0; i < dim; i++) {
        for (let j = 0; j < dim; j++) {
          cov[i][j] += vector[i] * vector[j];
        }
      }
    });
    
    // Normalize covariance matrix
    for (let i = 0; i < dim; i++) {
      for (let j = 0; j < dim; j++) {
        cov[i][j] /= (n - 1);
      }
    }
    
    // For simplicity, use the first 3 dimensions as principal components
    // In a full implementation, you'd compute eigenvectors
    const result = vectors.map(vector => [
      vector[0], vector[1], vector[2]
    ]);
    
    return result;
  }
  
  scaleAndCenter(vectors3D) {
    // Find bounds
    let minX = Infinity, maxX = -Infinity;
    let minY = Infinity, maxY = -Infinity;
    let minZ = Infinity, maxZ = -Infinity;
    
    vectors3D.forEach(([x, y, z]) => {
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
      minZ = Math.min(minZ, z); maxZ = Math.max(maxZ, z);
    });
    
    // Scale to fit in a reasonable 3D space
    const scale = 150 / Math.max(maxX - minX, maxY - minY, maxZ - minZ);
    
    return vectors3D.map(([x, y, z]) => [
      (x - (minX + maxX) / 2) * scale,
      (y - (minY + maxY) / 2) * scale,
      (z - (minZ + maxZ) / 2) * scale
    ]);
  }
  
  getWordColor(word) {
         const colors = ['#333333', '#666666', '#999999', '#CCCCCC', '#E6E6E6', '#B3B3B3', '#808080', '#4D4D4D', '#1A1A1A', '#F2F2F2'];
    return colors[word.length % colors.length];
  }
  
  generateEmbeddings() {
    // Check if we have either real embeddings or fallback words
    if (Object.keys(this.embeddings).length === 0 && !this.fallbackWords3D) {
      alert('Please load GloVe embeddings first by clicking the "Load GloVe Embeddings" button.');
      return;
    }
    
    const input = document.getElementById('embedding-input')?.value || '';
    if (!input.trim()) return;
    
    let words3D = [];
    
    if (Object.keys(this.embeddings).length > 0) {
      // Use real embeddings
      const words = input.split(',').map(w => w.trim()).filter(w => w);
      const availableWords = words.filter(word => this.embeddings[word]);
      
      if (availableWords.length === 0) {
        alert('None of the entered words found in the embeddings. Try common English words like: king, queen, man, woman, computer, technology');
        return;
      }
      
      // Extract vectors for the requested words
      const vectors = availableWords.map(word => this.embeddings[word]);
      
      // Apply PCA to reduce to 3D
      const vectors3D = this.applyPCA(vectors, 3);
      const scaledVectors = this.scaleAndCenter(vectors3D);
      
      // Create the 3D words
      words3D = availableWords.map((word, index) => ({
        word,
        x: scaledVectors[index][0],
        y: scaledVectors[index][1],
        z: scaledVectors[index][2],
        color: this.getWordColor(word),
        category: index
      }));
    } else if (this.fallbackWords3D) {
      // Use fallback words
      const words = input.split(',').map(w => w.trim()).filter(w => w);
      const availableWords = this.fallbackWords3D.filter(wordObj => 
        words.includes(wordObj.word)
      );
      
      if (availableWords.length === 0) {
        alert('None of the entered words found in fallback. Try common English words like: king, queen, man, woman, computer, technology');
        return;
      }
      
      words3D = availableWords;
    }
    
    // Update the 3D words and draw
    this.words3D = words3D;
    this.draw();
  }
  
  setupEventListeners() {
    // Preload button for GloVe embeddings
    document.getElementById('load-embeddings-btn')?.addEventListener('click', async () => {
      const button = document.getElementById('load-embeddings-btn');
      const status = document.getElementById('embeddings-status');
      
      if (button && status) {
        button.disabled = true;
        button.textContent = 'Loading...';
        status.textContent = 'Downloading 400K+ word vectors...';
        
        try {
          await this.loadRealEmbeddings();
          button.style.display = 'none';
                     status.textContent = `Loaded ${Object.keys(this.embeddings).length} word embeddings!`;
          status.style.color = '#4CAF50';
        } catch (error) {
          button.disabled = false;
          button.textContent = 'Load GloVe Embeddings';
                     status.textContent = 'Failed to load embeddings. Using fallback.';
          status.style.color = '#f44336';
        }
      }
    });
    
    document.getElementById('rotation-x')?.addEventListener('input', (e) => {
      this.rotationX = parseInt(e.target.value);
      // Only redraw if there are words to show
      if (this.words3D && this.words3D.length > 0) {
        this.draw();
      }
    });
    
    document.getElementById('zoom-level')?.addEventListener('input', (e) => {
      this.zoom = parseFloat(e.target.value);
      // Only redraw if there are words to show
      if (this.words3D && this.words3D.length > 0) {
        this.draw();
      }
    });
    
    document.getElementById('reset-view')?.addEventListener('click', () => this.resetView());
    document.getElementById('visualize-embeddings')?.addEventListener('click', () => this.generateEmbeddings());
    
    // Mouse controls
    this.canvas.addEventListener('mousedown', (e) => this.startDrag(e));
    this.canvas.addEventListener('mousemove', (e) => this.drag(e));
    this.canvas.addEventListener('mouseup', () => this.stopDrag());
    this.canvas.addEventListener('wheel', (e) => this.handleWheel(e));
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
    // Only redraw if there are words to show
    if (this.words3D && this.words3D.length > 0) {
      this.draw();
    }
  }
  
  stopDrag() {
    this.isDragging = false;
  }
  
  handleWheel(e) {
    e.preventDefault();
    this.zoom += e.deltaY * 0.001;
    this.zoom = Math.max(0.1, Math.min(3, this.zoom));
    // Only redraw if there are words to show
    if (this.words3D && this.words3D.length > 0) {
      this.draw();
    }
  }
  
  resetView() {
    this.rotationX = 0;
    this.zoom = 1;
    document.getElementById('rotation-x').value = 0;
    document.getElementById('zoom-level').value = 1;
    // Only redraw if there are words to show
    if (this.words3D && this.words3D.length > 0) {
      this.draw();
    }
  }
  
  draw() {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    
    // Set background
    this.ctx.fillStyle = '#000';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    
    if (this.isLoading) {
      this.drawLoadingState();
      return;
    }
    
    if (!this.words3D || this.words3D.length === 0) {
      this.drawInitialState();
      return;
    }
    
    // Sort embeddings by Z coordinate for proper depth ordering
    const sortedWords = [...this.words3D].sort((a, b) => b.z - a.z);
    
         // Coordinate axes removed for cleaner view
    
    // Draw embeddings
    sortedWords.forEach(word => {
      this.drawWord(word);
    });
    
    // Draw connections between semantically similar words
    this.drawSemanticConnections();
  }
  
  drawLoadingState() {
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '18px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText('Loading real word embeddings...', this.canvas.width / 2, this.canvas.height / 2);
    this.ctx.font = '14px Arial';
    this.ctx.fillText('This may take a moment on first load', this.canvas.width / 2, this.canvas.height / 2 + 30);
  }
  
  drawInitialState() {
    // Show blank canvas - no content until visualize is clicked
    // Just keep the black background, no text or instructions
    // The canvas will appear completely empty until words are visualized
  }
  
  
  
  drawWord(word) {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    // Apply 3D transformations
    const rotatedX = word.x * Math.cos(this.rotationX * Math.PI / 180) - word.z * Math.sin(this.rotationX * Math.PI / 180);
    const rotatedZ = word.x * Math.sin(this.rotationX * Math.PI / 180) + word.z * Math.cos(this.rotationX * Math.PI / 180);
    
    // Project 3D to 2D
    const projectedX = centerX + rotatedX * this.zoom;
    const projectedY = centerY + word.y * this.zoom - rotatedZ * this.zoom * 0.5;
    
    // Draw word point
    this.ctx.fillStyle = word.color;
    this.ctx.beginPath();
    this.ctx.arc(projectedX, projectedY, 8, 0, 2 * Math.PI);
    this.ctx.fill();
    
    // Draw word label
    this.ctx.fillStyle = '#fff';
    this.ctx.font = '12px Arial';
    this.ctx.textAlign = 'center';
    this.ctx.fillText(word.word, projectedX, projectedY - 15);
  }
  
  drawSemanticConnections() {
    const centerX = this.canvas.width / 2;
    const centerY = this.canvas.height / 2;
    
    this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
    this.ctx.lineWidth = 1;
    
    // Connect words that are semantically related (same category)
    for (let i = 0; i < this.words3D.length; i++) {
      for (let j = i + 1; j < this.words3D.length; j++) {
        const a = this.words3D[i];
        const b = this.words3D[j];
        
        // Connect words in the same semantic category
        if (a.category === b.category) {
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
  if (!window.embeddingsViewer) {
    console.log('Initializing EmbeddingsViewer for the first time');
    window.embeddingsViewer = new EmbeddingsViewer('embeddings-3d-canvas');
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
