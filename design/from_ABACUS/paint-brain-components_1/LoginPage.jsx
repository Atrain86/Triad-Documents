import React, { useState } from 'react';

function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleSignIn = () => {
    // Add your authentication logic here
    console.log('Sign in:', { email, password });
  };

  const handleCreateAccount = () => {
    // Add your account creation logic here
    console.log('Create account');
  };

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center px-6" 
      style={{ 
        backgroundColor: '#000000',
        fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif'
      }}
    >
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex justify-center mb-8">
          <img 
            src="/paint-brain-logo.png" 
            alt="Paint Brain" 
            className="w-64 h-auto"
          />
        </div>

        {/* Tagline */}
        <p 
          className="text-center text-xl mb-12 font-medium" 
          style={{ color: '#9d8b5a' }}
        >
          Organize your painting projects
        </p>

        {/* Email Input */}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-2xl px-6 py-4 mb-4 text-white text-lg"
          style={{ 
            backgroundColor: '#1a1d29', 
            border: '2px solid #3a3d4a',
            outline: 'none'
          }}
        />

        {/* Password Input */}
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-2xl px-6 py-4 mb-6 text-white text-lg"
          style={{ 
            backgroundColor: '#1a1d29', 
            border: '2px solid #3a3d4a',
            outline: 'none'
          }}
        />

        {/* Sign In Button */}
        <button
          onClick={handleSignIn}
          className="w-full rounded-2xl px-6 py-4 mb-4 text-white text-xl font-semibold"
          style={{ backgroundColor: '#22c55e' }}
        >
          Sign In
        </button>

        {/* Create Account Button */}
        <button
          onClick={handleCreateAccount}
          className="w-full rounded-2xl px-6 py-4 mb-6 text-white text-xl font-semibold"
          style={{ backgroundColor: '#a855f7' }}
        >
          Create Account
        </button>

        {/* Forgot Password Link */}
        <div className="text-center">
          <button 
            className="text-lg font-medium underline"
            style={{ color: '#9d8b5a' }}
          >
            Forgot Password?
          </button>
        </div>
      </div>
    </div>
  );
}

export default LoginPage;
