# Nepal Top-Up - Nepal Top-Up E-commerce Website

A modern, responsive e-commerce website optimized for mobile devices, built with vanilla JavaScript, HTML, and CSS, using Firebase as the backend.

## Features

- 🛍️ Nepal Top-Up responsive design
- 🔥 Real-time product updates with Firebase
- 🛒 Shopping cart functionality
- 💳 Checkout process
- 📱 Optimized for mobile devices
- 🎨 Modern and clean UI

## Setup Instructions

1. Clone this repository
2. Create a Firebase project at [Firebase Console](https://console.firebase.google.com/)
3. Enable Firestore Database in your Firebase project
4. Update the `firebase-config.js` file with your Firebase configuration
5. Add some products to your Firestore database with the following structure:
   ```javascript
   {
     name: "Product Name",
     price: 99.99,
     image: "image-url"
   }
   ```
6. Open `index.html` in your browser

## Firebase Setup

1. Go to the Firebase Console
2. Create a new project
3. Enable Firestore Database
4. Go to Project Settings
5. Copy your Firebase configuration
6. Paste it into `firebase-config.js`

## Project Structure

```
├── index.html          # Main HTML file
├── styles.css          # CSS styles
├── app.js             # JavaScript functionality
├── firebase-config.js # Firebase configuration
└── README.md          # This file
```

## Technologies Used

- HTML5
- CSS3
- JavaScript (ES6+)
- Firebase (Firestore)
- Font Awesome Icons

## Contributing

Feel free to submit issues and enhancement requests!

## License

This project is licensed under the MIT License - see the LICENSE file for details. 