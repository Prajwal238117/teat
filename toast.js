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