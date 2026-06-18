importScripts(
  "https://www.gstatic.com/firebasejs/12.13.0/firebase-app-compat.js",
);
importScripts(
  "https://www.gstatic.com/firebasejs/12.13.0/firebase-messaging-compat.js",
);

firebase.initializeApp({
  apiKey: "AIzaSyD4WVE4mitockqPLWO3zyfWtKb5ZhMbYHg",
  authDomain: "huishub-930f2.firebaseapp.com",
  projectId: "huishub-930f2",
  storageBucket: "huishub-930f2.firebasestorage.app",
  messagingSenderId: "120184033837",
  appId: "1:120184033837:web:1c63b1dbbbd9c57ba2dea4",
});

firebase.messaging();
