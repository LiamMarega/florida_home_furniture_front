'use client';

import React from 'react';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Edit, Trash2, Star } from 'lucide-react';
import { UserAddress } from '../types';

interface AddressCardProps {
  address: UserAddress;
  onEdit: (address: UserAddress) => void;
  onDelete: (id: string) => void;
  onSetDefault: (id: string) => void;
}

export function AddressCard({
  address,
  onEdit,
  onDelete,
  onSetDefault,
}: AddressCardProps) {
  const fullAddress = [
    address.street,
    address.streetLine2,
    `${address.city}, ${address.state} ${address.zipCode}`,
    address.country,
  ]
    .filter(Boolean)
    .join(', ');

  return (
    <Card className="h-full flex flex-col">
      <CardContent className="flex-1 p-4 md:p-6">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-brand-secondary" aria-hidden="true" />
            <h3 className="font-semibold text-brand-dark-blue font-tango-sans">
              {address.nickname || 'Address'}
            </h3>
          </div>
          {address.isDefault && (
            <Badge
              variant="secondary"
              className="bg-green-100 text-green-800 border-green-200"
              aria-label="Default address"
            >
              <Star className="h-3 w-3 mr-1" />
              Default
            </Badge>
          )}
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          {fullAddress}
        </p>
        {address.phoneNumber && (
          <p className="text-xs text-muted-foreground">Phone: {address.phoneNumber}</p>
        )}
      </CardContent>
      <CardFooter className="flex flex-wrap gap-2 p-4 md:p-6 pt-0 border-t">
        <Button
          variant="outline"
          size="sm"
          onClick={() => onEdit(address)}
          className="flex-1 md:flex-none"
          aria-label={`Edit ${address.nickname || 'address'}`}
        >
          <Edit className="h-4 w-4 mr-1" />
          Edit
        </Button>
        {!address.isDefault && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onSetDefault(address.id)}
            className="flex-1 md:flex-none"
            aria-label={`Set ${address.nickname || 'address'} as default`}
          >
            <Star className="h-4 w-4 mr-1" />
            Set Default
          </Button>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onDelete(address.id)}
          className="flex-1 md:flex-none text-destructive hover:text-destructive"
          aria-label={`Delete ${address.nickname || 'address'}`}
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>
      </CardFooter>
    </Card>
  );
}

