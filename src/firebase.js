import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBcoTgoJX6Nz7drf9lYB39_epJKGKK7zhE",
  authDomain: "starstar-booking.firebaseapp.com",
  projectId: "starstar-booking",
  storageBucket: "starstar-booking.firebasestorage.app",
  messagingSenderId: "604495683904",
  appId: "1:604495683904:web:3a466ba74f21c740179aa5",
  measurementId: "G-C5MKEWLWNC"
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
