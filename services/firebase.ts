// FIX: Use Firebase v8 'compat' imports for namespaced API to resolve module export errors.
import firebase from 'firebase/compat/app';
import 'firebase/compat/auth';
import 'firebase/compat/firestore';
import 'firebase/compat/storage';

const firebaseConfig = {
  apiKey: "AIzaSyBx59Fe85gsdGFYJvklbjuIeNf5yKLaTl0",
  authDomain: "alphav01-931e6.firebaseapp.com",
  projectId: "alphav01-931e6",
  storageBucket: "alphav01-931e6.appspot.com",
  messagingSenderId: "69548137072",
  appId: "1:69548137072:web:857f7e7f33d1d65377f2b5",
  measurementId: "G-E4B3TTJHKR"
};


// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);

// Get Firebase services using namespaced v8 API
export const auth = firebase.auth();
export const db = firebase.firestore();
export const storage = firebase.storage();
