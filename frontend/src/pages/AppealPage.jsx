import { useState } from 'react';
import { useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  ShoppingBag, ShieldAlert, Clock, CheckCircle2, XCircle,
  AlertTriangle, ArrowLeft, Send, Search, Info, LogIn
} from 'lucide-react';
import toast from 'react-hot-toast';

import { submitAppeal, getAppealStatus } from '../features/auth/appealApi';
import Input from '../components/Input';
import Button from '../components/Button';
import FormErrorText from '../components/FormErrorText';
import useRateLimitCountdown from '../hooks/useRateLimitCountdown';
import { fmtDate, fmtDateTime } from '../utils';

const appealSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  message: z
    .string()
    .min(20, 'Message must be at least 20 characters')
    .max(1000, 'Message must not exceed 1000 characters'),
});

const statusSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
});

export default function AppealPage() {
  const location = useLocation();
  const initialEmail = location.state?.email || '';

  const [activeTab, setActiveTab] = useState('SUBMIT'); // 'SUBMIT' | 'STATUS'

  // Submit Tab State
  const [submitSuccess, setSubmitSuccess] = useState(null);
  const [submitError, setSubmitError] = useState(null);

  // Status Tab State
  const [statusResult, setStatusResult] = useState(null);
  const [statusError, setStatusError] = useState(null);
  const [statusLoading, setStatusLoading] = useState(false);

  // Rate-limit countdowns (one per tab form)
  const submitRL = useRateLimitCountdown('rl_appeal_submit');
  const statusRL = useRateLimitCountdown('rl_appeal_status');

  // Form for Submit Appeal
  const {
    register: registerSubmit,
    handleSubmit: handleSubmitAppeal,
    watch: watchSubmit,
    setError: setErrorSubmit,
    setValue: setValueSubmit,
    formState: { errors: errorsSubmit, isSubmitting: isSubmittingAppeal },
  } = useForm({
    resolver: zodResolver(appealSchema),
    defaultValues: { email: initialEmail, password: '', message: '' },
  });

  // Form for Check Status
  const {
    register: registerStatus,
    handleSubmit: handleSubmitStatus,
    setValue: setValueStatus,
    formState: { errors: errorsStatus },
  } = useForm({
    resolver: zodResolver(statusSchema),
    defaultValues: { email: initialEmail, password: '' },
  });

  const messageVal = watchSubmit('message') || '';

  // Handle Appeal Submit
  const onSubmitAppeal = async (data) => {
    setSubmitError(null);
    setSubmitSuccess(null);
    submitRL.clearRateLimit();
    try {
      const res = await submitAppeal({
        email: data.email.trim(),
        password: data.password,
        message: data.message.trim(),
      });
      setSubmitSuccess(res.data);
      setValueStatus('email', data.email);
      setValueStatus('password', data.password);
      toast.success('Appeal submitted successfully');
    } catch (err) {
      const status = err.response?.status;
      const respData = err.response?.data;
      if (status === 429) {
        const msg = respData?.message || 'Too many attempts. Please wait before trying again.';
        const retryAfter = err.response?.headers?.['retry-after'] || '';
        submitRL.startRateLimit(msg, retryAfter);
        return;
      }
      if (respData?.errors && typeof respData.errors === 'object') {
        Object.entries(respData.errors).forEach(([field, msg]) => {
          setErrorSubmit(field, { message: msg });
        });
      }
      const msg = respData?.message || 'Failed to submit appeal. Please try again.';
      setSubmitError(msg);
    }
  };

  // Handle Status Check
  const onCheckStatus = async (data) => {
    setStatusError(null);
    setStatusResult(null);
    statusRL.clearRateLimit();
    setStatusLoading(true);
    try {
      const res = await getAppealStatus({
        email: data.email.trim(),
        password: data.password,
      });
      setStatusResult(res.data);
    } catch (err) {
      const status = err.response?.status;
      if (status === 429) {
        const msg = err.response?.data?.message || 'Too many attempts. Please wait before trying again.';
        const retryAfter = err.response?.headers?.['retry-after'] || '';
        statusRL.startRateLimit(msg, retryAfter);
      } else {
        const msg = err.response?.data?.message || 'Failed to retrieve appeal status. Please verify your credentials.';
        setStatusError(msg);
      }
    } finally {
      setStatusLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center p-4 py-10">
      <div className="w-full max-w-xl">
        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-gray-100 overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-green-600 to-emerald-600 px-8 py-7 text-center relative">
            <Link
              to="/login"
              className="absolute left-6 top-6 text-green-100 hover:text-white flex items-center gap-1.5 text-xs font-semibold transition"
            >
              <ArrowLeft size={16} /> Back to Sign In
            </Link>

            <Link to="/" className="inline-flex items-center gap-2 text-white font-bold text-2xl mb-1">
              <ShoppingBag size={28} />
              <span>Local<span className="text-green-200">Kart</span></span>
            </Link>
            <p className="text-green-100 text-sm mt-0.5">Account Unblock Appeal Portal</p>
          </div>

          <div className="px-6 sm:px-8 py-7">
            {/* Tabs */}
            <div className="flex rounded-2xl bg-gray-100/80 p-1 mb-6">
              <button
                type="button"
                id="appeal-tab-request"
                onClick={() => setActiveTab('SUBMIT')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
                  activeTab === 'SUBMIT'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Send size={15} />
                Request unblock
              </button>
              <button
                type="button"
                id="appeal-tab-status"
                onClick={() => setActiveTab('STATUS')}
                className={`flex-1 py-2.5 text-sm font-semibold rounded-xl transition flex items-center justify-center gap-2 ${
                  activeTab === 'STATUS'
                    ? 'bg-white text-green-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-800'
                }`}
              >
                <Search size={15} />
                Check status
              </button>
            </div>

            {/* TAB 1: Request Unblock */}
            {activeTab === 'SUBMIT' && (
              <div className="space-y-5">
                {/* Notice banner */}
                <div className="flex items-start gap-3 p-3.5 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-800">
                  <Info size={18} className="text-blue-500 shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    Email and password are asked only to verify the account is yours.
                    Our administrative team will review your explanation carefully.
                  </p>
                </div>

                {/* Inline Error Alert */}
                {submitError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm">
                    <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Appeal submission failed</p>
                      <p className="text-xs text-red-700 mt-0.5">{submitError}</p>
                    </div>
                  </div>
                )}

                {/* Success Panel */}
                {submitSuccess ? (
                  <div className="p-6 bg-green-50 border border-green-200 rounded-2xl text-center space-y-4">
                    <div className="w-12 h-12 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto">
                      <CheckCircle2 size={28} />
                    </div>
                    <div>
                      <h2 className="text-lg font-bold text-green-900">Request sent. We will review it.</h2>
                      <p className="text-xs text-green-700 mt-1 max-w-sm mx-auto leading-relaxed">
                        Your appeal has been securely submitted. An administrator will assess your request.
                        You can check your status anytime using the <strong>Check status</strong> tab.
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="primary"
                      onClick={() => setActiveTab('STATUS')}
                      className="text-xs py-2 px-4"
                    >
                      Check Status Now
                    </Button>
                  </div>
                ) : (
                  <form onSubmit={handleSubmitAppeal(onSubmitAppeal)} noValidate className="space-y-4">
                    <Input
                      id="appeal-email"
                      label="Account Email address"
                      type="email"
                      placeholder="you@example.com"
                      autoComplete="email"
                      error={errorsSubmit.email?.message}
                      {...registerSubmit('email')}
                    />

                    <Input
                      id="appeal-password"
                      label="Account Password"
                      type="password"
                      placeholder="Your password"
                      autoComplete="current-password"
                      error={errorsSubmit.password?.message}
                      {...registerSubmit('password')}
                    />

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <label htmlFor="appeal-message" className="block text-sm font-medium text-gray-700">
                          Appeal explanation
                        </label>
                        <span
                          className={`text-xs font-mono ${
                            messageVal.length > 1000
                              ? 'text-red-500 font-bold'
                              : messageVal.length < 20
                              ? 'text-gray-400'
                              : 'text-green-600 font-semibold'
                          }`}
                        >
                          {messageVal.length}/1000
                        </span>
                      </div>
                      <textarea
                        id="appeal-message"
                        rows={4}
                        placeholder="Explain why your account should be unblocked and any steps you&#39;ve taken to comply with LocalKart policies (minimum 20 characters)..."
                        className={`w-full px-4 py-2.5 rounded-xl border text-sm transition-colors focus:outline-none focus:ring-2 focus:ring-green-400 focus:border-transparent placeholder:text-gray-400 ${
                          errorsSubmit.message
                            ? 'border-red-400 bg-red-50'
                            : 'border-gray-200 bg-white hover:border-gray-300'
                        }`}
                        {...registerSubmit('message')}
                      />
                      {errorsSubmit.message && (
                        <p className="text-xs text-red-500">{errorsSubmit.message.message}</p>
                      )}
                      {/* Rate-limit message — shown under the last field before submit */}
                      {(submitRL.countdown > 0 || submitRL.rateLimitMsg) && (
                        <FormErrorText
                          id="appeal-submit-rate-limit"
                          message={
                            submitRL.countdown > 0
                              ? `Too many attempts. Try again in ${submitRL.countdownLabel}`
                              : submitRL.rateLimitMsg
                          }
                        />
                      )}
                    </div>

                    <Button
                      id="appeal-submit-btn"
                      type="submit"
                      loading={isSubmittingAppeal && submitRL.countdown === 0}
                      disabled={isSubmittingAppeal || submitRL.countdown > 0}
                      className="w-full mt-2 py-3 text-base"
                    >
                      <Send size={16} />
                      {submitRL.countdown > 0
                        ? `Try again in ${submitRL.countdownLabel}`
                        : 'Submit Appeal'}
                    </Button>
                  </form>
                )}
              </div>
            )}

            {/* TAB 2: Check Status */}
            {activeTab === 'STATUS' && (
              <div className="space-y-5">
                <form onSubmit={handleSubmitStatus(onCheckStatus)} noValidate className="space-y-4">
                  <Input
                    id="status-email"
                    label="Account Email address"
                    type="email"
                    placeholder="you@example.com"
                    autoComplete="email"
                    error={errorsStatus.email?.message}
                    {...registerStatus('email')}
                  />

                  <div>
                    <Input
                      id="status-password"
                      label="Account Password"
                      type="password"
                      placeholder="Your password"
                      autoComplete="current-password"
                      error={errorsStatus.password?.message}
                      aria-describedby={statusRL.rateLimitMsg ? 'appeal-status-rate-limit' : undefined}
                      {...registerStatus('password')}
                    />
                    {/* Rate-limit message under the last field before submit */}
                    {(statusRL.countdown > 0 || statusRL.rateLimitMsg) && (
                      <FormErrorText
                        id="appeal-status-rate-limit"
                        message={
                          statusRL.countdown > 0
                            ? `Too many attempts. Try again in ${statusRL.countdownLabel}`
                            : statusRL.rateLimitMsg
                        }
                      />
                    )}
                  </div>

                  <Button
                    id="status-check-btn"
                    type="submit"
                    loading={statusLoading && statusRL.countdown === 0}
                    disabled={statusLoading || statusRL.countdown > 0}
                    className="w-full py-2.5 text-sm"
                  >
                    <Search size={16} />
                    {statusRL.countdown > 0
                      ? `Try again in ${statusRL.countdownLabel}`
                      : 'Check Appeal Status'}
                  </Button>
                </form>

                {/* Inline Error Alert */}
                {statusError && (
                  <div className="p-4 bg-red-50 border border-red-200 rounded-2xl flex items-start gap-3 text-red-800 text-sm">
                    <AlertTriangle size={18} className="text-red-500 shrink-0 mt-0.5" />
                    <div>
                      <p className="font-bold">Unable to find appeal</p>
                      <p className="text-xs text-red-700 mt-0.5">{statusError}</p>
                    </div>
                  </div>
                )}

                {/* Status Result Card */}
                {statusResult && (
                  <div className="pt-2">
                    {statusResult.status === 'PENDING' && (
                      <div className="p-5 bg-amber-50 border border-amber-200 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-amber-800">
                          <Clock size={20} className="text-amber-600" />
                          <h3 className="font-bold text-base">Under review</h3>
                        </div>
                        <p className="text-xs text-amber-900 leading-relaxed">
                          Your appeal was submitted on <strong>{fmtDateTime(statusResult.createdAt)}</strong> and is currently being evaluated by an administrator. Please check back later.
                        </p>
                      </div>
                    )}

                    {statusResult.status === 'APPROVED' && (
                      <div className="p-5 bg-green-50 border border-green-200 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-green-800">
                          <CheckCircle2 size={20} className="text-green-600" />
                          <h3 className="font-bold text-base">Approved, you can log in now</h3>
                        </div>
                        {statusResult.adminNote && (
                          <div className="p-3 bg-white/80 rounded-xl border border-green-200 text-xs text-green-900">
                            <span className="font-bold">Admin Note: </span>
                            {statusResult.adminNote}
                          </div>
                        )}
                        <p className="text-xs text-green-700">
                          Reviewed on {fmtDateTime(statusResult.reviewedAt)}.
                        </p>
                        <div className="pt-1">
                          <Link
                            to="/login"
                            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-xl text-xs transition shadow-sm"
                          >
                            <LogIn size={14} /> Proceed to Sign In
                          </Link>
                        </div>
                      </div>
                    )}

                    {statusResult.status === 'REJECTED' && (
                      <div className="p-5 bg-red-50 border border-red-200 rounded-2xl space-y-3">
                        <div className="flex items-center gap-2 text-red-800">
                          <XCircle size={20} className="text-red-500" />
                          <h3 className="font-bold text-base">Appeal Rejected</h3>
                        </div>
                        <div className="p-3 bg-white/80 rounded-xl border border-red-200 text-xs text-red-900 space-y-1">
                          <span className="font-bold">Reason from admin:</span>
                          <p className="text-gray-700">{statusResult.adminNote || 'No specific reason provided.'}</p>
                        </div>
                        {statusResult.canAppealAgainAt && (
                          <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-800 font-medium">
                            You can appeal again on {fmtDate(statusResult.canAppealAgainAt)}.
                          </div>
                        )}
                        <p className="text-xs text-gray-400">
                          Reviewed on {fmtDateTime(statusResult.reviewedAt)}.
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} LocalKart. All rights reserved.
        </p>
      </div>
    </div>
  );
}
