const VARIANTS = {
  primary: 'bg-primary-500 text-white hover:bg-primary-600 disabled:opacity-50',
  secondary: 'border border-gray-300 text-gray-700 hover:bg-gray-50',
  danger: 'bg-red-600 text-white hover:bg-red-700 disabled:opacity-50',
};

export default function Button({ variant = 'primary', className = '', children, ...props }) {
  return (
    <button
      className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${VARIANTS[variant]} ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}
