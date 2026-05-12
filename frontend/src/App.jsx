import React from 'react'
import { Route, Routes } from 'react-router-dom'
import Auth from './pages/Auth'
function App() {
  return (
    <div className='w-full h-screen'>
      <Routes>
        <Route path="/auth" element={<Auth/>}/>
      </Routes>
    </div>
  )
}

export default App