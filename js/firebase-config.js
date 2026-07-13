// Configuração do Firebase - TaxiCheck
const firebaseConfig = {
  apiKey: "AIzaSyAh2abnnKYH-7MEnNBGt_OmCEnm8jA8y0E",
  authDomain: "taxicheck-d327d.firebaseapp.com",
  projectId: "taxicheck-d327d",
  storageBucket: "taxicheck-d327d.firebasestorage.app",
  messagingSenderId: "760628261768",
  appId: "1:760628261768:web:e0f5bfb6e369781904803d"
};

firebase.initializeApp(firebaseConfig);

const db = firebase.firestore();
