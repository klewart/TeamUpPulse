/**
 * AI-like Skill Recognition Utilities
 * Provides fuzzy matching for typos and track categorization.
 */

const SKILLS_DB = {
  frontend: [
    'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt.js', 'javascript', 'typescript',
    'html', 'css', 'tailwind', 'bootstrap', 'sass', 'less', 'redux', 'mobx', 'zustand',
    'vite', 'webpack', 'babel', 'flutter', 'react native', 'ionic', 'ui design', 'ux design',
    'figma', 'adobe xd', 'canvas', 'svg', 'three.js', 'd3.js', 'framer motion'
  ],
  backend: [
    'node.js', 'express', 'nest.js', 'python', 'django', 'flask', 'fastapi', 'go', 'golang',
    'ruby', 'rails', 'php', 'laravel', 'java', 'spring', 'kotlin', 'c#', '.net', 'asp.net',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'firebase', 'supabase', 'graphql',
    'rest api', 'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'jenkins',
    'c++', 'c', 'rust', 'elixir', 'phoenix', 'microservices', 'serverless'
  ]
};

// Flatten skills for validation
const ALL_SKILLS = [...SKILLS_DB.frontend, ...SKILLS_DB.backend];

/**
 * Levenshtein distance algorithm for fuzzy matching
 */
const getLevenshteinDistance = (a, b) => {
  const matrix = [];
  for (let i = 0; i <= b.length; i++) matrix[i] = [i];
  for (let j = 0; j <= a.length; j++) matrix[0][j] = j;

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1
        );
      }
    }
  }
  return matrix[b.length][a.length];
};

/**
 * Validates a skill input and suggests corrections
 */
export const validateSkill = (input) => {
  const query = input.toLowerCase().trim();
  if (!query) return { valid: false, message: 'Skill cannot be empty' };

  // Check exact match first (case-insensitive)
  const exactMatch = ALL_SKILLS.find(s => s === query);
  if (exactMatch) {
    return { valid: true, canonical: exactMatch };
  }

  // Fuzzy match
  let closestMatch = null;
  let minDistance = 3; // Threshold for typo recognition (max 2 characters off)

  for (const skill of ALL_SKILLS) {
    const distance = getLevenshteinDistance(query, skill);
    if (distance < minDistance) {
      minDistance = distance;
      closestMatch = skill;
    }
  }

  if (closestMatch) {
    return { 
      valid: false, 
      isTypo: true, 
      suggestion: closestMatch,
      message: `Did you mean "${closestMatch}"? Please use the correct spelling.` 
    };
  }

  return { 
    valid: false, 
    isUnknown: true,
    message: `"${input}" is not a recognized technical skill. Please check your spelling.` 
  };
};

/**
 * Identifies the user's track based on their skills
 */
export const identifyTrack = (skills = []) => {
  if (skills.length === 0) return 'Generalist';

  const normalizedSkills = skills.map(s => s.toLowerCase().trim());
  let frontendCount = 0;
  let backendCount = 0;

  normalizedSkills.forEach(skill => {
    if (SKILLS_DB.frontend.includes(skill)) frontendCount++;
    if (SKILLS_DB.backend.includes(skill)) backendCount++;
  });

  if (frontendCount > 0 && backendCount > 0) {
    // If skills are balanced (ratio within 40-60%), call them Fullstack
    const total = frontendCount + backendCount;
    const feRatio = frontendCount / total;
    if (feRatio >= 0.4 && feRatio <= 0.6) return 'Fullstack Developer';
    
    return frontendCount > backendCount ? 'Frontend Focused' : 'Backend Focused';
  }

  if (frontendCount > 0) return 'Frontend Developer';
  if (backendCount > 0) return 'Backend Developer';

  return 'Generalist';
};
