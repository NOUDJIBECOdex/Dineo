import { Clock, MapPin, Phone, Sparkles } from 'lucide-react';
import React from 'react';
import type { Restaurant } from '../../types/restaurant';

interface RestaurantHeaderProps {
  restaurant: Restaurant;
}

export const RestaurantHeader: React.FC<RestaurantHeaderProps> = ({ restaurant }) => {
  return (
    <header className="relative bg-white border-b border-slate-200">
      {/* Cover Image */}
      <div className="relative h-40 sm:h-52 w-full overflow-hidden bg-slate-900">
        <img
          src={restaurant.coverImageUrl}
          alt={restaurant.name}
          className="h-full w-full object-cover opacity-80"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-slate-950/30 to-transparent" />
        
        {/* Open/Closed Badge */}
        <div className="absolute top-4 right-4">
          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-500/90 text-white backdrop-blur-md shadow-sm">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse" />
            Ouvert actuellement
          </span>
        </div>
      </div>

      {/* Profile & Info Container */}
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pb-4">
        <div className="flex flex-col sm:flex-row sm:items-end gap-4 -mt-12 sm:-mt-14 mb-3 relative z-10">
          {/* Logo */}
          <div className="h-24 w-24 sm:h-28 sm:w-28 rounded-2xl overflow-hidden border-4 border-white shadow-xl bg-white shrink-0">
            <img
              src={restaurant.logoUrl}
              alt={restaurant.name}
              className="h-full w-full object-cover"
            />
          </div>

          {/* Restaurant Names */}
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
                {restaurant.name}
              </h1>
              <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-800">
                <Sparkles className="w-3 h-3 text-amber-600" />
                Dineo Verified
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-600 mt-1 line-clamp-1">
              {restaurant.tagline}
            </p>
          </div>
        </div>

        {/* Details & Metadata */}
        <div className="flex flex-wrap items-center gap-y-2 gap-x-4 pt-2 border-t border-slate-100 text-xs text-slate-500">
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>{restaurant.address}, {restaurant.city}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <span>{restaurant.openingHours}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <a href={`tel:${restaurant.phone}`} className="hover:text-amber-600 transition-colors">
              {restaurant.phone}
            </a>
          </div>
        </div>
      </div>
    </header>
  );
};
