import React from 'react';
import type { OrderStatus } from '../../types/order';
import {
  CLIENT_STATUS_LABELS,
  RESTAURANT_STATUS_LABELS,
} from '../../types/order';
import { Badge } from '../ui/Badge';

interface StatusBadgeProps {
  status: OrderStatus;
  view?: 'client' | 'restaurant';
  size?: 'sm' | 'md';
  className?: string;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  view = 'restaurant',
  size = 'md',
  className = '',
}) => {
  const getBadgeConfig = () => {
    switch (status) {
      case 'PENDING':
        return {
          variant: 'amber' as const,
          label: view === 'client' ? CLIENT_STATUS_LABELS.PENDING.title : RESTAURANT_STATUS_LABELS.PENDING,
          hasDot: true,
        };
      case 'ACCEPTED':
        return {
          variant: 'blue' as const,
          label: view === 'client' ? CLIENT_STATUS_LABELS.ACCEPTED.title : RESTAURANT_STATUS_LABELS.ACCEPTED,
          hasDot: true,
        };
      case 'IN_PREPARATION':
        return {
          variant: 'purple' as const,
          label: view === 'client' ? CLIENT_STATUS_LABELS.IN_PREPARATION.title : RESTAURANT_STATUS_LABELS.IN_PREPARATION,
          hasDot: true,
        };
      case 'READY':
        return {
          variant: 'emerald' as const,
          label: view === 'client' ? CLIENT_STATUS_LABELS.READY.title : RESTAURANT_STATUS_LABELS.READY,
          hasDot: true,
        };
      case 'COMPLETED':
        return {
          variant: 'slate' as const,
          label: view === 'client' ? CLIENT_STATUS_LABELS.COMPLETED.title : RESTAURANT_STATUS_LABELS.COMPLETED,
          hasDot: false,
        };
      case 'REFUSED':
        return {
          variant: 'rose' as const,
          label: view === 'client' ? CLIENT_STATUS_LABELS.REFUSED.title : RESTAURANT_STATUS_LABELS.REFUSED,
          hasDot: true,
        };
      case 'CANCELLED':
        return {
          variant: 'slate' as const,
          label: view === 'client' ? CLIENT_STATUS_LABELS.CANCELLED.title : RESTAURANT_STATUS_LABELS.CANCELLED,
          hasDot: false,
        };
    }
  };

  const config = getBadgeConfig();

  return (
    <Badge
      variant={config.variant}
      size={size}
      hasDot={config.hasDot}
      className={className}
    >
      {config.label}
    </Badge>
  );
};
