import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, onSnapshot, query, orderBy, limit, serverTimestamp, updateDoc, doc, getDoc, runTransaction } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getAuth, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js';
import { getDatabase, ref, set, onValue, off, update } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-database.js';
import { firebaseConfig } from './firebaseConfig.js';
import CrashAnimation from './crashAnimation.js';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const realtimeDb = getDatabase(app);

// Game Constants
const MIN_BET = 30;
const MAX_BET = 100000;
const HOUSE_EDGE = 0.01; // 1%
const TICK_RATE = 100; // ms between updates
const GAME_SPEED = 0.008; // Slower increase for better control
const MAX_MULTIPLIER = 100.0; // Maximum crash point
const COUNTDOWN_TIME = 10; // seconds between rounds

// Initialize crash animation
const graphContainer = document.querySelector('.graph-container');
const crashAnimation = new CrashAnimation(graphContainer);

// Helper Functions
function formatMultiplier(multiplier) {
  return `${multiplier.toFixed(2)}x`;
}

// Generate crash point using inverse probability formula
function generateCrashPoint() {
  // Generate a random number between 0 and 1
  // We use crypto.getRandomValues for better randomness
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const rand = array[0] / (0xffffffff + 1); // Normalize to [0,1)
  
  // Use inverse probability formula: 1 / (1 - r)
  // This creates a fair distribution where:
  // - 1/2 of games crash below 2x
  // - 1/3 of games crash below 3x
  // - 1/4 of games crash below 4x
  // And so on, following a natural probability distribution
  const multiplier = 1 / (1 - rand);
  
  // Limit maximum multiplier and ensure minimum of 1.0
  return Math.min(Math.max(1.0, multiplier), MAX_MULTIPLIER);
}

// Game State
let gameState = {
  isActive: false,
  currentMultiplier: 1.0,
  startTime: null,
  crashPoint: null,
  currentBets: new Map(),
  gameHistory: [],
  userBet: null,
  hasUserCashedOut: false,
  roundId: null
};

// Firebase References
const gameStateRef = ref(realtimeDb, 'gameState');
const activeBetsRef = ref(realtimeDb, 'activeBets');
const gameHistoryRef = ref(realtimeDb, 'gameHistory');

// Listen for game state changes
onValue(gameStateRef, (snapshot) => {
  const state = snapshot.val();
  if (!state) return;

  gameState.isActive = state.isActive;
  gameState.currentMultiplier = state.currentMultiplier;
  gameState.startTime = state.startTime;
  gameState.crashPoint = state.crashPoint;
  gameState.roundId = state.roundId;

  updateUI();
});

// Listen for active bets changes
onValue(activeBetsRef, (snapshot) => {
  const bets = snapshot.val();
  if (!bets) return;

  gameState.currentBets = new Map(Object.entries(bets));
  updateActiveBets();
});

// Update UI based on game state
function updateUI() {
  elements.multiplier.textContent = formatMultiplier(gameState.currentMultiplier);
  elements.multiplier.style.visibility = gameState.isActive ? 'visible' : 'hidden';
  elements.multiplier.classList.toggle('active', gameState.isActive);
  elements.cashoutBtn.disabled = !gameState.userBet || gameState.hasUserCashedOut;
  elements.placeBetBtn.disabled = gameState.isActive;
  elements.betAmount.disabled = gameState.isActive;
}

// Update active bets display
function updateActiveBets() {
  const betsContainer = document.getElementById('activeBets');
  if (!betsContainer) return;

  betsContainer.innerHTML = '';
  gameState.currentBets.forEach((bet, userId) => {
    const betEl = document.createElement('div');
    betEl.className = 'bet-item';
    betEl.innerHTML = `
      <span class="player">${bet.username}</span>
      <span class="amount">NPR ${bet.amount}</span>
      ${bet.cashedOut ? `<span class="cashout">${formatMultiplier(bet.cashoutMultiplier)}</span>` : ''}
    `;
    betsContainer.appendChild(betEl);
  });
}

// DOM Elements
const elements = {
  graph: document.getElementById('crashGraph'),
  multiplier: document.getElementById('currentMultiplier'),
  countdown: document.getElementById('countdown'),
  nextRound: document.getElementById('nextRound'),
  betAmount: document.getElementById('betAmount'),
  placeBetBtn: document.getElementById('placeBetBtn'),
  cashoutBtn: document.getElementById('cashoutBtn'),
  crashHistory: document.getElementById('crashHistory')
};

// Canvas Setup and Responsive Handling
const ctx = elements.graph.getContext('2d');
let graphWidth, graphHeight;

function resizeCanvas() {
  const container = elements.graph.parentElement;
  graphWidth = elements.graph.width = container.offsetWidth;
  graphHeight = elements.graph.height = container.offsetHeight;
  
  // Update graph scale factors based on new dimensions
  updateGraphScale();
}

function updateGraphScale() {
  // Calculate scale factors based on viewport size
  const vw = Math.max(document.documentElement.clientWidth || 0, window.innerWidth || 0);
  
  // Adjust line widths and font sizes based on viewport
  ctx.lineWidth = vw < 480 ? 2 : 3;
  const fontSize = vw < 480 ? '14px' : vw < 768 ? '16px' : '18px';
  ctx.font = `${fontSize} Inter, sans-serif`;
}

// Debounced resize handler
let resizeTimeout;
window.addEventListener('resize', () => {
  clearTimeout(resizeTimeout);
  resizeTimeout = setTimeout(() => {
    resizeCanvas();
    updateGraph();
  }, 250);
});

// Touch event handling for mobile
let touchStartY = 0;
elements.graph.addEventListener('touchstart', (e) => {
  touchStartY = e.touches[0].clientY;
}, { passive: true });

elements.graph.addEventListener('touchmove', (e) => {
  e.preventDefault();
  const touchY = e.touches[0].clientY;
  const deltaY = touchStartY - touchY;
  
  // Use deltaY to implement touch-based zooming or scrolling if needed
}, { passive: false });

// Initialize canvas
resizeCanvas();

// Update graph with responsive considerations
function updateGraph() {
  ctx.clearRect(0, 0, graphWidth, graphHeight);
  
  // Draw graph background
  ctx.fillStyle = 'rgba(0, 0, 0, 0.1)';
  ctx.fillRect(0, 0, graphWidth, graphHeight);
  
  // Draw responsive grid lines
  const gridSize = graphWidth < 480 ? 30 : graphWidth < 768 ? 40 : 50;
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
  
  // Vertical grid lines
  for(let i = 0; i < graphWidth; i += gridSize) {
    ctx.beginPath();
    ctx.moveTo(i, 0);
    ctx.lineTo(i, graphHeight);
    ctx.stroke();
  }
  
  // Horizontal grid lines
  for(let i = 0; i < graphHeight; i += gridSize) {
    ctx.beginPath();
    ctx.moveTo(0, i);
    ctx.lineTo(graphWidth, i);
    ctx.stroke();
  }
  
  if (gameState.isActive) {
    const elapsed = (Date.now() - gameState.startTime) / 1000;
    gameState.currentMultiplier = Math.pow(Math.E, GAME_SPEED * elapsed);
    
    // Draw crash curve with responsive line width
    ctx.beginPath();
    ctx.strokeStyle = '#4ade80';
    
    // Scale the curve based on screen size
    const scaleY = graphHeight / (graphWidth < 480 ? 5 : 10);
    
    for(let i = 0; i <= elapsed; i += 0.1) {
      const multiplier = Math.pow(Math.E, GAME_SPEED * i);
      const x = (i / elapsed) * graphWidth;
      const y = graphHeight - (multiplier * scaleY);
      
      if(i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    
    ctx.stroke();
    
    // Update multiplier display with responsive font size
    elements.multiplier.textContent = formatMultiplier(gameState.currentMultiplier);
    elements.multiplier.classList.add('active');
  }
}

async function startGame() {
  gameState.isActive = true;
  gameState.currentMultiplier = 1.0;
  gameState.startTime = Date.now();
  gameState.crashPoint = generateCrashPoint();
  gameState.hasUserCashedOut = false;
  
  // Reset animation
  crashAnimation.reset();
  
  elements.multiplier.style.visibility = 'visible';
  elements.multiplier.classList.add('active');
  elements.cashoutBtn.disabled = !gameState.userBet;
  elements.placeBetBtn.disabled = true;
  elements.betAmount.disabled = true;
  
  requestAnimationFrame(gameLoop);
}

async function endGame(crashed = true) {
  gameState.isActive = false;
  
  if (crashed) {
    // Trigger explosion animation
    crashAnimation.explode();
    
    if (gameState.userBet && !gameState.hasUserCashedOut) {
      window.showToast('Game crashed! You lost your bet.', 'error');
    }
  }
  
  elements.multiplier.classList.remove('active');
  elements.multiplier.style.visibility = 'hidden';
  elements.cashoutBtn.disabled = true;
  elements.placeBetBtn.disabled = false;
  elements.betAmount.disabled = false;
  
  updateGameHistory(gameState.crashPoint);
  gameState.userBet = null;
  
  startCountdown();
}

function gameLoop() {
  if (!gameState.isActive) return;
  
  updateGraph();
  
  if (gameState.currentMultiplier >= gameState.crashPoint) {
    endGame(true);
    return;
  }
  
  requestAnimationFrame(gameLoop);
}

async function startCountdown() {
  let timeLeft = COUNTDOWN_TIME;
  elements.countdown.textContent = timeLeft;
  
  const countdownInterval = setInterval(async () => {
    timeLeft--;
    elements.countdown.textContent = timeLeft;
    
    if (timeLeft <= 0) {
      clearInterval(countdownInterval);
      await startGame();
    }
  }, 1000);
}

function updateGameHistory(crashPoint) {
  const historyItem = document.createElement('div');
  historyItem.className = `history-item ${crashPoint < 2 ? 'red' : 'green'}`;
  historyItem.textContent = formatMultiplier(crashPoint);
  
  elements.crashHistory.insertBefore(historyItem, elements.crashHistory.firstChild);
  
  while (elements.crashHistory.children.length > 10) {
    elements.crashHistory.removeChild(elements.crashHistory.lastChild);
  }
  
  gameState.gameHistory.unshift(crashPoint);
  if (gameState.gameHistory.length > 10) {
    gameState.gameHistory.pop();
  }
}

async function placeBet() {
  try {
    if (!auth.currentUser) {
      window.showToast('Please log in to place a bet', 'error');
      return;
    }

    const betAmount = parseFloat(elements.betAmount.value);
    if (isNaN(betAmount) || betAmount < MIN_BET || betAmount > MAX_BET) {
      window.showToast(`Bet amount must be between ${MIN_BET} and ${MAX_BET}`, 'error');
      return;
    }

    // Get user's current balance
    const userRef = doc(db, "users", auth.currentUser.uid);
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("User document does not exist!");
      
      const currentBalance = userDoc.data().money || 0;
      if (currentBalance < betAmount) throw new Error("Insufficient balance");

      // Deduct bet amount
      transaction.update(userRef, { money: currentBalance - betAmount });

      // Add bet to active bets
      await set(ref(realtimeDb, `activeBets/${auth.currentUser.uid}`), {
        amount: betAmount,
        username: auth.currentUser.displayName || 'Anonymous',
        timestamp: Date.now(),
        cashedOut: false
      });
    });

    gameState.userBet = {
      amount: betAmount,
      placedAt: gameState.currentMultiplier
    };

    window.showToast('Bet placed successfully!', 'success');
  } catch (error) {
    console.error('Error placing bet:', error);
    window.showToast(error.message, 'error');
  }
}

async function cashout() {
  if (!gameState.userBet || gameState.hasUserCashedOut) return;

  try {
    const cashoutMultiplier = gameState.currentMultiplier;
    const winAmount = gameState.userBet.amount * cashoutMultiplier;

    // Update user's balance and mark bet as cashed out
    const userRef = doc(db, "users", auth.currentUser.uid);
    await runTransaction(db, async (transaction) => {
      const userDoc = await transaction.get(userRef);
      if (!userDoc.exists()) throw new Error("User document does not exist!");

      const currentBalance = userDoc.data().money || 0;
      transaction.update(userRef, { money: currentBalance + winAmount });

      // Mark bet as cashed out in realtime database
      await update(ref(realtimeDb, `activeBets/${auth.currentUser.uid}`), {
        cashedOut: true,
        cashoutMultiplier: cashoutMultiplier
      });
    });

    gameState.hasUserCashedOut = true;
    window.showToast(`Successfully cashed out at ${formatMultiplier(cashoutMultiplier)}!`, 'success');
  } catch (error) {
    console.error('Error cashing out:', error);
    window.showToast(error.message, 'error');
  }
}

// Clean up Firebase listeners when page unloads
window.addEventListener('unload', () => {
  off(gameStateRef);
  off(activeBetsRef);
  off(gameHistoryRef);
});

// Initialize game with responsive setup
function initGame() {
  resizeCanvas();
  updateGraphScale();
  startCountdown();
  
  // Add responsive handlers for buttons
  elements.placeBetBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    placeBet();
  });
  
  elements.cashoutBtn.addEventListener('touchstart', (e) => {
    e.preventDefault();
    cashout();
  });
}

// Call initGame when the DOM is loaded
document.addEventListener('DOMContentLoaded', initGame); 