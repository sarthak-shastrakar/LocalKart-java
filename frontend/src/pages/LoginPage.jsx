import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { ShoppingBag, AlertTriangle } from 'lucide-react';

import { loginApi } from '../features/auth/authApi';
import { setCredentials } from '../features/auth/authSlice';
import Input from '../components/Input';
import Button from '../components/Button';
import FormErrorText from '../components/FormErrorText';
import useRateLimitCountdown from '../hooks/useRateLimitCountdown';

const SUPPORT_EMAIL = 'support@localkart.com';

const schema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  password: z.string().min(1, 'Password is required'),
});

const roleHome = {
  CUSTOMER: '/',
  STORE_OWNER: '/owner',
  ADMIN: '/admin',
};

export default function LoginPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const [blockedMessage, setBlockedMessage] = useState(null);

  const { rateLimitMsg, countdown, countdownLabel, startRateLimit, clearRateLimit } =
    useRateLimitCountdown('rl_login');

  const {
    register,
    handleSubmit,
    setError,
    getValues,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data) => {
    setBlockedMessage(null);
    clearRateLimit();
    try {
      const res = await loginApi(data);
      dispatch(setCredentials(res.data));
      const from =
        (typeof location.state?.from === 'string'
          ? location.state.from
          : location.state?.from
          ? location.state.from.pathname + (location.state.from.search || '')
          : null) ||
        roleHome[res.data.role] ||
        '/';
      navigate(from, { replace: true });
    } catch (err) {
      const status = err.response?.status;
      if (status === 401) {
        setError('password', { message: 'Invalid email or password' });
      } else if (status === 403) {
        setBlockedMessage(err.response?.data?.message || 'Your account has been blocked.');
      } else if (status === 429) {
        const msg = err.response?.data?.message || 'Too many attempts. Please wait before trying again.';
        const retryAfter = err.response?.headers?.['retry-after'] || '';
        startRateLimit(msg, retryAfter);
      } else {
        const msg = err.response?.data?.message || 'Something went wrong. Please try again.';
        toast.error(msg);
      }
    }
  };

  const isLocked = countdown > 0;
  const submitDisabled = isSubmitting || isLocked;

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-8 text-center">
            <Link to="/" className="inline-flex items-center gap-2 text-white font-bold text-2xl mb-2">
              <ShoppingBag size={28} />
              <span>Local<span className="text-green-200">Kart</span></span>
            </Link>
            <p className="text-green-100 text-sm mt-1">Your neighbourhood, delivered</p>
          </div>

          <div className="px-8 py-8">
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Welcome back</h1>
            <p className="text-sm text-gray-500 mb-6">Sign in to your account to continue</p>

            {/* Blocked account alert box */}
            {blockedMessage && (
              <div className="mb-5 p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800">
                <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={20} />
                <div className="text-sm space-y-2 flex-1">
                  <p className="font-bold">{blockedMessage}</p>
                  <div>
                    <Link
                      id="login-request-unblock-btn"
                      to="/appeal"
                      state={{ email: getValues('email') || '' }}
                      className="inline-flex items-center justify-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 rounded-xl transition shadow-sm"
                    >
                      Request unblock
                    </Link>
                  </div>
                  <p className="text-xs text-red-600 pt-0.5">
                    Or contact support at{' '}
                    <a href={`mailto:${SUPPORT_EMAIL}`} className="underline font-semibold hover:text-red-800">
                      {SUPPORT_EMAIL}
                    </a>
                  </p>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              <Input
                id="login-email"
                label="Email address"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <div>
                <Input
                  id="login-password"
                  label="Password"
                  type="password"
                  placeholder="Your password"
                  autoComplete="current-password"
                  error={errors.password?.message}
                  aria-describedby={rateLimitMsg ? 'login-rate-limit' : undefined}
                  {...register('password')}
                />
                {/* Rate-limit message — shown directly under the password field */}
                {(isLocked || rateLimitMsg) && (
                  <FormErrorText
                    id="login-rate-limit"
                    message={
                      isLocked
                        ? `Too many attempts. Try again in ${countdownLabel}`
                        : rateLimitMsg
                    }
                  />
                )}
              </div>

              <Button
                id="login-submit-btn"
                type="submit"
                loading={isSubmitting && !isLocked}
                disabled={submitDisabled}
                className="w-full mt-2 py-3 text-base"
              >
                {isLocked ? `Try again in ${countdownLabel}` : 'Sign In'}
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Don&#39;t have an account?{' '}
              <Link to="/register" className="text-green-600 font-semibold hover:underline">
                Create one
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          &copy; {new Date().getFullYear()} LocalKart. All rights reserved.
        </p>
      </div>
    </div>
  );
}


