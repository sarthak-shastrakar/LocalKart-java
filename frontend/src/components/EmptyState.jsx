export default function EmptyState({ icon, title, description }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center space-y-3">
      {icon && <div className="text-5xl text-gray-300">{icon}</div>}
      <h3 className="text-lg font-semibold text-gray-500">{title}</h3>
      {description && <p className="text-sm text-gray-400 max-w-xs">{description}</p>}
    </div>
  );
}
