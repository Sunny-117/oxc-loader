import React, { useState } from 'react'

interface User {
  id: number
  name: string
  email: string
}

const App: React.FC = () => {
  const [count, setCount] = useState<number>(0)
  const [users] = useState<User[]>([
    { id: 1, name: 'John Doe', email: 'john@example.com' },
    { id: 2, name: 'Jane Smith', email: 'jane@example.com' },
  ])

  const handleIncrement = () => {
    setCount(prev => prev + 1)
  }

  return (
    <div style={{ padding: '20px', fontFamily: 'Arial, sans-serif' }}>
      <h1>oxc-loader Example</h1>

      <div style={{ marginBottom: '20px' }}>
        <h2>
          Counter:
          {count}
        </h2>
        <button onClick={handleIncrement} style={{ padding: '10px 20px' }}>
          Increment
        </button>
      </div>

      <div>
        <h2>Users</h2>
        <ul>
          {users.map(user => (
            <li key={user.id}>
              {user.name}
              {' '}
              -
              {user.email}
            </li>
          ))}
        </ul>
      </div>

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>This app is built with:</p>
        <ul>
          <li>React with TypeScript</li>
          <li>oxc-loader for ultra-fast compilation</li>
          <li>Webpack or Rspack for bundling</li>
        </ul>
      </div>
    </div>
  )
}

export default App
