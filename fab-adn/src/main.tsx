import { createRoot } from 'react-dom/client'
import axios from 'axios'
import App from './App.tsx'
import './index.css'
import { API_BASE } from './api/config'

axios.defaults.baseURL = API_BASE;

createRoot(document.getElementById("root")!).render(<App />);
