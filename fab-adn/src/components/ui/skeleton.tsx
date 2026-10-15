import React from 'react';

interface SkeletonProps {
  className?: string;
}

const Skeleton: React.FC<SkeletonProps> = ({ className = '' }) => (
  <div className={`shimmer rounded-lg ${className}`} />
);

export { Skeleton };
export default Skeleton;

export const CardSkeleton: React.FC = () => (
  <div className="card-adn p-6 space-y-4">
    <Skeleton className="w-full h-48 rounded-lg" />
    <Skeleton className="h-6 w-3/4" />
    <div className="space-y-2">
      <Skeleton className="h-4 w-full" />
      <Skeleton className="h-4 w-5/6" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-2/3" />
      <Skeleton className="h-3 w-2/3" />
    </div>
    <Skeleton className="h-10 w-full rounded-lg" />
  </div>
);

export const PageSkeleton: React.FC<{ type?: 'services' | 'mechanics' }> = ({ type = 'services' }) => (
  <div className="min-h-screen bg-background pt-20">
    <div className="py-20">
      <div className="container mx-auto px-4">
        <div className="text-center mb-16 space-y-4">
          <Skeleton className="h-4 w-32 mx-auto" />
          <Skeleton className="h-12 w-96 mx-auto" />
          <Skeleton className="h-6 w-[600px] mx-auto" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {Array.from({ length: 6 }).map((_, i) => (
            <CardSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  </div>
);
