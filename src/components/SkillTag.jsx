import React from 'react';
import { X } from 'lucide-react';

const SkillTag = ({ skill, onRemove }) => {
  return (
    <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm font-medium bg-blue-50 text-blue-700 border border-blue-100">
      {skill}
      {onRemove && (
        <button
          onClick={(e) => {
            e.preventDefault();
            onRemove(skill);
          }}
          className="hover:bg-blue-200 hover:text-blue-900 rounded-full p-0.5 transition-colors focus:outline-none"
          type="button"
          aria-label={`Remove ${skill}`}
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </span>
  );
};

export default SkillTag;
