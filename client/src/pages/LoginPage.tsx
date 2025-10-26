import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';

const LoginPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: Implement actual login logic
    console.log('Login attempt:', { email, password });
    // Placeholder navigation - replace with actual authentication
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-md bg-background p-8 rounded-xl shadow-2xl border border-opacity-10">
        <div className="flex flex-col items-center mb-10">
          <img 
            src="/paint-brain-logo.png" 
            alt="Paint Brain Logo" 
            className="h-32 w-auto mb-4"  // Increased logo size (≈1.5x)
          />
          <h2 className="text-foreground font-bold text-lg text-center">
            Smart project management for painters
          </h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="sr-only">Email address</label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Email address"
              className="w-full px-4 py-3 bg-background text-foreground rounded-lg 
                         border border-aframeOrange 
                         focus:border-aframeYellow focus:outline-none focus:ring-2 focus:ring-aframeYellow/50 
                         transition-colors duration-300"
            />
          </div>

          <div>
            <label htmlFor="password" className="sr-only">Password</label>
            <input
              id="password"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              className="w-full px-4 py-3 bg-background text-foreground rounded-lg 
                         border border-aframeOrange 
                         focus:border-aframeYellow focus:outline-none focus:ring-2 focus:ring-aframeYellow/50 
                         transition-colors duration-300"
            />
          </div>

          <div>
            <button
              type="submit"
              className="w-full bg-aframeRed hover:bg-aframeRed/90 text-foreground py-3 rounded-lg 
                         transition-colors duration-300 font-semibold 
                         focus:outline-none focus:ring-2 focus:ring-aframeRed/50"
            >
              Sign in
            </button>
          </div>

          <div className="text-center">
            <Link 
              to="/register" 
              className="text-aframePurple hover:underline text-sm font-semibold 
                         transition-colors duration-300 hover:text-aframePurple/80"
            >
              Create a new account
            </Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default LoginPage;
