import React, { useState } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { useMutation } from '@tanstack/react-query';
import client from '../api/client';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // If already logged in, redirect to home
  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const registerMutation = useMutation({
    mutationFn: async (credentials) => {
      const response = await client.post('/auth/register', credentials);
      return response.data;
    },
    onSuccess: () => {
      setSuccessMessage('Registration successful! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 1500);
    },
    onError: (error) => {
      if (error.response && error.response.data && error.response.data.error) {
        setErrorMessage(error.response.data.error);
      } else {
        setErrorMessage('Registration failed');
      }
    },
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    setErrorMessage('');
    setSuccessMessage('');
    if (!email || !password) {
      setErrorMessage('email and password are required');
      return;
    }
    registerMutation.mutate({ email, password });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#f8fafc] p-4">
      <div className="w-full max-w-md bg-white border border-[#e2e8f0] rounded-xl p-8 shadow-sm">
        <h2 className="text-2xl font-bold text-center text-[#0f172a] mb-6 tracking-tight">
          Create Account
        </h2>

        {errorMessage && (
          <div className="bg-[#dc2626]/10 border border-[#dc2626]/20 text-[#dc2626] p-3 rounded-lg text-sm mb-4">
            {errorMessage}
          </div>
        )}

        {successMessage && (
          <div className="bg-[#15803d]/10 border border-[#15803d]/20 text-[#15803d] p-3 rounded-lg text-sm mb-4">
            {successMessage}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="label">
              Email Address
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input"
              placeholder="you@example.com"
              required
            />
          </div>

          <div>
            <label className="label">
              Password
            </label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input"
              placeholder="••••••••"
              required
            />
          </div>

          <button
            type="submit"
            disabled={registerMutation.isPending}
            className="w-full btn-primary py-2.5 mt-2"
          >
            {registerMutation.isPending ? 'Registering...' : 'Register'}
          </button>
        </form>

        <p className="text-center text-sm text-slate-500 mt-6">
          Already have an account?{' '}
          <Link to="/login" className="text-[#1e40af] hover:text-[#1d4ed8] font-semibold">
            Sign in here
          </Link>
        </p>
      </div>
    </div>
  );
}
