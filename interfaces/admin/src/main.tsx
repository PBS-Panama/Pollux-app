import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
// Same Iconoir set already used in interfaces/leto (Mannat template, Reference/Frontend-UI/) —
// replaces the emoji placeholder icons across the admin pages.
import './assets/iconoir.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
)
