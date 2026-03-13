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
