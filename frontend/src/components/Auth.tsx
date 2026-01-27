import { useState, type FormEvent } from 'react';
import { Shield, ArrowRight } from 'lucide-react';
import { api } from '../api';
import type { AuthUser } from '../types';

type AuthMode = 'login' | 'register';

interface AuthProps {
  onAuth: (user: AuthUser) => void;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error && typeof error === 'object' && 'response' in error) {
    const typed = error as { response?: { data?: { error?: string } } };
    return typed.response?.data?.error ?? fallback;
  }
  return fallback;
};

export function Auth({ onAuth }: AuthProps) {
  const [mode, setMode] = useState<AuthMode>('login');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [user, setUser] = useState<AuthUser | null>(null);

  const resetStatus = () => {
    setError('');
    setUser(null);
  };

  const handleModeChange = (nextMode: AuthMode) => {
    setMode(nextMode);
    setPassword('');
    setConfirmPassword('');
    resetStatus();
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);
    resetStatus();

    try {
      if (mode === 'register') {
        if (!username || !email || !password) {
          setError('Please fill in all required fields.');
          return;
        }
        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          return;
        }
        const created = await api.register({
          username,
          email,
          password,
        });
        setUser(created);
        onAuth(created);
      } else {
        if (!email || !password) {
          setError('Please enter your email and password.');
          return;
        }
        const loggedIn = await api.login({
          email,
          password,
        });
        setUser(loggedIn);
        onAuth(loggedIn);
      }
    } catch (err) {
      const message = getErrorMessage(err, 'Something went wrong. Please try again.');
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-cyan-500/10 blur-3xl" />
      <div className="absolute -bottom-32 -left-20 w-96 h-96 rounded-full bg-blue-600/10 blur-3xl" />

      <div className="relative z-10 min-h-screen flex items-center justify-center px-6 py-12">
        <div className="w-full max-w-5xl grid lg:grid-cols-2 gap-8">
          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/50 backdrop-blur px-8 py-10 flex flex-col justify-between">
            <div>
              <div className="inline-flex items-center gap-2 text-cyan-300 bg-cyan-400/10 border border-cyan-400/30 px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-widest">
                <Shield className="w-4 h-4" />
                Secure Access
              </div>
              <h1 className="mt-6 text-3xl lg:text-4xl font-bold text-white">
                IoT Monitoring Portal
              </h1>
              <p className="mt-3 text-gray-400 leading-relaxed">
                Sign in to view real-time device data, history charts, and alerts in one place.
                New here? Create an account in under a minute.
              </p>
            </div>

            <div className="mt-10">
              <div className="flex items-center gap-3 text-sm text-gray-400">
                <div className="flex -space-x-2">
                  <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600" />
                  <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600" />
                  <div className="w-8 h-8 rounded-full bg-slate-700 border border-slate-600" />
                </div>
                <span>Trusted by makers building smart environments.</span>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800/80 bg-slate-900/70 backdrop-blur px-8 py-10">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-semibold text-white">
                  {mode === 'login' ? 'Welcome back' : 'Create your account'}
                </h2>
                <p className="text-sm text-gray-400 mt-2">
                  {mode === 'login'
                    ? 'Use your credentials to continue.'
                    : 'Start monitoring sensors and devices instantly.'}
                </p>
              </div>
              <div className="flex items-center rounded-full bg-slate-800/70 p-1 text-xs">
                <button
                  className={`px-3 py-1.5 rounded-full font-semibold ${
                    mode === 'login' ? 'bg-cyan-500 text-white' : 'text-gray-400'
                  }`}
                  onClick={() => handleModeChange('login')}
                >
                  Login
                </button>
                <button
                  className={`px-3 py-1.5 rounded-full font-semibold ${
                    mode === 'register' ? 'bg-cyan-500 text-white' : 'text-gray-400'
                  }`}
                  onClick={() => handleModeChange('register')}
                >
                  Register
                </button>
              </div>
            </div>

            <form className="mt-8 space-y-5" onSubmit={handleSubmit}>
              {mode === 'register' && (
                <div>
                  <label className="text-sm text-gray-300">Full name</label>
                  <div className="relative mt-2">
                    <input
                      className="input"
                      placeholder="Ada Lovelace"
                      value={fullName}
                      onChange={(event) => setFullName(event.target.value)}
                    />
                  </div>
                </div>
              )}

              {mode === 'register' && (
                <div>
                  <label className="text-sm text-gray-300">Username</label>
                  <div className="relative mt-2">
                    <input
                      className="input"
                      placeholder="smart-home-admin"
                      value={username}
                      onChange={(event) => setUsername(event.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-300">Email</label>
                <div className="relative mt-2">
                  <input
                    className="input"
                    placeholder="you@domain.com"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                  />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300">Password</label>
                <div className="relative mt-2">
                  <input
                    className="input"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                  />
                  <button
                    type="button"
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200"
                    onClick={() => setShowPassword((prev) => !prev)}
                  >
                    {showPassword ? 'Hide' : 'Show'}
                  </button>
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="text-sm text-gray-300">Confirm password</label>
                  <div className="relative mt-2">
                    <input
                      className="input"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-gray-400 hover:text-gray-200"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      {showConfirmPassword ? 'Hide' : 'Show'}
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between text-sm text-gray-400">
                <label className="flex items-center gap-2">
                  <input type="checkbox" className="accent-cyan-500" />
                  Remember me
                </label>
                <button type="button" className="text-cyan-300 hover:text-cyan-200">
                  Forgot password?
                </button>
              </div>

              <button
                className="btn btn-primary w-full flex items-center justify-center gap-2"
                disabled={isSubmitting}
              >
                {isSubmitting
                  ? 'Submitting...'
                  : mode === 'login'
                    ? 'Sign in'
                    : 'Create account'}
                <ArrowRight className="w-4 h-4" />
              </button>

              {error && (
                <div className="text-sm text-red-300 bg-red-500/10 border border-red-500/30 rounded-lg px-3 py-2">
                  {error}
                </div>
              )}

              {user && (
                <div className="text-sm text-emerald-300 bg-emerald-500/10 border border-emerald-500/30 rounded-lg px-3 py-2">
                  {mode === 'login'
                    ? `Welcome back, ${user.username}.`
                    : `Account created for ${user.username}.`}
                </div>
              )}

              <p className="text-xs text-gray-500">
                By continuing, you agree to the platform terms and data processing policy.
              </p>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}

export default Auth;
