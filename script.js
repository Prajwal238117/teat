let multiplier = 1.0;
let gameRunning = false;
let cashoutMultiplier = null;
let interval;
let balance = 10000;
let winnings = 0;
let betAmount = 0; // Store the bet amount

const multiplierDisplay = document.getElementById("multiplier");
const balanceDisplay = document.getElementById("balance");
const winningsDisplay = document.getElementById("winnings");
const placeBetButton = document.getElementById("place-bet-button");
const cashoutButton = document.getElementById("cashout-button");
const aviatorImage = document.getElementById("aviator-image");
const cashoutNotification = document.getElementById("cashout-notification");
const betAmountInput = document.getElementById("bet-amount"); // Access the bet amount input field
const betHistoryList = document.getElementById("bet-history-list"); // Bet history list element

// Show a notification at the center of the screen that moves upwards
function showCashOutNotification(message) {
  const notification = document.getElementById("cashout-notification");
  notification.textContent = message;
  notification.classList.add("show"); // Add the "show" class for animation

  // Hide the notification after 3 seconds (to allow for the slower animation)
  setTimeout(() => {
    notification.classList.remove("show");
  }, 3000); // 3 seconds
}

function triggerCrashAnimation() {
  // Add 'crash' class to trigger the crash animation
  aviatorImage.classList.add("crash");

  // Reset the animation after it finishes (1 second)
  setTimeout(() => {
    aviatorImage.classList.remove("crash");
    aviatorImage.style.transform = "translateY(0)";
  }, 1000);
}

function endGame(won) {
  gameRunning = false;
  clearInterval(interval);

  if (!won) {
    // On crash, deduct the full bet amount from balance (without multiplying by the multiplier)
    const lostAmount = betAmount;
    triggerCrashAnimation(); // Trigger crash animation
    showCashOutNotification(`You lost! Bet: $${betAmount.toFixed(2)} | Lost: $${lostAmount.toFixed(2)}`);
  } else {
    // On cash out, calculate the winnings based on the bet amount and multiplier
    winnings = betAmount * cashoutMultiplier; // Calculate the winnings (Bet * Multiplier)
    balance += winnings;
    showCashOutNotification(`You cashed out at ${cashoutMultiplier.toFixed(2)}x!`);
  }

  // Update the UI with new balance and winnings
  balanceDisplay.textContent = balance.toFixed(2);
  winningsDisplay.textContent = winnings.toFixed(2);
  multiplierDisplay.textContent = "1.00x";

  // Disable the cashout button
  cashoutButton.disabled = true;

  // Update the bet history
  addBetToHistory(betAmount, cashoutMultiplier, winnings, won);
}

function placeBet() {
  betAmount = parseFloat(betAmountInput.value); // Get the bet amount entered by the user
  if (isNaN(betAmount) || betAmount <= 0) {
    showCashOutNotification("Please enter a valid bet amount!");
    return;
  }

  if (betAmount > balance) {
    showCashOutNotification("You do not have enough balance to place this bet.");
    return;
  }

  balance -= betAmount; // Deduct the bet amount from balance
  multiplier = 1.0;
  cashoutMultiplier = null;

  // Enable the cashout button
  cashoutButton.disabled = false;

  // Start the game logic when the player places a bet
  gameRunning = true;
  interval = setInterval(() => {
    multiplier += 0.01;
    multiplierDisplay.textContent = multiplier.toFixed(2) + "x";

    // Randomly end the game with a crash
    if (Math.random() < 0.01) {
      endGame(false);
    }
  }, 100);
}

function cashOut() {
  if (!gameRunning || cashoutMultiplier !== null) return;

  cashoutMultiplier = multiplier;
  endGame(true);
}

function addBetToHistory(betAmount, multiplier, winnings, won) {
  const historyItem = document.createElement("li");

  // Display loss or win in history
  if (!won) {
    historyItem.innerHTML = `
      <span>Bet: $${betAmount.toFixed(2)} x${multiplier.toFixed(2)}</span>
      <span>Winnings: -$${betAmount.toFixed(2)} (Lost)</span>
    `;
  } else {
    historyItem.innerHTML = `
      <span>Bet: $${betAmount.toFixed(2)} x${multiplier.toFixed(2)}</span>
      <span>Winnings: $${winnings.toFixed(2)} (Won)</span>
    `;
  }

  // Add the item to the bet history list
  betHistoryList.appendChild(historyItem);

  // Optionally limit history to the last 5 items
  if (betHistoryList.children.length > 5) {
    betHistoryList.removeChild(betHistoryList.children[0]);
  }
}

// Event Listeners
placeBetButton.addEventListener("click", placeBet);
cashoutButton.addEventListener("click", cashOut);
