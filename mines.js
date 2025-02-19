

  /************************************************
   * 2) Global Variables & Game Setup
   ***********************************************/
  const rows = 5, cols = 5;
  let mineCount = 1;
  let grid = [];
  let gameOver = false;
  let revealedCount = 0;
  let currentBet = 0;
  let canPlay = false;
  let userBalance = 0;

  // DOM Elements
  const balanceInfoEl   = document.getElementById('balanceInfo');
  const betAmountInput  = document.getElementById('betAmount');
  const mineCountSelect = document.getElementById('mineCountSelect');
  const placeBetBtn     = document.getElementById('placeBetBtn');
  const betMessageEl    = document.getElementById('betMessage');
  const gridElement     = document.getElementById('grid');
  const resultOverlay   = document.getElementById('resultOverlay');
  const pickRandomBtn   = document.getElementById('pickRandomBtn');

  // Populate mineCountSelect options
  for (let i = 1; i <= 24; i++) {
    const option = document.createElement('option');
    option.value = i;
    option.textContent = i;
    mineCountSelect.appendChild(option);
  }

  // Silent Firebase Auth Check for Balance
  firebase.auth().onAuthStateChanged(async (user) => {
    if (user) {
      try {
        const db = firebase.firestore();
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          userBalance = data.money || 0;
        }
      } catch (error) {
        console.error("Error fetching balance:", error);
        userBalance = 0;
      }
    } else {
      userBalance = 0;
    }
    updateBalanceDisplay();
  });

  function updateBalanceDisplay() {
    balanceInfoEl.textContent = `Balance: NPR ${userBalance.toFixed(2)}`;
  }

  /************************************************
   * 3) Combination & Multiplier Calculation
   ***********************************************/
  function combination(n, r) {
    if (r > n) return 0;
    let result = 1;
    for (let i = 0; i < r; i++) {
      result *= (n - i);
      result /= (i + 1);
    }
    return result;
  }

  function getMultiplier(m, k) {
    if (k === 0) return 1.0;
    const numerator = combination(25 - m, k);
    const denominator = combination(25, k);
    if (denominator === 0 || numerator === 0) return 0;
    const prob = numerator / denominator;
    const multiplier = 0.97 / prob;
    return parseFloat(multiplier.toFixed(2));
  }

  /************************************************
   * 4) Single Button Logic (Bet → Cashout)
   ***********************************************/
  placeBetBtn.addEventListener('click', onPlaceBet);

  function onPlaceBet() {
    betMessageEl.textContent = "";
    const betValue = parseFloat(betAmountInput.value);
    if (isNaN(betValue) || betValue <= 0) {
      betMessageEl.textContent = "Please enter a valid bet amount.";
      return;
    }
    // Minimum bet is Rs 30
    if (betValue < 30) {
      betMessageEl.textContent = "Minimum bet is Rs 30.";
      return;
    }
    if (betValue > userBalance) {
      betMessageEl.textContent = "Insufficient funds for this bet.";
      return;
    }
    mineCount = parseInt(mineCountSelect.value);
    currentBet = betValue;
    const user = firebase.auth().currentUser;
    if (user) {
      placeBetBtn.disabled = true;
      const db = firebase.firestore();
      const userRef = db.collection("users").doc(user.uid);
      db.runTransaction(async (transaction) => {
        const doc = await transaction.get(userRef);
        if (!doc.exists) throw "User doc does not exist!";
        const currentMoney = doc.data().money || 0;
        if (currentMoney < betValue) throw "Insufficient funds.";
        transaction.update(userRef, { money: currentMoney - betValue });
      })
      .then(() => {
        userBalance -= betValue;
        finalizePlaceBet();
      })
      .catch((error) => {
        console.error("Error placing bet:", error);
        betMessageEl.textContent = "Error placing bet: " + error;
        placeBetBtn.disabled = false;
      });
    } else {
      userBalance -= betValue;
      finalizePlaceBet();
    }
  }

  function finalizePlaceBet() {
    updateBalanceDisplay();
    canPlay = true;
    gameOver = false;
    gridElement.classList.remove('disabled');
    initGrid();
    // Change button to cashout mode
    placeBetBtn.removeEventListener('click', onPlaceBet);
    placeBetBtn.addEventListener('click', onCashout);
    updateButtonMultiplier();
    placeBetBtn.disabled = false;
  }

  function onCashout() {
    if (!canPlay || gameOver) return;
    doCashout(false);
  }

  /************************************************
   * 5) Pick Random Tile Logic
   ***********************************************/
  pickRandomBtn.addEventListener('click', () => {
    if (!canPlay || gameOver) return;
    const hiddenCells = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        if (!grid[r][c].revealed) {
          hiddenCells.push({ r, c });
        }
      }
    }
    if (hiddenCells.length === 0) return;
    const randomIndex = Math.floor(Math.random() * hiddenCells.length);
    const { r, c } = hiddenCells[randomIndex];
    const cellDiv = gridElement.querySelector(`[data-row="${r}"][data-col="${c}"]`);
    cellDiv.click();
  });

  /************************************************
   * 6) Initialize & Render the Game Grid
   ***********************************************/
  function initGrid() {
    revealedCount = 0;
    resultOverlay.style.display = "none";
    gridElement.innerHTML = "";
    grid = [];
    for (let r = 0; r < rows; r++) {
      let row = [];
      for (let c = 0; c < cols; c++) {
        row.push({ mine: false, revealed: false });
      }
      grid.push(row);
    }
    let minesPlaced = 0;
    while (minesPlaced < mineCount) {
      const rr = Math.floor(Math.random() * rows);
      const cc = Math.floor(Math.random() * cols);
      if (!grid[rr][cc].mine) {
        grid[rr][cc].mine = true;
        minesPlaced++;
      }
    }
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellDiv = document.createElement('div');
        cellDiv.classList.add('cell');
        cellDiv.dataset.row = r;
        cellDiv.dataset.col = c;
        cellDiv.addEventListener('click', onCellClick);
        gridElement.appendChild(cellDiv);
      }
    }
  }

  /************************************************
   * 7) Handle Cell Click
   ***********************************************/
  function onCellClick(e) {
    if (!canPlay || gameOver) return;
    const cellDiv = e.target;
    const r = parseInt(cellDiv.dataset.row);
    const c = parseInt(cellDiv.dataset.col);
    if (grid[r][c].revealed) return;
    grid[r][c].revealed = true;
    cellDiv.classList.add('revealed');
    if (grid[r][c].mine) {
      // Bomb: show bomb image
      cellDiv.classList.add('mine');
      cellDiv.innerHTML = '<img src="bomb.png" class="bomb-img" alt="Bomb" />';
      gameOver = true;
      canPlay = false;
      revealAllCells();
      showResultOverlay("You Lost! Better Luck Next Time.");
      placeBetBtn.textContent = "Round Over";
      placeBetBtn.disabled = true;
      setTimeout(resetRound, 3000);
    } else {
      // Safe: show diamond image
      cellDiv.innerHTML = '<img src="di.png" class="diamond-img" alt="Safe Diamond" />';
      revealedCount++;
      if (revealedCount === rows * cols - mineCount) {
        doCashout(true);
      } else {
        updateButtonMultiplier();
      }
    }
  }

  function countAdjacentMines(r, c) {
    let count = 0;
    for (let i = -1; i <= 1; i++) {
      for (let j = -1; j <= 1; j++) {
        const rr = r + i;
        const cc = c + j;
        if (rr >= 0 && rr < rows && cc >= 0 && cc < cols) {
          if (grid[rr][cc].mine) {
            count++;
          }
        }
      }
    }
    return count;
  }

  // New: Reveal all cubes (both mines and safe cells)
  function revealAllCells() {
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const cellDiv = gridElement.querySelector(`[data-row="${r}"][data-col="${c}"]`);
        if (!cellDiv.classList.contains('revealed')) {
          cellDiv.classList.add('revealed');
          if (grid[r][c].mine) {
            cellDiv.innerHTML = '<img src="bomb.png" class="bomb-img" alt="Bomb" />';
          } else {
            cellDiv.innerHTML = '<img src="di.png" class="diamond-img" alt="Safe Diamond" />';
          }
        }
      }
    }
  }

  /************************************************
   * 8) Update Button Label with Current Multiplier
   ***********************************************/
  function updateButtonMultiplier() {
    if (!canPlay || gameOver) return;
    const multiplier = getMultiplier(mineCount, revealedCount);
    placeBetBtn.textContent = `Cashout at x${multiplier}`;
  }

  /************************************************
   * 9) Cashout & Show Result Overlay
   ***********************************************/
  async function doCashout(isWin) {
    gameOver = true;
    canPlay = false;
    // Reveal all cells before cashout
    revealAllCells();
    const multiplier = getMultiplier(mineCount, revealedCount);
    const finalPayout = currentBet * multiplier;
    const user = firebase.auth().currentUser;
    if (user) {
      try {
        const db = firebase.firestore();
        const userRef = db.collection("users").doc(user.uid);
        await db.runTransaction(async (transaction) => {
          const doc = await transaction.get(userRef);
          if (!doc.exists) throw "User doc does not exist!";
          const currentMoney = doc.data().money || 0;
          transaction.update(userRef, { money: currentMoney + finalPayout });
        });
        userBalance += finalPayout;
      } catch (error) {
        console.error("Error in cashout:", error);
      }
    } else {
      userBalance += finalPayout;
    }
    updateBalanceDisplay();
    showResultOverlay(`You cashed out at x${multiplier} and got Rs ${finalPayout.toFixed(2)}.`);
    placeBetBtn.textContent = "Round Over";
    placeBetBtn.disabled = true;
    setTimeout(resetRound, 3000);
  }

  function showResultOverlay(msg) {
    resultOverlay.innerHTML = msg;
    resultOverlay.style.display = "block";
  }

  /************************************************
   * 10) Reset Round after 3 seconds (Grid remains visible)
   ***********************************************/
  function resetRound() {
    resultOverlay.style.display = "none";
    gridElement.innerHTML = "";
    initGrid();
    canPlay = false;
    gameOver = false;
    revealedCount = 0;
    placeBetBtn.removeEventListener('click', onCashout);
    placeBetBtn.addEventListener('click', onPlaceBet);
    placeBetBtn.textContent = "Place Bet";
    placeBetBtn.disabled = false;
  }

  // Initialize grid on page load
  initGrid();