// Utility function to calculate the match between a user's skills and a team's required skills
export const calculateSkillMatch = (userSkills = [], teamRequiredSkills = []) => {
  if (!teamRequiredSkills || teamRequiredSkills.length === 0) {
    return {
      score: 100,
      matchedSkills: [],
      missingSkills: []
    };
  }

  if (!userSkills || userSkills.length === 0) {
    return {
      score: 0,
      matchedSkills: [],
      missingSkills: [...teamRequiredSkills]
    };
  }

  // Normalize arrays for case-insensitive comparison
  const normalizedUserSkills = userSkills.map(s => s.toLowerCase().trim());
  const normalizedTeamSkills = teamRequiredSkills.map(s => s.toLowerCase().trim());

  const matchedSkills = [];
  const missingSkills = [];

  teamRequiredSkills.forEach((originalSkill, index) => {
    const normalizedReqSkill = normalizedTeamSkills[index];
    if (normalizedUserSkills.includes(normalizedReqSkill)) {
      matchedSkills.push(originalSkill);
    } else {
      missingSkills.push(originalSkill);
    }
  });

  const score = Math.round((matchedSkills.length / teamRequiredSkills.length) * 100);

  return {
    score,
    matchedSkills,
    missingSkills
  };
};

// Categorize a set of skills into a broad "frontend", "backend", or "fullstack" label.
export const categorizeSkillset = (skills = []) => {
  const frontendKeywords = [
    'react', 'vue', 'angular', 'html', 'css', 'javascript', 'typescript',
    'tailwind', 'bootstrap', 'sass', 'scss', 'styled', 'material-ui', 'chakra',
    'next', 'gatsby', 'webpack', 'vite', 'redux', 'mobx', 'formik', 'storybook'
  ];

  const backendKeywords = [
    'node', 'express', 'django', 'flask', 'rails', 'ruby', 'python', 'java',
    'spring', 'c#', 'dotnet', 'go', 'golang', 'rust', 'kotlin', 'php', 'laravel',
    'sql', 'postgres', 'postgresql', 'mysql', 'mongodb', 'firebase', 'serverless',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes'
  ];

  const normalizedSkills = (skills || []).map((s) => s.toLowerCase().trim());

  let frontendCount = 0;
  let backendCount = 0;

  normalizedSkills.forEach((skill) => {
    // Count keyword occurrences
    if (frontendKeywords.some((kw) => skill.includes(kw))) frontendCount += 1;
    if (backendKeywords.some((kw) => skill.includes(kw))) backendCount += 1;
  });

  if (backendCount > frontendCount) return 'backend';
  if (frontendCount > backendCount) return 'frontend';
  return 'fullstack';
};
