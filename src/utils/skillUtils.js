/**
 * AI-like Skill Recognition Utilities
 * Provides fuzzy matching for typos and track categorization.
 */

const SKILLS_DB = {
  frontend: [
    'react', 'vue', 'angular', 'svelte', 'next.js', 'nuxt.js', 'javascript', 'typescript',
    'html', 'css', 'tailwind', 'bootstrap', 'sass', 'less', 'redux', 'mobx', 'zustand',
    'vite', 'webpack', 'babel', 'ui design', 'ux design'
  ],
  backend: [
    'node.js', 'express', 'nest.js', 'python', 'django', 'flask', 'fastapi', 'go', 'golang',
    'ruby', 'rails', 'php', 'laravel', 'java', 'spring', 'kotlin', 'c#', '.net', 'asp.net',
    'sql', 'postgresql', 'mysql', 'mongodb', 'redis', 'firebase', 'supabase', 'graphql',
    'rest api', 'microservices', 'serverless', 'c++', 'c', 'rust'
  ],
  devops: [
    'docker', 'kubernetes', 'aws', 'azure', 'gcp', 'terraform', 'jenkins', 'ansible',
    'ci/cd', 'nginx', 'linux', 'bash', 'prometheus', 'grafana', 'cloud computing', 'sre'
  ],
  data_science: [
    'pandas', 'numpy', 'tensorflow', 'pytorch', 'scikit-learn', 'machine learning', 'ai',
    'deep learning', 'data analysis', 'computer vision', 'nlp', 'spark', 'hadoop', 'tableau'
  ],
  mobile: [
    'flutter', 'react native', 'swift', 'ios', 'android', 'dart', 'kotlin', 'objective-c',
    'mobile development', 'expo'
  ],
  designer: [
    'figma', 'adobe xd', 'sketch', 'ui design', 'ux design', 'product design', 'prototyping',
    'illustration', 'canva', 'framer'
  ],
  cybersecurity: [
    'penetration testing', 'ethical hacking', 'metasploit', 'wireshark', 'nmap', 'burp suite',
    'owasp', 'cryptography', 'network security', 'incident response', 'firewalls', 'siem'
  ],
  qa_testing: [
    'selenium', 'cypress', 'playwright', 'jest', 'mocha', 'chai', 'unit testing',
    'integration testing', 'automation', 'test planning', 'qa', 'appium'
  ],
  product_management: [
    'agile', 'scrum', 'jira', 'confluence', 'product strategy', 'user stories', 'roadmap',
    'market research', 'analytics', 'kanban', 'prds', 'stakeholder management'
  ]
};

// Seniority & Role Markers (Specialized keywords that modify the final label)
const SENIORITY_LEVELS = {
  architect: ['architecture', 'system design', 'scalability', 'distributed systems', 'cloud architecture'],
  lead: ['team leadership', 'mentorship', 'project management', 'agile lead', 'scrum master'],
  junior: ['learning', 'entry level', 'student']
};

// Flatten all skills for validation
const ALL_SKILLS = Object.values(SKILLS_DB).flat();

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
 * Identifies the user's track based on their skills with an affinity-based scoring system.
 */
export const identifyTrack = (skills = []) => {
  if (skills.length === 0) return 'Generalist';

  const normalizedSkills = skills.map(s => s.toLowerCase().trim());
  const scores = {
    frontend: 0,
    backend: 0,
    devops: 0,
    data_science: 0,
    mobile: 0,
    designer: 0,
    cybersecurity: 0,
    qa_testing: 0,
    product_management: 0
  };

  // Seniority/Modifier detection
  let seniority = '';
  Object.entries(SENIORITY_LEVELS).forEach(([level, keywords]) => {
    if (normalizedSkills.some(skill => keywords.includes(skill))) {
      // Prioritize Architect over Lead, etc.
      if (level === 'architect') seniority = 'ARCHITECT';
      else if (level === 'lead' && seniority !== 'ARCHITECT') seniority = 'LEAD';
    }
  });

  normalizedSkills.forEach(skill => {
    Object.keys(SKILLS_DB).forEach(track => {
      if (SKILLS_DB[track].some(s => s === skill || skill.includes(s))) {
        scores[track]++;
      }
    });
  });

  const totalPoints = Object.values(scores).reduce((a, b) => a + b, 0);
  if (totalPoints === 0) return 'Explorer';

  // Sort tracks by score descending
  const sortedTracks = Object.entries(scores)
    .filter(([_, score]) => score > 0)
    .sort((a, b) => b[1] - a[1]);

  const [topTrack, topScore] = sortedTracks[0];

  // Role Synonyms / Hybrid Heuristics
  const has = (track) => scores[track] > 0;
  
  // 1. Creative Technologist (Frontend + Design)
  if (has('frontend') && has('designer') && (scores.frontend + scores.designer) / totalPoints > 0.6) {
    return seniority ? `CREATIVE ${seniority}` : 'CREATIVITY TECHNOLOGIST';
  }

  // 2. Site Reliability Engineer (Backend + DevOps)
  if (has('backend') && has('devops') && (scores.backend + scores.devops) / totalPoints > 0.6) {
    return seniority ? `PRINCIPAL SRE ${seniority}` : 'SITE RELIABILITY ENGINEER';
  }

  // Helper to format labels
  const formatLabel = (track) => {
    const labels = {
      frontend: 'FRONTEND DEVELOPER',
      backend: 'BACKEND DEVELOPER',
      devops: 'DEVOPS ENGINEER',
      data_science: 'DATA SCIENTIST',
      mobile: 'MOBILE DEVELOPER',
      designer: 'UI/UX DESIGNER',
      cybersecurity: 'CYBERSECURITY ANALYST',
      qa_testing: 'QA AUTOMATION ENGINEER',
      product_management: 'PRODUCT MANAGER'
    };
    return labels[track] || 'GENERALIST';
  };

  // Logic: 
  // 1. Specialist Check
  if (topScore / totalPoints >= 0.65) {
    const label = formatLabel(topTrack);
    return seniority ? `${label} ${seniority}` : `${label} SPECIALIST`;
  }

  // 2. Fullstack check (Frontend + Backend balance)
  if (scores.frontend > 0 && scores.backend > 0 && (scores.frontend + scores.backend) / totalPoints > 0.6) {
    const ratio = scores.frontend / (scores.frontend + scores.backend);
    if (ratio >= 0.4 && ratio <= 0.6) return 'FULLSTACK DEVELOPER';
  }

  // 3. Hybrid check (Top two tracks are significant)
  if (sortedTracks.length >= 2) {
    const [secondTrack, secondScore] = sortedTracks[1];
    if (secondScore / topScore > 0.7) {
      return `HYBRID: ${topTrack.toUpperCase()} / ${secondTrack.toUpperCase()}`;
    }
  }

  // 4. Default to top track + Focused
  return `${formatLabel(topTrack)} FOCUSED`;
};
