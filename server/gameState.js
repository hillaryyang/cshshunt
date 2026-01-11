// In-memory game state management
class GameState {
  constructor() {
    this.teams = new Map(); // teamName -> teamData
    this.lastSubmission = new Map(); // teamName -> timestamp (for rate limiting)
  }

  // Register a new team
  registerTeam(teamName) {
    if (!teamName || teamName.trim().length === 0) {
      return { success: false, message: 'Team name cannot be empty' };
    }

    const sanitizedName = teamName.trim().substring(0, 50); // Limit length

    if (this.teams.has(sanitizedName)) {
      return { success: false, message: 'Team name already exists. Please choose another name.' };
    }

    const teamData = {
      teamName: sanitizedName,
      challenges: Array.from({ length: 6 }, (_, i) => ({
        id: i + 1,
        solved: false,
        answer: null,
        character: null,
        points: 0,
        incorrectAttempts: 0,
        partsSolved: 0,
        foundFlags: []
      })),
      totalPoints: 0,
      passwordAttempts: 0,
      finished: false
    };

    this.teams.set(sanitizedName, teamData);
    return { success: true, message: 'Team registered successfully', teamData };
  }

  // Get team data
  getTeam(teamName) {
    return this.teams.get(teamName);
  }

  // Update challenge progress
  updateChallenge(teamName, challengeId, character, answer, points = 5) {
    const team = this.teams.get(teamName);
    if (!team) return false;

    const challenge = team.challenges.find(c => c.id === challengeId);
    if (!challenge) return false;

    challenge.solved = true;
    challenge.answer = answer;
    challenge.character = character;
    challenge.solvedAt = Date.now();
    challenge.points = points;

    // Update total points
    team.totalPoints = team.challenges.reduce((sum, c) => sum + c.points, 0);

    return true;
  }

  // Increment incorrect attempts for a challenge
  incrementIncorrectAttempts(teamName, challengeId) {
    const team = this.teams.get(teamName);
    if (!team) return false;

    const challenge = team.challenges.find(c => c.id === challengeId);
    if (!challenge || challenge.solved) return false;

    challenge.incorrectAttempts++;
    return true;
  }

  // Mark a CTF challenge part as solved
  completeChallengePart(teamName, challengeId, partIndex, totalParts, flag) {
    const team = this.teams.get(teamName);
    if (!team) return { success: false, message: 'Team not found' };

    const challenge = team.challenges.find(c => c.id === challengeId);
    if (!challenge) return { success: false, message: 'Challenge not found' };

    const nextPart = (challenge.partsSolved || 0) + 1;
    if (partIndex !== nextPart) {
      return { success: false, message: `Complete Part ${nextPart} next.` };
    }

    if (!Array.isArray(challenge.foundFlags)) {
      challenge.foundFlags = [];
    }

    challenge.partsSolved = nextPart;
    if (flag) {
      const normalizedFlag = String(flag).trim();
      if (normalizedFlag.length > 0 && !challenge.foundFlags.includes(normalizedFlag)) {
        challenge.foundFlags.push(normalizedFlag);
      }
    }
    const complete = totalParts ? challenge.partsSolved >= totalParts : false;

    return {
      success: true,
      partsSolved: challenge.partsSolved,
      foundFlags: challenge.foundFlags,
      complete: complete
    };
  }

  // Mark team as finished
  markVictory(teamName) {
    const team = this.teams.get(teamName);
    if (!team) return false;

    team.finished = true;
    return true;
  }

  // Increment password attempts
  incrementPasswordAttempts(teamName) {
    const team = this.teams.get(teamName);
    if (!team) return;
    team.passwordAttempts++;
  }

  // Check rate limiting (1 submission per second per team)
  canSubmit(teamName) {
    const lastTime = this.lastSubmission.get(teamName) || 0;
    const now = Date.now();
    if (now - lastTime < 1000) {
      return false;
    }
    this.lastSubmission.set(teamName, now);
    return true;
  }

  // Get all teams (for debugging)
  getAllTeams() {
    return Array.from(this.teams.values());
  }

  // Reset game state (for testing)
  reset() {
    this.teams.clear();
    this.lastSubmission.clear();
  }
}

module.exports = new GameState();
