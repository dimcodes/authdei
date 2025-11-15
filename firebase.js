import { initializeApp } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-app.js";
import { getDatabase } from "https://www.gstatic.com/firebasejs/9.22.0/firebase-database.js";

const firebaseConfig = {
   apiKey: "AIzaSyD1fN15qeBLIEAMbei9L8W0CQnUGzFbvx4",
  authDomain: "deeiiy.firebaseapp.com",
  databaseURL: "https://deeiiy-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "deeiiy",
  storageBucket: "deeiiy.firebasestorage.app",
  messagingSenderId: "568235932814",
  appId: "1:568235932814:web:fa29b0ef1094784b325ddf"
};

const app = initializeApp(firebaseConfig);
const db = getDatabase(app);

export { app, db };