interface SkeletonProps {
  className?: string;
  /** Variant type */
  variant?: "text" | "circle" | "rect";
  /** Width (for text/rect) */
  width?: string | number;
  /** Height (for text/rect) */
  height?: string | number;
  /** Size for circle variant */
  size?: string | number;
}

export function Skeleton({ className = "", variant = "text", width, height, size }: SkeletonProps) {
  const baseClasses = "animate-pulse bg-slate-200 dark:bg-slate-700";

  const getStyles = (): React.CSSProperties => {
    const styles: React.CSSProperties = {};

    if (variant === "circle") {
      const circleSize = size || 40;
      styles.width = typeof circleSize === "number" ? `${circleSize}px` : circleSize;
      styles.height = styles.width;
    } else {
      if (width) styles.width = typeof width === "number" ? `${width}px` : width;
      if (height) styles.height = typeof height === "number" ? `${height}px` : height;
    }

    return styles;
  };

  const variantClasses: Record<string, string> = {
    text: "h-4 rounded",
    circle: "rounded-full",
    rect: "rounded-lg",
  };

  return (
    <div className={`${baseClasses} ${variantClasses[variant]} ${className}`} style={getStyles()} aria-hidden="true" />
  );
}

// Pre-built skeleton components for common patterns
export function ShiftCardSkeleton() {
  return (
    <div className="ui-surface rounded-2xl p-5 shadow-sm">
      <div className="flex justify-between items-start mb-3">
        <Skeleton variant="text" width={100} />
        <Skeleton variant="rect" width={60} height={20} />
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <Skeleton variant="text" width={80} height={24} />
        <Skeleton variant="text" width={20} height={16} />
        <Skeleton variant="text" width={80} height={24} />
      </div>
      <Skeleton variant="text" width={60} className="mb-4" />
      <div className="flex items-center justify-between mt-4 pt-4 border-t border-slate-50 dark:border-slate-700">
        <Skeleton variant="text" width={120} />
        <Skeleton variant="rect" width={80} height={32} />
      </div>
    </div>
  );
}

export function PoolCardSkeleton() {
  return (
    <div className="ui-surface p-5 rounded-2xl shadow-sm flex justify-between items-center">
      <div>
        <Skeleton variant="text" width={150} height={20} className="mb-2" />
        <Skeleton variant="text" width={100} height={14} />
      </div>
      <Skeleton variant="rect" width={24} height={24} />
    </div>
  );
}

export function CasualRowSkeleton() {
  return (
    <div className="ui-surface p-4 rounded-xl flex justify-between items-center mb-2">
      <div>
        <Skeleton variant="text" width={120} height={18} className="mb-1" />
        <Skeleton variant="text" width={100} height={14} />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton variant="rect" width={60} height={24} />
        <Skeleton variant="circle" size={32} />
      </div>
    </div>
  );
}
