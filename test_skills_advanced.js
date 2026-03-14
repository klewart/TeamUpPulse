import { identifyTrack } from './src/utils/skillUtils.js';

const testCases = [
  {
    name: "Pure Cybersecurity",
    skills: ['Penetration Testing', 'Wireshark', 'OWASP'],
    expected: "CYBERSECURITY ANALYST SPECIALIST"
  },
  {
    name: "Pure QA",
    skills: ['Selenium', 'Cypress', 'Unit Testing'],
    expected: "QA AUTOMATION ENGINEER SPECIALIST"
  },
  {
    name: "Pure Product Management",
    skills: ['Agile', 'Scrum', 'User Stories'],
    expected: "PRODUCT MANAGER SPECIALIST"
  },
  {
    name: "Creative Technologist Hybrid",
    skills: ['React', 'Figma', 'CSS', 'UI Design'],
    expected: "CREATIVITY TECHNOLOGIST"
  },
  {
    name: "SRE Hybrid",
    skills: ['Node.js', 'Docker', 'AWS', 'Express'],
    expected: "SITE RELIABILITY ENGINEER"
  },
  {
    name: "Senior Architect",
    skills: ['Java', 'Spring', 'System Design', 'Cloud Architecture'],
    expected: "BACKEND DEVELOPER ARCHITECT"
  },
  {
    name: "QA Lead",
    skills: ['Playwright', 'Jest', 'Team Leadership'],
    expected: "QA AUTOMATION ENGINEER LEAD"
  },
  {
    name: "Product Manager Lead",
    skills: ['Roadmap', 'Jira', 'Project Management'],
    expected: "PRODUCT MANAGER LEAD"
  }
];

console.log("--- ADVANCED SKILL RECOGNITION TEST (V11) ---");
testCases.forEach(tc => {
  const result = identifyTrack(tc.skills);
  const passed = result === tc.expected;
  console.log(`[${passed ? 'PASS' : 'FAIL'}] ${tc.name}`);
  console.log(`   Skills: ${tc.skills.join(', ')}`);
  console.log(`   Result: "${result}"`);
  if (!passed) console.log(`   Expected: "${tc.expected}"`);
});
