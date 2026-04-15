import '@fontsource-variable/fraunces'
import '@fontsource-variable/inter'
import { StrictMode } from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './app'
import './app.css'

const root = document.getElementById('root')!
ReactDOM.createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>
)
