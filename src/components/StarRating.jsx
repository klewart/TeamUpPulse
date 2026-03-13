import React, { useState } from 'react';
import { Star } from 'lucide-react';

const StarRating = ({ rating, onRatingChange, readOnly = false }) => {
  const [hoverRating, setHoverRating] = useState(0);

  return (
    <div className="flex items-center gap-1">
      {[1, 2, 3, 4, 5].map((starValue) => {
        const isFilled = (hoverRating || rating) >= starValue;
        
        return (
          <button
            key={starValue}
            type="button"
            disabled={readOnly}
            onClick={() => onRatingChange && onRatingChange(starValue)}
            onMouseEnter={() => !readOnly && setHoverRating(starValue)}
            onMouseLeave={() => !readOnly && setHoverRating(0)}
            className={`
              p-1 transition-all
              ${readOnly ? 'cursor-default' : 'cursor-pointer hover:scale-110'}
            `}
            aria-label={`Rate ${starValue} stars`}
          >
            <Star 
              className={`w-6 h-6 transition-colors ${
                isFilled 
                  ? 'fill-amber-400 text-amber-400 drop-shadow-sm' 
                  : 'fill-slate-100 text-slate-300'
              }`} 
            />
          </button>
        );
      })}
    </div>
  );
};

export default StarRating;
