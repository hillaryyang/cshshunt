const FINAL_PASSWORD = 'BINARY';

const CHALLENGES = [
  {
    id: 1,
    title: 'Tech Trailblazers',
    subtitle: 'Match the computer science pioneer to their achievement',
    description: `Click the name on the left, then the corresponding description!`,
    answer: '',
    character: 'B',
    type: 'connection',
    connections: [
      { person: 'Alan Turing', achievement: 'Contributed to the Allied victory in WWII' },
      { person: 'Grace Hopper', achievement: 'Created COBOL, one of the first high-level programming languages' },
      { person: 'Donald Knuth', achievement: 'Introduced TeX typesetting program' },
      { person: 'Ada Lovelace', achievement: 'First computer programmer' },
      { person: 'Linus Torvalds', achievement: 'Built Linux operating system and Git version control' },
      { person: 'Katherine Johnson', achievement: 'Calculated orbital mechanics for the first U.S. crewed spaceflights' },
      { person: 'Vint Cerf', achievement: 'Co-invented TCP/IP protocols' },
      { person: 'Larry Page', achievement: 'Co-founder of Google' }
    ]
  },
  {
    id: 2,
    title: 'Fibonacci Functions',
    subtitle: 'Python coding challenge',
    description: `Implement the \`fibonacci(n)\` function (in Python) that prints the first \`n\` Fibonacci numbers (one per line).

**Sample Test Case:** Click "Run Code" to test on \`fibonacci(5)\`

Expected output for \`n=5\` (5th Fibonacci number):
\`\`\`output
0
1
1
2
3
\`\`\`
**Submission:** After passing the sample, click "Submit Answer" to test your code!`,
    answer: 'CODE_CHALLENGE',
    character: 'I',
    type: 'code',
  },
  {
    id: 3,
    title: 'Crossword Conundrums',
    subtitle: 'Programming word puzzle',
    description: `Solve this (somewhat) CS-related crossword puzzle!`,
    answer: 'CROSSWORD_COMPLETE',
    character: 'N',
    type: 'crossword',
    crossword: {
      size: 5,
      blackSquares: [[0, 0], [4, 4]],
      clues: {
        across: [
          { number: 1, row: 0, col: 1, length: 4, answer: 'WALT', clue: 'Animator Disney' },
          { number: 5, row: 1, col: 0, length: 5, answer: 'CHOIR', clue: 'Ambassadors or Accents' },
          { number: 6, row: 2, col: 0, length: 5, answer: 'SERVE', clue: 'bundle exec jekyll _____, command to build/run a site locally' },
          { number: 7, row: 3, col: 0, length: 5, answer: 'HATES', clue: 'Does not like at all' },
          { number: 8, row: 4, col: 0, length: 4, answer: 'STAR', clue: 'Five-pointed polygon' }
        ],
        down: [
          { number: 1, row: 0, col: 1, length: 5, answer: 'WHEAT', clue: '21 million bushels of this crop were produced in Indiana last year' },
          { number: 2, row: 0, col: 2, length: 5, answer: 'AORTA', clue: 'Major blood vessel' },
          { number: 3, row: 0, col: 3, length: 5, answer: 'LIVER', clue: 'Meat that may be "chopped"' },
          { number: 4, row: 0, col: 4, length: 4, answer: 'TRES', clue: 'Uno + dos' },
          { number: 5, row: 1, col: 0, length: 4, answer: 'CSHS', clue: 'This club' }
        ]
      }
    }
  },
  {
    id: 4,
    title: 'Flag Fun',
    subtitle: 'Multi-part CTF challenge',
    description: `Complete all four CTF mini challenges, then put your answers together!`,
    answer: 'CTF_MULTI',
    character: 'A',
    type: 'ctf',
    parts: [
      {
        id: 1,
        title: 'Part 1: Blend In',
        description: `Subject: Following up on today's meeting

Hi team,

Just wanted to follow up on today's meeting. There were no major action items, but please review when you get a chance in case I missed anything.

If there are updates later today, feel free to let me know. Thanks a bunch of oats! [[hidden:CTF_TWENTYFIVE]]

Thanks,
Arjun`,
        answer: 'CTF_TWENTYFIVE',
        isFlag: true,
        available: true
      },
      {
        id: 2,
        title: 'Part 2: Inspect',
        description: `This website is pretty cool, right? You should dig deeper!`,
        answer: 'CTF_TWOZEROFOUREIGHT',
        isFlag: true,
        available: true
      },
      {
        id: 3,
        title: 'Part 3: ABCDE or QWERTY?',
        description: `What could this mean?`,
        answer: 'CTF_FIFTYFIVE',
        type: 'image',
        imagePath: '/images/ctf-part3.png',
        isFlag: true,
        available: true
      },
      {
        id: 4,
        title: 'Part 4: Eight Squared',
        description: `This string will help: \`VFdPU0VWRU5aRVJPRUlHSFQ=\``,
        answer: 'CTF_TWOSEVENZEROEIGHT',
        isFlag: true,
        available: true
      },
      {
        id: 5,
        title: 'Final Answer',
        description: `Put it all together! Think places.`,
        answer: 'DUBAI',
        isFlag: false,
        available: true
      }
    ]
  },
  {
    id: 5,
    title: 'Tournament Troubles',
    subtitle: 'Credit: MIT puzzle hunt',
    description: `Please come up to the front to get this puzzle!`,
    answer: 'DRAFT',
    character: 'R',
  },
  {
    id: 6,
    title: 'Leadership Longevity',
    subtitle: 'Your last challenge...',
    description: `The answer to this challenge is the **sum of your seven CSHS officers' ages**`,
    answer: '117',
    character: 'Y',
  }
];

// ========================================
// VALIDATION - Don't edit below this line
// ========================================

// Validate answer (case-insensitive)
function validateAnswer(challengeId, answer, partIndex) {
  const challenge = CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) {
    return { valid: false, message: 'Invalid challenge ID' };
  }

  // Special handling for code-type challenges
  if (challenge.type === 'code') {
    // Code challenges are pre-validated via /api/execute-code
    // The client only submits after validation succeeds
    const normalizedAnswer = answer.trim().toUpperCase();
    if (normalizedAnswer === 'CODE_CHALLENGE') {
      return {
        valid: true,
        character: challenge.character,
        message: 'Code challenge completed! Security bypassed.'
      };
    } else {
      return {
        valid: false,
        message: 'Please run and validate your code first.'
      };
    }
  }

  // Special handling for crossword-type challenges
  if (challenge.type === 'crossword') {
    // Parse the submitted grid
    try {
      const userGrid = JSON.parse(answer);
      const crossword = challenge.crossword;

      // Check all across answers
      for (const clue of crossword.clues.across) {
        let userAnswer = '';
        for (let i = 0; i < clue.length; i++) {
          const cell = userGrid[clue.row]?.[clue.col + i];
          userAnswer += (cell || '').toUpperCase();
        }
        if (userAnswer !== clue.answer.toUpperCase()) {
          return {
            valid: false,
            message: `Check ${clue.number}-Across: "${clue.clue}"`
          };
        }
      }

      // Check all down answers
      for (const clue of crossword.clues.down) {
        let userAnswer = '';
        for (let i = 0; i < clue.length; i++) {
          const cell = userGrid[clue.row + i]?.[clue.col];
          userAnswer += (cell || '').toUpperCase();
        }
        if (userAnswer !== clue.answer.toUpperCase()) {
          return {
            valid: false,
            message: `Check ${clue.number}-Down: "${clue.clue}"`
          };
        }
      }

      // All answers correct!
      return {
        valid: true,
        character: challenge.character,
        message: 'Perfect! All crossword answers correct!'
      };
    } catch (e) {
      return {
        valid: false,
        message: 'Invalid crossword data.'
      };
    }
  }

  // Special handling for connection-type challenges
  if (challenge.type === 'connection') {
    // Check if this is a client-validated completion (just the character)
    const trimmedAnswer = answer.trim().toUpperCase();
    if (trimmedAnswer === challenge.character.toUpperCase()) {
      return {
        valid: true,
        character: challenge.character,
        message: 'Perfect! All connections correct!'
      };
    }

    // Otherwise, try to validate as full connection data
    try {
      const userConnections = JSON.parse(answer);
      const correctConnections = challenge.connections;

      // Check if correct number of connections
      if (userConnections.length !== correctConnections.length) {
        return {
          valid: false,
          message: `Need all 8 connections (you have ${userConnections.length})`
        };
      }

      // Check if all connections are correct
      let correctCount = 0;
      for (const correct of correctConnections) {
        const userMatch = userConnections.find(uc => uc.person === correct.person);
        if (userMatch && userMatch.achievement === correct.achievement) {
          correctCount++;
        }
      }

      if (correctCount === correctConnections.length) {
        return {
          valid: true,
          character: challenge.character,
          message: 'Perfect! All connections correct!'
        };
      } else {
        return {
          valid: false,
          message: `${correctCount}/8 correct. Keep trying!`
        };
      }
    } catch (e) {
      return {
        valid: false,
        message: 'Invalid answer format.'
      };
    }
  }

  // Special handling for multi-part CTF challenges
  if (challenge.type === 'ctf') {
    const partNumber = parseInt(partIndex, 10);
    if (!Number.isInteger(partNumber)) {
      return { valid: false, message: 'Invalid part number.' };
    }

    const parts = challenge.parts || [];
    const part = parts[partNumber - 1];
    if (!part) {
      return { valid: false, message: 'Invalid part.' };
    }

    if (part.available === false) {
      return { valid: false, blocked: true, message: 'This part is not available yet.' };
    }

    const normalizedAnswer = answer.trim().toUpperCase();
    const normalizedCorrect = part.answer.trim().toUpperCase();

    if (normalizedAnswer === normalizedCorrect) {
      const isFlag = part.isFlag !== false;
      return {
        valid: true,
        partIndex: partNumber,
        character: challenge.character,
        flag: isFlag ? part.answer : null,
        message: `${isFlag ? 'Flag' : 'Answer'} accepted for Part ${partNumber}.`
      };
    }

    return {
      valid: false,
      message: `Incorrect flag for Part ${partNumber}.`
    };
  }

  // Standard text answer validation
  const normalizedAnswer = answer.trim().toUpperCase();
  const normalizedCorrect = challenge.answer.toUpperCase();

  if (normalizedAnswer === normalizedCorrect) {
    return {
      valid: true,
      character: challenge.character,
      message: 'Access Granted. Security layer bypassed.'
    };
  }

  return {
    valid: false,
    message: 'Access Denied. Incorrect code.'
  };
}

// Validate final password
function validatePassword(password) {
  const normalized = password.trim().toUpperCase();
  return normalized === FINAL_PASSWORD.toUpperCase();
}

// Get challenge by ID (without answer)
function getChallenge(challengeId) {
  const challenge = CHALLENGES.find(c => c.id === challengeId);
  if (!challenge) return null;

  return sanitizeChallenge(challenge);
}

// Get all challenges (without answers)
function getAllChallenges() {
  return CHALLENGES.map(challenge => sanitizeChallenge(challenge));
}

function sanitizeChallenge(challenge) {
  const { answer, ...safeChallenge } = challenge;
  if (safeChallenge.parts) {
    safeChallenge.parts = safeChallenge.parts.map(({ answer: partAnswer, ...part }) => part);
  }
  return safeChallenge;
}

module.exports = {
  CHALLENGES,
  FINAL_PASSWORD,
  validateAnswer,
  validatePassword,
  getChallenge,
  getAllChallenges
};
