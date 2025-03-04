import React from 'react';

interface UnregisteredMessageProps {
  wasUnregistered: boolean;
}

export function UnregisteredMessage({ wasUnregistered }: UnregisteredMessageProps) {
  if (!wasUnregistered) return null;

  return (
    <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
      <p className="text-red-700">
        You were unregistered from this tournament. Please contact support if you believe this was in error.
      </p>
    </div>
  );
}