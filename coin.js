document.addEventListener("DOMContentLoaded", function() {
    // ---------------------
    //  DOM ELEMENTS
    // ---------------------
    const coinFace = document.getElementById("coin-face");
    const headsBtn = document.getElementById("heads-btn");
    const tailsBtn = document.getElementById("tails-btn");
    const resultText = document.getElementById("result");
    const button = document.getElementById("button");
    const betAmountInput = document.getElementById("bet-amount");
    const placeBetBtn = document.getElementById("place-bet-btn");
    const betMessageEl = document.getElementById("bet-message");
    const balanceSpan = document.getElementById("user-Balance");
  
    // ---------------------
    //  GLOBALS
    // ---------------------
    let userBalance = 0;       // Local cache of the user's money
    let currentBet = 0;        // The current bet amount
    const MIN_BET = 5;        // Minimum bet is Rs 30
  
    // Disable game actions until we know user’s status
    headsBtn.disabled = true;
    tailsBtn.disabled = true;
    placeBetBtn.disabled = true;
  
    // ---------------------
    //  FIREBASE SETUP
    // ---------------------
    const db = firebase.firestore();
    let userDocRef = null;
  
    // Listen for auth state changes
    firebase.auth().onAuthStateChanged(function(user) {
      if (user) {
        // The user is logged in. user.uid is the doc ID in "users" collection
        userDocRef = db.collection("users").doc(user.uid);
        placeBetBtn.disabled = false; // allow bets if user is logged in
  
        // 1. Realtime listener for the user's doc in "users"
        userDocRef.onSnapshot(function(doc) {
          if (doc.exists) {
            console.log("Doc data:", doc.data()); // For debugging
            const data = doc.data();
            userBalance = parseFloat(data.money) || 0;
            balanceSpan.textContent = userBalance.toFixed(2);
          } else {
            console.error("User document not found in 'users' collection.");
            balanceSpan.textContent = "0.00";
          }
        });
      } else {
        // No user is logged in
        userDocRef = null;
        userBalance = 0;
        balanceSpan.textContent = "0.00";
        betMessageEl.textContent = "Please log in to place a bet.";
      }
    });
  
    // ---------------------
    //  PLACE BET LOGIC
    // ---------------------
    placeBetBtn.addEventListener('click', onPlaceBet);
  
    function onPlaceBet() {
      betMessageEl.textContent = "";
      const betValue = parseFloat(betAmountInput.value);
  
      // Validate bet
      if (isNaN(betValue) || betValue <= 0) {
        betMessageEl.textContent = "Please enter a valid bet amount.";
        return;
      }
      if (betValue < MIN_BET) {
        betMessageEl.textContent = "Minimum bet is Rs " + MIN_BET + ".";
        return;
      }
      if (betValue > userBalance) {
        betMessageEl.textContent = "Insufficient funds for this bet.";
        return;
      }
  
      currentBet = betValue;
      const user = firebase.auth().currentUser;
  
      if (user && userDocRef) {
        // Logged-in user: deduct bet from Firestore
        placeBetBtn.disabled = true;
        db.runTransaction(async (transaction) => {
          const doc = await transaction.get(userDocRef);
          if (!doc.exists) throw "User doc does not exist!";
          const currentMoney = doc.data().money || 0;
          if (currentMoney < betValue) throw "Insufficient funds.";
          transaction.update(userDocRef, { money: currentMoney - betValue });
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
        // No user logged in, fallback to local balance (demo/testing)
        userBalance -= betValue;
        finalizePlaceBet();
      }
    }
  
    function finalizePlaceBet() {
      updateBalanceDisplay();
      // Enable coin flip buttons
      headsBtn.disabled = false;
      tailsBtn.disabled = false;
      resultText.textContent = "Bet placed! Choose Heads or Tails.";
    
      
      placeBetBtn.disabled = false;
    }
  
    function updateBalanceDisplay() {
      balanceSpan.textContent = userBalance.toFixed(2);
    }
  
    // ---------------------
    //  COIN FLIP LOGIC
    // ---------------------
    function animateCoinFlip(callback) {
      const flips = Math.floor(Math.random() * 10) + 10;
      const interval = 100;
      let currentFlip = 0;
  
      coinFace.style.animation = "";
      const flipInterval = setInterval(() => {
        coinFace.style.transform = `rotateX(${currentFlip * 180}deg)`;
        coinFace.src = (currentFlip % 2 === 0) ? "h.png" : "t.png";
        currentFlip++;
        if (currentFlip > flips) {
          clearInterval(flipInterval);
          callback();
        }
      }, interval);
    }
  
    function flipCoin(choice) {
      headsBtn.disabled = true;
      tailsBtn.disabled = true;
      resultText.textContent = "Flipping...";
  
      animateCoinFlip(() => {
        const isHeads = Math.random() < 0.5;
        const outcome = isHeads ? "heads" : "tails";
        coinFace.style.transform = "rotateX(0deg)";
        coinFace.src = isHeads ? "h.png" : "t.png";
  
        if (outcome === choice) {
          // Player wins 1.99×
          const winnings = currentBet * 1.99;
          const user = firebase.auth().currentUser;
  
          if (user && userDocRef) {
            // Logged-in user: add winnings in Firestore
            db.runTransaction(async (transaction) => {
              const doc = await transaction.get(userDocRef);
              if (!doc.exists) throw "User doc does not exist!";
              const currentMoney = doc.data().money || 0;
              transaction.update(userDocRef, { money: currentMoney + winnings });
            })
            .then(() => {
              resultText.textContent = "🎉 You win!";
            })
            .catch((error) => {
              console.error("Error updating winnings:", error);
              resultText.textContent = "Error updating winnings: " + error;
            });
          } else {
            // No user logged in, update local balance
            userBalance += winnings;
            updateBalanceDisplay();
            resultText.textContent = "🎉 You win!";
          }
        } else {
          resultText.textContent = "😢 You lose!";
        }
      });
    }
  
    headsBtn.addEventListener("click", function() {
      flipCoin("heads");
    });
    tailsBtn.addEventListener("click", function() {
      flipCoin("tails");
    });
  });
  