import { useState } from 'react';
import { Lock, Mail, User, Shield, ArrowRight } from 'lucide-react';

type AuthMode = 'login' | 'register';

export function Auth() {
  const [mode, setMode] = useState<AuthMode>('login');

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
                  onClick={() => setMode('login')}
                >
                  Login
                </button>
                <button
                  className={`px-3 py-1.5 rounded-full font-semibold ${
                    mode === 'register' ? 'bg-cyan-500 text-white' : 'text-gray-400'
                  }`}
                  onClick={() => setMode('register')}
                >
                  Register
                </button>
              </div>
            </div>

            <form className="mt-8 space-y-5">
              {mode === 'register' && (
                <div>
                  <label className="text-sm text-gray-300">Full name</label>
                  <div className="relative mt-2">
                    <User className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input className="input pl-10" placeholder="Ada Lovelace" />
                  </div>
                </div>
              )}

              <div>
                <label className="text-sm text-gray-300">Email</label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input className="input pl-10" placeholder="you@domain.com" />
                </div>
              </div>

              <div>
                <label className="text-sm text-gray-300">Password</label>
                <div className="relative mt-2">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input className="input pl-10" type="password" placeholder="••••••••" />
                </div>
              </div>

              {mode === 'register' && (
                <div>
                  <label className="text-sm text-gray-300">Confirm password</label>
                  <div className="relative mt-2">
                    <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                    <input className="input pl-10" type="password" placeholder="••••••••" />
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

              <button className="btn btn-primary w-full flex items-center justify-center gap-2">
                {mode === 'login' ? 'Sign in' : 'Create account'}
                <ArrowRight className="w-4 h-4" />
              </button>

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
