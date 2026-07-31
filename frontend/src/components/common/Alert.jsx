const STYLES = {
  error: 'bg-red-50 text-red-700 border-red-200',
  success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  warning: 'bg-amber-50 text-amber-700 border-amber-200',
  info: 'bg-blue-50 text-blue-700 border-blue-200',
};

export default function Alert({ type = 'info', children }) {
  if (!children) return null;
  return (
    <div className={`border rounded-md px-4 py-2.5 text-sm ${STYLES[type]}`}>{children}</div>
  );
}
