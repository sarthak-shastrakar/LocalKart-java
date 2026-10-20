import { useState, useEffect } from 'react';

const SIZE_MAP = {
  sm: 'w-8 h-8 text-xs',
  md: 'w-10 h-10 text-sm',
  lg: 'w-20 h-20 text-2xl',
};

/**
 * Reusable Avatar — shows profile image with initials fallback.
 * @param {{ src?: string|null, name?: string, size?: 'sm'|'md'|'lg', className?: string }} props
 */
export default function Avatar({ src, name = '', size = 'md', className = '' }) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const initials = name
    ? name
        .split(' ')
        .map((w) => w[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)
    : 'U';

  const sizeClass = SIZE_MAP[size] || SIZE_MAP.md;

  if (src && !imgError) {
    return (
      <img
        src={src}
        alt={`${name || 'User'}\u2019s profile photo`}
        loading="lazy"
        onError={() => setImgError(true)}
        className={`${sizeClass} rounded-full object-cover flex-shrink-0 border border-gray-200 ${className}`}
      />
    );
  }

  return (
    <div
      className={`${sizeClass} rounded-full flex-shrink-0 flex items-center justify-center font-bold bg-green-100 text-green-700 border border-green-200 select-none ${className}`}
      aria-label={`${name || 'User'}\u2019s avatar`}
    >
      {initials}
    </div>
  );
}
