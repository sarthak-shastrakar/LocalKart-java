import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useNavigate } from 'react-router-dom';
import { useDispatch } from 'react-redux';
import toast from 'react-hot-toast';
import { ShoppingBag, User, Store } from 'lucide-react';

import { registerApi } from '../features/auth/authApi';
import { setCredentials } from '../features/auth/authSlice';
import Input from '../components/Input';
import Button from '../components/Button';

const schema = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().min(1, 'Email is required').email('Enter a valid email'),
  phone: z
    .string()
    .regex(/^\d{10}$/, 'Phone must be exactly 10 digits'),
  password: z
    .string()
    .min(8, 'Password must be at least 8 characters'),
  role: z.enum(['CUSTOMER', 'STORE_OWNER'], { required_error: 'Please select a role' }),
});

const roleHome = {
  CUSTOMER: '/',
  STORE_OWNER: '/owner',
};

export default function RegisterPage() {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    setError,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm({ resolver: zodResolver(schema), defaultValues: { role: 'CUSTOMER' } });

  const selectedRole = watch('role');

  const onSubmit = async (data) => {
    try {
      const res = await registerApi(data);
      dispatch(setCredentials(res.data));
      toast.success(`Account created! Welcome, ${res.data.name}!`);
      navigate(roleHome[res.data.role] || '/', { replace: true });
    } catch (err) {
      const status = err.response?.status;
      const body = err.response?.data;

      if (status === 409) {
        setError('email', { message: 'This email is already registered' });
        return;
      }

      // Map backend field validation errors onto form fields
      if (status === 400 && body?.errors) {
        Object.entries(body.errors).forEach(([field, message]) => {
          setError(field, { message });
        });
        return;
      }

      toast.error(body?.message || 'Something went wrong. Please try again.');
    }
  };

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
            <h1 className="text-2xl font-bold text-gray-800 mb-1">Create account</h1>
            <p className="text-sm text-gray-500 mb-6">Join LocalKart today — it&#39;s free</p>

            <form onSubmit={handleSubmit(onSubmit)} noValidate className="space-y-4">
              {/* Role selector */}
              <div className="space-y-1.5">
                <label className="block text-sm font-medium text-gray-700">I am a…</label>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { value: 'CUSTOMER', label: 'Customer', icon: <User size={18} />, desc: 'Shop from local stores' },
                    { value: 'STORE_OWNER', label: 'Store Owner', icon: <Store size={18} />, desc: 'Sell to your neighbourhood' },
                  ].map(({ value, label, icon, desc }) => (
                    <button
                      key={value}
                      type="button"
                      id={`role-${value.toLowerCase()}`}
                      onClick={() => setValue('role', value, { shouldValidate: true })}
                      className={`flex flex-col items-center gap-1.5 p-4 rounded-2xl border-2 text-sm font-semibold transition-all cursor-pointer
                        ${selectedRole === value
                          ? 'border-green-500 bg-green-50 text-green-700'
                          : 'border-gray-200 text-gray-500 hover:border-gray-300 hover:bg-gray-50'
                        }`}
                    >
                      <span className={selectedRole === value ? 'text-green-600' : 'text-gray-400'}>{icon}</span>
                      <span>{label}</span>
                      <span className={`text-xs font-normal text-center leading-tight ${selectedRole === value ? 'text-green-500' : 'text-gray-400'}`}>{desc}</span>
                    </button>
                  ))}
                </div>
                {errors.role && <p className="text-xs text-red-500">{errors.role.message}</p>}
              </div>

              <Input
                id="register-name"
                label="Full name"
                type="text"
                placeholder="Ravi Kumar"
                autoComplete="name"
                error={errors.name?.message}
                {...register('name')}
              />
              <Input
                id="register-email"
                label="Email address"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                id="register-phone"
                label="Phone number (10 digits)"
                type="tel"
                placeholder="9876543210"
                autoComplete="tel"
                maxLength={10}
                error={errors.phone?.message}
                {...register('phone')}
              />
              <Input
                id="register-password"
                label="Password (min 8 characters)"
                type="password"
                placeholder="Create a strong password"
                autoComplete="new-password"
                error={errors.password?.message}
                {...register('password')}
              />

              <Button
                id="register-submit-btn"
                type="submit"
                loading={isSubmitting}
                className="w-full mt-2 py-3 text-base"
              >
                Create Account
              </Button>
            </form>

            <p className="text-center text-sm text-gray-500 mt-6">
              Already have an account?{' '}
              <Link to="/login" className="text-green-600 font-semibold hover:underline">
                Sign in
              </Link>
            </p>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-4">
          © {new Date().getFullYear()} LocalKart. All rights reserved.
        </p>
      </div>
    </div>
  );
}
