require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const path = require('path');

const gameState = require('./gameState');
const { CHALLENGES, validateAnswer, validatePassword, getAllChallenges } = require('./challenges');
const { executePythonCode, validateFibonacciOutput, runMultipleTests } = require('./codeExecutor');

// Initialize Express app
const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer);

const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// API Routes
app.post('/api/team/register', (req, res) => {
  const { teamName } = req.body;
  const result = gameState.registerTeam(teamName);
  res.json(result);
});

app.get('/api/team/:teamName', (req, res) => {
  const team = gameState.getTeam(req.params.teamName);
  if (!team) {
    return res.status(404).json({ error: 'Team not found' });
  }
  res.json({ teamProgress: team });
});

app.get('/api/challenges', (req, res) => {
  res.json({ challenges: getAllChallenges() });
});

app.post('/api/execute-code', async (req, res) => {
  const { code, challengeId, n = 5 } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required' });
  }

  if (challengeId !== 2) {
    return res.status(400).json({ error: 'Code execution only available for challenge 2' });
  }

  try {
    // Execute the code with the specified n
    const result = await executePythonCode(code, n);

    // If execution succeeded, validate the output
    if (result.success) {
      const isValid = validateFibonacciOutput(result.output, n);
      return res.json({
        success: true,
        output: result.output,
        error: '',
        isValid: isValid,
        n: n
      });
    } else {
      return res.json({
        success: false,
        output: result.output,
        error: result.error,
        isValid: false,
        n: n
      });
    }
  } catch (error) {
    return res.status(500).json({
      success: false,
      output: '',
      error: `Server error: ${error.message}`,
      isValid: false,
      n: n
    });
  }
});

app.post('/api/validate-code', async (req, res) => {
  const { code, challengeId } = req.body;

  if (!code || typeof code !== 'string') {
    return res.status(400).json({ error: 'Code is required' });
  }

  if (challengeId !== 2) {
    return res.status(400).json({ error: 'Code validation only available for challenge 2' });
  }

  try {
    // Generate 5 random test cases between 10 and 30
    const testCases = [];
    for (let i = 0; i < 5; i++) {
      testCases.push(10 + Math.floor(Math.random() * 21)); // Random between 10 and 30
    }

    // Run all test cases
    const testResult = await runMultipleTests(code, testCases);

    return res.json({
      passed: testResult.passed,
      results: testResult.results,
      testCases: testCases
    });
  } catch (error) {
    return res.status(500).json({
      passed: false,
      error: `Server error: ${error.message}`,
      results: []
    });
  }
});


// Socket.IO event handlers
io.on('connection', (socket) => {
  console.log(`Client connected: ${socket.id}`);

  // Team registration via WebSocket
  socket.on('registerTeam', (data) => {
    const { teamName } = data;
    const result = gameState.registerTeam(teamName);
    socket.emit('registrationResult', result);
  });

  // Challenge answer submission
  socket.on('submitAnswer', (data) => {
    const { teamName, challengeId, answer, incorrectAttempts = 0, partIndex } = data;

    // Check rate limiting
    if (!gameState.canSubmit(teamName)) {
      socket.emit('challengeResult', {
        challengeId,
        correct: false,
        message: 'Please wait before submitting again.'
      });
      return;
    }

    const challengeDef = CHALLENGES.find(c => c.id === challengeId);

    if (challengeDef && challengeDef.type === 'ctf') {
      const team = gameState.getTeam(teamName);
      const teamChallenge = team?.challenges.find(c => c.id === challengeId);
      const nextPart = (teamChallenge?.partsSolved || 0) + 1;
      const partNumber = parseInt(partIndex, 10);

      if (!Number.isInteger(partNumber) || partNumber !== nextPart) {
        socket.emit('challengeResult', {
          challengeId,
          correct: false,
          message: `Complete Part ${nextPart} next.`
        });
        return;
      }

      const validation = validateAnswer(challengeId, answer, partNumber);

      if (!validation.valid) {
        if (!validation.blocked) {
          gameState.incrementIncorrectAttempts(teamName, challengeId);
        }

        socket.emit('challengeResult', {
          challengeId,
          correct: false,
          message: validation.message
        });
        return;
      }

      const partUpdate = gameState.completeChallengePart(
        teamName,
        challengeId,
        partNumber,
        challengeDef.parts.length,
        validation.flag
      );

      if (!partUpdate.success) {
        socket.emit('challengeResult', {
          challengeId,
          correct: false,
          message: partUpdate.message || 'Unable to update part progress.'
        });
        return;
      }

      if (partUpdate.complete) {
        const updatedTeam = gameState.getTeam(teamName);
        const updatedChallenge = updatedTeam?.challenges.find(c => c.id === challengeId);
        const totalIncorrectAttempts = updatedChallenge?.incorrectAttempts || 0;
        const points = Math.max(1, 5 - totalIncorrectAttempts);

        gameState.updateChallenge(teamName, challengeId, validation.character, answer, points);

        socket.emit('challengeResult', {
          challengeId,
          correct: true,
          character: validation.character,
          points: points,
          message: 'All CTF parts complete! Letter revealed.'
        });
      } else {
        socket.emit('challengeResult', {
          challengeId,
          correct: true,
          partial: true,
          partIndex: partUpdate.partsSolved,
          partsSolved: partUpdate.partsSolved,
          partsTotal: challengeDef.parts.length,
          foundFlags: partUpdate.foundFlags,
          message: validation.message
        });
      }

      return;
    }

    // Validate answer
    const validation = validateAnswer(challengeId, answer);

    if (validation.valid) {
      // Get the team to check current incorrect attempts
      const team = gameState.getTeam(teamName);
      const challenge = team?.challenges.find(c => c.id === challengeId);

      // For connection games, use the client-provided incorrectAttempts
      // For regular challenges, use server-tracked attempts
      const totalIncorrectAttempts = incorrectAttempts > 0
        ? incorrectAttempts
        : (challenge?.incorrectAttempts || 0);

      // Calculate points: 5 points minus incorrect attempts
      const points = Math.max(1, 5 - totalIncorrectAttempts);

      // Update team progress with points
      gameState.updateChallenge(teamName, challengeId, validation.character, answer, points);

      socket.emit('challengeResult', {
        challengeId,
        correct: true,
        character: validation.character,
        points: points,
        message: validation.message
      });
    } else {
      // Increment incorrect attempts for regular challenges (not connection games)
      if (incorrectAttempts === 0) {
        gameState.incrementIncorrectAttempts(teamName, challengeId);
      }

      socket.emit('challengeResult', {
        challengeId,
        correct: false,
        message: validation.message
      });
    }
  });

  // Final password submission
  socket.on('submitPassword', (data) => {
    const { teamName, password } = data;

    const team = gameState.getTeam(teamName);
    if (!team) {
      socket.emit('passwordResult', {
        correct: false,
        message: 'Team not found'
      });
      return;
    }

    // Check if all challenges are solved
    const allSolved = team.challenges.every(c => c.solved);
    if (!allSolved) {
      socket.emit('passwordResult', {
        correct: false,
        message: 'Complete all challenges before attempting the final password.'
      });
      return;
    }

    // Validate password
    const isCorrect = validatePassword(password);
    gameState.incrementPasswordAttempts(teamName);

    if (isCorrect) {
      gameState.markVictory(teamName);

      socket.emit('passwordResult', {
        correct: true,
        message: 'SYSTEM BREACH SUCCESSFUL!'
      });

      // Broadcast victory
      io.emit('teamVictory', {
        teamName: team.teamName
      });
    } else {
      socket.emit('passwordResult', {
        correct: false,
        message: `Access Denied. Attempts: ${team.passwordAttempts}`
      });
    }
  });

  // Request current game state
  socket.on('requestGameState', (data) => {
    const { teamName } = data;
    const team = gameState.getTeam(teamName);

    if (team) {
      socket.emit('gameState', { teamData: team });
    }
  });

  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

// ============================================
// ADMIN ENDPOINTS
// ============================================

// Admin endpoint to reset game state (for testing and day-of reset)
app.post('/admin/reset', (req, res) => {
  const adminKey = req.body.adminKey || req.query.adminKey;
  
  // Set a secret admin key in .env file
  const ADMIN_KEY = process.env.ADMIN_KEY || 'CHANGE_ME_SECRET_KEY_2026';
  
  if (adminKey === ADMIN_KEY) {
    gameState.reset();
    console.log('🔴 ADMIN: Game state reset at', new Date().toISOString());
    
    res.json({ 
      success: true, 
      message: 'Game state reset successfully',
      timestamp: new Date().toISOString()
    });
  } else {
    console.warn('⚠️  Failed admin reset attempt');
    res.status(403).json({ 
      success: false, 
      message: 'Invalid admin key' 
    });
  }
});

// Admin endpoint to view all teams (for monitoring)
app.get('/admin/teams', (req, res) => {
  const adminKey = req.query.adminKey;
  const ADMIN_KEY = process.env.ADMIN_KEY || 'CHANGE_ME_SECRET_KEY_2026';
  
  if (adminKey === ADMIN_KEY) {
    const teams = gameState.getAllTeams();
    res.json({ 
      success: true, 
      totalTeams: teams.length,
      teams: teams 
    });
  } else {
    res.status(403).json({ 
      success: false, 
      message: 'Invalid admin key' 
    });
  }
});

// Start server
httpServer.listen(PORT, () => {
  console.log(`\n╔════════════════════════════════════╗`);
  console.log(`║    SYSTEM BREACH Server Active     ║`);
  console.log(`╚════════════════════════════════════╝\n`);
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} to start the game\n`);
});
