import { useEffect, useState } from 'react';
import { Croissant } from 'lucide-react';
import { resolveBakeryImageUrl } from '../data/bakeryData';

interface ResilientImageProps {
  src: string;
  alt: string;
  className?: string;
}

export function ResilientImage({ src, alt, className = '' }: ResilientImageProps) {
  const resolvedSrc = resolveBakeryImageUrl(src);
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [resolvedSrc]);

  if (hasError) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={`flex flex-col items-center justify-center bg-[#EFECE5] text-[#5C5A55] p-6 text-center ${className}`}
      >
        <Croissant className="w-8 h-8 mb-2 text-[#233D29]/70" strokeWidth={1.5} />
        <span className="text-xs font-medium text-[#171716] max-w-[180px] leading-snug">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      src={resolvedSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onError={() => setHasError(true)}
      className={className}
    />
  );
}
