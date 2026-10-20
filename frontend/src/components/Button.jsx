import Spinner from './Spinner';

export default function Button({
  children,
  loading = false,
  variant = 'primary',
  className = '',
  ...props
}) {
  const variants = {
    primary: 'bg-green-600 text-white hover:bg-green-700 focus:ring-green-400 disabled:bg-green-300',
    secondary: 'bg-gray-100 text-gray-700 hover:bg-gray-200 focus:ring-gray-300',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-400 disabled:bg-red-300',
    outline: 'border border-green-600 text-green-600 hover:bg-green-50 focus:ring-green-400',
    ghost: 'text-gray-600 hover:bg-gray-100 focus:ring-gray-300',
  };

  return (
    <button
      disabled={loading || props.disabled}
      className={`inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:cursor-not-allowed ${variants[variant]} ${className}`}
      {...props}
    >
      {loading && <Spinner size="sm" />}
      {children}
    </button>
  );
}
