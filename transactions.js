import { auth, db } from "./firebaseConfig.js";
import { doc, runTransaction, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Constants
const MIN_DEPOSIT = 1000;
const MAX_DEPOSIT = 10000;
const MIN_WITHDRAW = 1000;
const MAX_WITHDRAW = 10000;

// Handle deposit transaction
export async function handleDeposit(amount) {
  if (!auth.currentUser) {
    window.showToast('Please log in to deposit funds', 'error');
    return false;
  }

  amount = parseFloat(amount);
  if (isNaN(amount) || amount < MIN_DEPOSIT || amount > MAX_DEPOSIT) {
    window.showToast(`Please enter an amount between Rs ${MIN_DEPOSIT} and Rs ${MAX_DEPOSIT}`, 'error');
    return false;
  }

  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(userRef);
      if (!docSnap.exists()) throw "User document not found";
      const currentMoney = docSnap.data().money || 0;
      transaction.update(userRef, { money: currentMoney + amount });
    });
    
    window.showToast(`Successfully deposited Rs ${amount}`, 'success');
    return true;
  } catch (error) {
    console.error("Error processing deposit:", error);
    window.showToast('Failed to process deposit', 'error');
    return false;
  }
}

// Handle withdraw transaction
export async function handleWithdraw(amount) {
  if (!auth.currentUser) {
    window.showToast('Please log in to withdraw funds', 'error');
    return false;
  }

  amount = parseFloat(amount);
  if (isNaN(amount) || amount < MIN_WITHDRAW || amount > MAX_WITHDRAW) {
    window.showToast(`Please enter an amount between Rs ${MIN_WITHDRAW} and Rs ${MAX_WITHDRAW}`, 'error');
    return false;
  }

  try {
    const userRef = doc(db, "users", auth.currentUser.uid);
    await runTransaction(db, async (transaction) => {
      const docSnap = await transaction.get(userRef);
      if (!docSnap.exists()) throw "User document not found";
      const currentMoney = docSnap.data().money || 0;
      if (currentMoney < amount) throw "Insufficient funds";
      transaction.update(userRef, { money: currentMoney - amount });
    });
    
    window.showToast(`Successfully withdrew Rs ${amount}`, 'success');
    return true;
  } catch (error) {
    console.error("Error processing withdrawal:", error);
    window.showToast(error === "Insufficient funds" ? error : 'Failed to process withdrawal', 'error');
    return false;
  }
}

// Show transaction modal
export function showTransactionModal(type) {
  const modalHTML = `
    <div class="modal">
      <div class="modal-header">
        <h2 class="modal-title">${type === 'deposit' ? 'Deposit' : 'Withdraw'} Funds</h2>
        <button class="modal-close" aria-label="Close modal">×</button>
      </div>
      <div class="modal-body">
        <div class="input-group">
          <label for="transactionAmount">Amount (Rs):</label>
          <input type="number" id="transactionAmount" 
                 min="${type === 'deposit' ? MIN_DEPOSIT : MIN_WITHDRAW}" 
                 max="${type === 'deposit' ? MAX_DEPOSIT : MAX_WITHDRAW}" 
                 placeholder="Enter amount" />
        </div>
        <button id="confirmTransaction" class="cta-btn">
          Confirm ${type === 'deposit' ? 'Deposit' : 'Withdrawal'}
        </button>
      </div>
    </div>
  `;

  // Create modal overlay
  const modalOverlay = document.createElement('div');
  modalOverlay.className = 'modal-overlay active';
  modalOverlay.innerHTML = modalHTML;
  document.body.appendChild(modalOverlay);

  // Add event listeners
  const closeBtn = modalOverlay.querySelector('.modal-close');
  const confirmBtn = modalOverlay.querySelector('#confirmTransaction');
  const amountInput = modalOverlay.querySelector('#transactionAmount');

  closeBtn.addEventListener('click', () => {
    modalOverlay.remove();
  });

  modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) {
      modalOverlay.remove();
    }
  });

  confirmBtn.addEventListener('click', async () => {
    const amount = amountInput.value;
    const success = type === 'deposit' ? 
      await handleDeposit(amount) : 
      await handleWithdraw(amount);
    if (success) {
      modalOverlay.remove();
    }
  });
}

// Expose showTransactionModal to window object for HTML onclick events
window.showTransactionModal = showTransactionModal; 