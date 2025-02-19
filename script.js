document.addEventListener("DOMContentLoaded", () => {
  const menuToggle = document.getElementById("menuToggle");
  const sideMenu = document.getElementById("sideMenu");
  const themeToggle = document.getElementById("themeToggle");
  const menuIcon = document.getElementById("menuIcon");
  const toggleIcon = document.querySelector(".toggle-icon");

  // Define the SVG icons for light and dark mode
  const moonIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
  const sunIcon = '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg"><circle cx="12" cy="12" r="5" stroke="currentColor" stroke-width="2"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';

  // Open and close the side menu on hamburger menu click
  menuToggle.addEventListener("click", () => {
    sideMenu.classList.toggle("active"); // Toggle class to show/hide the menu

    // Toggle hamburger icon to close icon
    if (sideMenu.classList.contains("active")) {
      menuIcon.innerHTML = '<path d="M18 6L6 18M6 6l12 12" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>'; // Close (X) icon
    } else {
      menuIcon.innerHTML = '<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'; // Regular menu icon
    }
  });

  // Close menu when clicking outside of it
  document.addEventListener("click", (event) => {
    if (!sideMenu.contains(event.target) && !menuToggle.contains(event.target)) {
      sideMenu.classList.remove("active");
      menuIcon.innerHTML = '<path d="M3 6h18M3 12h18M3 18h18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>';
    }
  });

  // Theme toggle functionality
  themeToggle.addEventListener("change", () => {
    document.body.classList.toggle("light-mode");
    localStorage.setItem("theme", document.body.classList.contains("light-mode") ? "light" : "dark");
    toggleIcon.innerHTML = document.body.classList.contains("light-mode") ? sunIcon : moonIcon;
  });

  // Load saved theme from localStorage
  if (localStorage.getItem("theme") === "light") {
    document.body.classList.add("light-mode");
    themeToggle.checked = true;
    toggleIcon.innerHTML = sunIcon;
  } else {
    toggleIcon.innerHTML = moonIcon;
  }

 
});
