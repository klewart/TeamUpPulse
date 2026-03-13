import React from 'react';
import { User, Quote } from 'lucide-react';
import StarRating from './StarRating';

const FeedbackCard = ({ feedback }) => {
  const { reviewerName, reviewedUserName, rating, comment, createdAt } = feedback;

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Recently';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200">
      <div className="flex justify-between items-start mb-4">
        
        {/* Reviewer Info */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-700 font-bold border-2 border-white shadow-sm">
            {reviewerName ? reviewerName.charAt(0).toUpperCase() : <User className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm leading-tight">{reviewerName}</h4>
            <div className="flex items-center gap-1.5 mt-0.5">
               <span className="text-xs font-semibold text-slate-500 uppercase tracking-widest bg-slate-100 px-1.5 rounded">Reviewed</span>
               <span className="text-xs font-bold text-slate-700">{reviewedUserName}</span>
            </div>
          </div>
        </div>

        {/* Timestamp */}
        <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
          {formatDate(createdAt)}
        </span>
      </div>

      {/* Static Stars */}
      <div className="mb-3 px-1">
        <StarRating rating={rating} readOnly={true} />
      </div>

      {/* Comment */}
      {comment && (
        <div className="relative bg-slate-50 rounded-xl p-4 border border-slate-100 mt-2">
          <Quote className="absolute top-4 left-4 w-6 h-6 text-slate-200 fill-slate-200 rotate-180" />
          <p className="text-sm text-slate-700 leading-relaxed px-6 pb-2 relative z-10 italic">
            "{comment}"
          </p>
        </div>
      )}
    </div>
  );
};

export default FeedbackCard;
