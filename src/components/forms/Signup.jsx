import React from 'react'
import { useState } from 'react';

const Signup = () => {
    const [email, setEmail] = useState("");
      const [password, setPassword] = useState("");
  const handleSubmit = (e) => {
    e.preventDefault();
    alert(`Email: ${email}, Password: ${password}`);
  };
  return (

    <div>
      <h2>Sign Up</h2>
      <form onSubmit={handleSubmit}>
        <div>
          <label>Username:</label>
          <input type="text" />
        </div>
        <div>
            <label>Name:</label>
            <input type="text" />
        </div>
        <div>
          <label>Email:</label>
            <input type="email" 
            placeholder="Enter email"
            value={email}
            onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label>Password:</label>
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>
        <button type="submit">Sign Up</button>
      </form>
    </div>
  );
};

export default Signup;
