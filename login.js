// Simple toggle between Login and Sign Up forms
document.addEventListener("DOMContentLoaded", () => {
  const loginTab = document.getElementById("loginTab");
  const signupTab = document.getElementById("signupTab");
  const loginForm = document.getElementById("loginForm");
  const signupForm = document.getElementById("signupForm");

  loginTab.addEventListener("click", () => {
    loginTab.classList.add("active");
    signupTab.classList.remove("active");
    loginForm.classList.remove("hidden");
    signupForm.classList.add("hidden");
  });

  signupTab.addEventListener("click", () => {
    signupTab.classList.add("active");
    loginTab.classList.remove("active");
    signupForm.classList.remove("hidden");
    loginForm.classList.add("hidden");
  });

  

});

// Toast Notification Function
function showToast(message, type = "success") {
  const toastContainer = document.getElementById("toast-container");

  const toast = document.createElement("div");
  toast.classList.add("toast", type);
  toast.innerText = message;

  toastContainer.appendChild(toast);

  // Remove toast after 3.5 seconds
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

// Create a Firestore document for the user
function createUserCollection(user) {
  if (!user) return;

  // Initialize Firestore
  const db = firebase.firestore();

  // Reference to the users collection
  const userRef = db.collection("users").doc(user.uid);

  // Set user data in Firestore
  userRef
    .set({
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      uid: user.uid,
      name: user.displayName,
      email: user.email,
      money: "",
      
    })
    .then(() => {
      console.log("User collection created successfully");
    })
    .catch((error) => {
      console.error("Error creating user collection:", error);
    });
}

// Sign-Up Function
async function signup(e) {
  e.preventDefault()
  const name = document.querySelector('#signupName');
  const email = document.querySelector("#signupEmail");
  const password = document.querySelector("#signupPassword");

  if (!email.value || !password.value) {
    showToast("Email and password are required!", "error");
    return;
  }

  try {
    const result = await firebase.auth().createUserWithEmailAndPassword(email.value, password.value);
    // Use the input value from the name field for displayName
    await result.user.updateProfile({ displayName: name.value });
    
    // Create a user document in Firestore
    createUserCollection(result.user);

    // Send email verification
    await result.user.sendEmailVerification();

    showToast("Sign-up successful! Check your email for verification.", "success");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Login Function
async function login(e) {
  e.preventDefault()
  const email = document.querySelector("#loginEmail");
  const password = document.querySelector("#loginPassword");

  if (!email.value || !password.value) {
    showToast("Email and password are required!", "error");
    return;
  }

  try {
    const result = await firebase.auth().signInWithEmailAndPassword(email.value, password.value);
    showToast("Login successful! Redirecting...", "success");

    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (err) {
    showToast(err.message, "error");
  }
}

// Google Sign-In Function
async function loginWithGoogle() {
  try {
    const provider = new firebase.auth.GoogleAuthProvider();
    const result = await firebase.auth().signInWithPopup(provider);

    console.log(result);
    showToast("Google Sign-In Successful!", "success");

    // Redirect to index.html after successful login
    setTimeout(() => {
      window.location.href = "index.html";
    }, 2000);
  } catch (err) {
    showToast(err.message, "error");
  }
}









function updateUserBalance() {
  firebase.auth().onAuthStateChanged(async (user) => {
    const userBalanceEl = document.getElementById("userBalance");
    if (user) {
      // User is signed in. Retrieve and display the balance.
      try {
        const db = firebase.firestore();
        const userDoc = await db.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
          const data = userDoc.data();
          const money = data.money || 0;
          userBalanceEl.innerHTML = `<span>NPR ${parseFloat(money).toFixed(0)}</span>`;
        } else {
          userBalanceEl.innerHTML = `<span>NPR 0.00</span>`;
        }
      } catch (error) {
        console.error("Error retrieving user balance:", error);
        userBalanceEl.innerHTML = `<span>NPR 0.00</span>`;
      }
    } else {
      // No user is signed in; show the Login and Sign-Up buttons in the navbar.
      userBalanceEl.innerHTML = `
        <a href="login.html" class="cta-btn">Login</a>
        <a href="login.html" class="cta-btn">Sign-Up</a>
      `;
    }
  });
}





firebase.auth().onAuthStateChanged((user) => {
  const authActionDiv = document.getElementById("authAction");

  if (user) {
    // User is signed in; show the sign-out button in the hamburger menu.
    authActionDiv.innerHTML = '<button id="signOutBtn" class="cta-btn">Sign Out</button>';

    document.getElementById("signOutBtn").addEventListener("click", async () => {
      try {
        await firebase.auth().signOut();
        showToast("Signed out successfully!", "success");
        // Optionally, you can redirect or refresh the page
        // location.reload();
      } catch (error) {
        showToast(error.message, "error");
      }
    });
  } else {
    // User is not signed in; leave the hamburger menu's auth area empty.
    authActionDiv.innerHTML = '';
  }
});


   // Call the function on page load
updateUserBalance();