/**
 * Main Game Logic
 * Handles the game interface, challenge interactions, and real-time updates
 */

class Game {
  constructor() {
    this.teamName = null;
    this.teamData = null;
    this.challenges = [];
    this.expandedChallenges = new Set(); // Will be set based on game state
    this.forceExpandedChallengeId = null;
    this.scrollAnchor = null;

    this.init();
  }

  /**
   * Initialize the game
   */
  async init() {
    // Check if team is registered
    this.teamName = localStorage.getItem('teamName');

    if (!this.teamName) {
      // Redirect to registration page
      window.location.href = '/index.html';
      return;
    }

    // Display team name
    document.getElementById('team-name').textContent = this.teamName;

    // Load challenges from server
    await this.loadChallenges();

    // Request current game state
    socketClient.requestGameState(this.teamName);

    // Set up socket event listeners
    this.setupSocketListeners();

    // Set up UI event listeners
    this.setupUIListeners();
  }

  /**
   * Load challenges from server
   */
  async loadChallenges() {
    try {
      const response = await fetch('/api/challenges');
      const data = await response.json();
      this.challenges = data.challenges;
      console.log('Challenges loaded:', this.challenges);
    } catch (error) {
      console.error('Error loading challenges:', error);
      Terminal.showError('Failed to load challenges');
    }
  }

  /**
   * Set up socket event listeners
   */
  setupSocketListeners() {
    // Game state updates
    socketClient.onGameState((data) => {
      console.log('Game state received:', data);
      this.teamData = data.teamData;
      this.renderGame();
    });

    // Challenge submission results
    socketClient.onChallengeResult((data) => {
      console.log('Challenge result:', data);
      this.handleChallengeResult(data);
    });

    // Password submission results
    socketClient.onPasswordResult((data) => {
      console.log('Password result:', data);
      this.handlePasswordResult(data);
    });

    // Leaderboard updates
    socketClient.onLeaderboardUpdate((data) => {
      console.log('Leaderboard updated');
    });

    // Connection status
    socketClient.onConnectionStatusChanged((data) => {
      if (data.connected) {
        console.log('Reconnected - requesting game state');
        socketClient.requestGameState(this.teamName);
      }
    });
  }

  /**
   * Set up UI event listeners
   */
  setupUIListeners() {
    // Final password submission
    const passwordBtn = document.getElementById('submit-password-btn');
    const passwordInput = document.getElementById('final-password-input');

    passwordBtn.addEventListener('click', () => {
      this.submitFinalPassword();
    });

    passwordInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.submitFinalPassword();
      }
    });
  }

  /**
   * Render the entire game interface
   */
  renderGame() {
    if (!this.teamData) return;

    // Update expanded challenges based on game state
    this.updateExpandedChallenges();

    this.renderPasswordDisplay();
    this.renderProgress();
    this.renderChallenges();
    this.checkFinalPasswordUnlock();
    this.restoreScrollAnchor();
  }

  /**
   * Update which challenges should be expanded
   */
  updateExpandedChallenges() {
    if (this.forceExpandedChallengeId) {
      const forcedChallenge = this.teamData.challenges.find(
        (challenge) => challenge.id === this.forceExpandedChallengeId && !challenge.solved
      );
      if (forcedChallenge) {
        this.expandedChallenges.clear();
        this.expandedChallenges.add(this.forceExpandedChallengeId);
        return;
      }
      this.forceExpandedChallengeId = null;
    }

    // Find the first unsolved challenge
    const firstUnsolved = this.teamData.challenges.find(c => !c.solved);

    // If there's an unsolved challenge, expand it
    if (firstUnsolved) {
      this.expandedChallenges.clear();
      this.expandedChallenges.add(firstUnsolved.id);
    } else {
      // All solved - collapse all
      this.expandedChallenges.clear();
    }
  }

  /**
   * Render the password display (B-I-N-A-R-Y)
   */
  renderPasswordDisplay() {
    const container = document.getElementById('password-display');
    container.innerHTML = '';

    const passwordLetters = ['B', 'I', 'N', 'A', 'R', 'Y'];

    passwordLetters.forEach((letter, index) => {
      const challengeId = index + 1;
      const challenge = this.teamData.challenges.find(c => c.id === challengeId);

      const charDiv = document.createElement('div');
      charDiv.className = 'password-char';

      if (challenge && challenge.solved) {
        charDiv.classList.add('solved');
        charDiv.textContent = challenge.character;
      } else {
        charDiv.classList.add('unlocked');
        charDiv.textContent = '?';
      }

      const label = document.createElement('div');
      label.className = 'password-char-label';
      label.textContent = `#${challengeId}`;
      charDiv.appendChild(label);

      container.appendChild(charDiv);
    });
  }

  /**
   * Render progress bar
   */
  renderProgress() {
    const solvedCount = this.teamData.challenges.filter(c => c.solved).length;
    const totalCount = this.teamData.challenges.length;
    const percentage = (solvedCount / totalCount) * 100;

    const progressFill = document.getElementById('progress-fill');
    const progressText = document.getElementById('progress-text');

    Terminal.animateProgress(progressFill, percentage);
    progressText.textContent = `${solvedCount} / ${totalCount} challenges solved`;
  }

  /**
   * Render all challenge cards
   */
  renderChallenges() {
    const container = document.getElementById('challenges-grid');
    container.innerHTML = '';

    this.challenges.forEach((challenge, index) => {
      const teamChallenge = this.teamData.challenges.find(c => c.id === challenge.id);
      const challengeCard = this.createChallengeCard(challenge, teamChallenge);
      container.appendChild(challengeCard);
    });
  }

  /**
   * Create a challenge card element
   */
  createChallengeCard(challenge, teamChallenge) {
    const card = document.createElement('div');
    card.className = 'challenge-card';
    card.id = `challenge-${challenge.id}`;

    const isUnlocked = this.isChallengeUnlocked(challenge.id);
    const isSolved = teamChallenge && teamChallenge.solved;
    const isExpanded = this.expandedChallenges.has(challenge.id);
    const partsTotal = Array.isArray(challenge.parts) ? challenge.parts.length : 0;
    const partsSolved = teamChallenge?.partsSolved || 0;
    const foundFlags = Array.isArray(teamChallenge?.foundFlags) ? teamChallenge.foundFlags : [];
    const currentPart = partsTotal > 0 ? challenge.parts[Math.min(partsSolved, partsTotal - 1)] : null;
    const currentPartNumber = Math.min(partsSolved + 1, partsTotal || partsSolved + 1);
    const partAvailable = currentPart ? currentPart.available !== false : false;
    const partIsFlag = currentPart ? currentPart.isFlag !== false : true;
    const flagsMarkup = foundFlags.length > 0
      ? foundFlags.map(flag => `<span class="ctf-flag">${Terminal.sanitizeHTML(flag)}</span>`).join('')
      : `<span class="ctf-flag-empty">No flags captured yet.</span>`;

    if (isSolved) {
      card.classList.add('solved');
    } else if (isUnlocked) {
      card.classList.add('unlocked');
    } else {
      card.classList.add('locked');
    }

    if (isExpanded) {
      card.classList.add('expanded');
    }

    // Status badge
    let statusText = 'Locked';
    let statusClass = 'status-locked';
    if (isSolved) {
      statusText = 'Solved';
      statusClass = 'status-solved';
    } else if (isUnlocked) {
      statusText = 'Unsolved';
      statusClass = 'status-unlocked';
    }

    card.innerHTML = `
      <div class="challenge-card-header" data-challenge-id="${challenge.id}">
        <div class="challenge-header-left">
          <div class="challenge-status ${statusClass}">${statusText}</div>
          <div class="challenge-number">Challenge #${challenge.id}</div>
          <h3 class="challenge-title">${Terminal.sanitizeHTML(challenge.title)}</h3>
          <div class="challenge-subtitle">${Terminal.sanitizeHTML(challenge.subtitle)}</div>
        </div>
        <div class="challenge-toggle">
          <span class="toggle-icon">${isExpanded ? '▼' : '▶'}</span>
        </div>
      </div>

      <div class="challenge-content" style="display: ${isExpanded ? 'block' : 'none'}; opacity: ${isExpanded ? '1' : '0'};">
        <div class="challenge-description">${Terminal.parseMarkdown(challenge.description)}</div>

      ${isUnlocked && !isSolved && challenge.type === 'connection' ? `
        <div class="connection-game" id="connection-game-${challenge.id}">
          <!-- Will be populated by createConnectionGame() -->
        </div>
        <div class="challenge-feedback" id="feedback-${challenge.id}"></div>
      ` : ''}

      ${isUnlocked && !isSolved && challenge.type === 'crossword' ? `
        <div class="crossword-container" id="crossword-${challenge.id}">
          <div class="crossword-grid" id="crossword-grid-${challenge.id}">
            <!-- Will be populated by createCrosswordGame() -->
          </div>
          <div class="crossword-clues" id="crossword-clues-${challenge.id}">
            <!-- Will be populated by createCrosswordGame() -->
          </div>
        </div>
        <div class="challenge-feedback" id="feedback-${challenge.id}"></div>
        <button class="submit-answer-btn crossword-submit-btn" data-challenge="${challenge.id}">
          Check Answers
        </button>
      ` : ''}

      ${isUnlocked && !isSolved && challenge.type === 'code' ? `
        <div class="code-challenge-section">
          <label for="code-editor-${challenge.id}">
            <strong>Python Code Editor:</strong>
          </label>
          <textarea
            id="code-editor-${challenge.id}"
            class="code-editor"
            rows="5"
            spellcheck="false"
            data-challenge="${challenge.id}"
          >def fibonacci(n):
    # Your code here
    pass</textarea>
          <div class="code-controls">
            <button
              class="run-code-btn"
              data-challenge="${challenge.id}"
            >
              ▶ Run Code
            </button>
            <button
              class="submit-code-btn"
              data-challenge="${challenge.id}"
              disabled
            >
              Submit Answer
            </button>
          </div>
          <div class="code-console" id="console-${challenge.id}">
            <div class="console-header">Output:</div>
            <pre class="console-output" id="console-output-${challenge.id}">Click "Run Code" to test your solution...</pre>
          </div>
          <div class="challenge-feedback" id="feedback-${challenge.id}"></div>
        </div>
      ` : ''}

      ${isUnlocked && !isSolved && challenge.type === 'ctf' ? `
        <div class="ctf-part-section">
          <div class="ctf-flags">
            ${flagsMarkup}
          </div>
          <div class="ctf-part-header">
            <div class="ctf-part-label">Part ${currentPartNumber} of ${partsTotal}</div>
            <div class="ctf-part-title">${Terminal.sanitizeHTML(currentPart ? currentPart.title : 'Part')}</div>
          </div>
          <div class="challenge-description ctf-part-description">
            ${Terminal.parseMarkdown(currentPart ? currentPart.description : 'No part details available.')}
          </div>
          ${currentPart && currentPart.type === 'image' ? `
            <div class="ctf-image-block">
              <img
                class="ctf-image"
                src="${Terminal.sanitizeHTML(currentPart.imagePath || '')}"
                alt="CTF image"
              >
            </div>
          ` : ''}
          ${partAvailable ? `
            <div class="challenge-answer-section">
              <label for="answer-${challenge.id}">
                <strong>Enter ${partIsFlag ? 'Flag' : 'Answer'}:</strong>
              </label>
              <div class="answer-input-group">
                <input
                  type="text"
                  id="answer-${challenge.id}"
                  class="answer-input"
                  placeholder="${partIsFlag ? 'CTF_...' : 'Your answer...'}"
                  maxlength="50"
                  data-challenge="${challenge.id}"
                  data-part="${currentPart ? currentPart.id : ''}"
                >
                <button
                  class="submit-answer-btn ctf-submit-btn"
                  data-challenge="${challenge.id}"
                  data-part="${currentPart ? currentPart.id : ''}"
                >
                  Submit ${partIsFlag ? 'Flag' : 'Answer'}
                </button>
              </div>
            </div>
          ` : `
            <div class="ctf-part-locked">Part not available yet.</div>
          `}
          <div class="challenge-feedback" id="feedback-${challenge.id}"></div>
        </div>
      ` : ''}

      ${isUnlocked && !isSolved && challenge.type !== 'connection' && challenge.type !== 'code' && challenge.type !== 'ctf' && challenge.type !== 'crossword' ? `
        <div class="challenge-answer-section">
          <label for="answer-${challenge.id}">
            <strong>Enter Your Answer:</strong>
          </label>
          <div class="answer-input-group">
            <input
              type="text"
              id="answer-${challenge.id}"
              class="answer-input"
              placeholder="Your answer..."
              maxlength="50"
              data-challenge="${challenge.id}"
            >
            <button
              class="submit-answer-btn"
              data-challenge="${challenge.id}"
            >
              Submit
            </button>
          </div>
          <div class="challenge-feedback" id="feedback-${challenge.id}"></div>
        </div>
      ` : ''}

        ${isSolved ? `
          <div class="solved-answer">
            <strong>✓ SOLVED</strong><br>
            Letter Revealed: <span class="solved-character">${Terminal.sanitizeHTML(teamChallenge.character)}</span>
          </div>
        ` : ''}
      </div>
    `;

    // Add toggle click handler (but not for locked challenges)
    const cardHeader = card.querySelector('.challenge-card-header');
    if (cardHeader && (isUnlocked || isSolved)) {
      cardHeader.addEventListener('click', () => {
        this.toggleChallenge(challenge.id);
      });
      cardHeader.style.cursor = 'pointer';
    } else if (cardHeader) {
      cardHeader.style.cursor = 'default';
    }

    // Add event listeners (only for unlocked, unsolved challenges)
    if (isUnlocked && !isSolved) {
      // Special handling for connection-type challenges
      if (challenge.type === 'connection') {
        // Initialize connection game after card is added to DOM
        setTimeout(() => {
          this.createConnectionGame(challenge);
        }, 0);
      } else if (challenge.type === 'crossword') {
        // Initialize crossword game after card is added to DOM
        setTimeout(() => {
          this.createCrosswordGame(challenge);
        }, 0);
      } else if (challenge.type === 'code') {
        // Add event listeners for code challenges
        const runBtn = card.querySelector('.run-code-btn');
        const submitBtn = card.querySelector('.submit-code-btn');
        const codeEditor = card.querySelector('.code-editor');

        if (runBtn && submitBtn && codeEditor) {
          runBtn.addEventListener('click', () => {
            this.runCode(challenge.id);
          });

          submitBtn.addEventListener('click', () => {
            this.submitCodeChallenge(challenge.id);
          });

          // Handle tab key, enter key, and backspace for smart indentation
          codeEditor.addEventListener('keydown', (e) => {
            const start = codeEditor.selectionStart;
            const end = codeEditor.selectionEnd;
            const value = codeEditor.value;

            if (e.key === 'Tab') {
              e.preventDefault();

              // Insert 4 spaces at cursor position
              codeEditor.value = value.substring(0, start) + '    ' + value.substring(end);

              // Move cursor after the inserted spaces
              codeEditor.selectionStart = codeEditor.selectionEnd = start + 4;
            }
            else if (e.key === 'Enter') {
              e.preventDefault();

              // Find the current line
              const beforeCursor = value.substring(0, start);
              const currentLineStart = beforeCursor.lastIndexOf('\n') + 1;
              const currentLine = beforeCursor.substring(currentLineStart);

              // Count leading spaces on current line
              const leadingSpaces = currentLine.match(/^\s*/)[0];

              // Check if current line ends with ':' (function, if, for, etc.)
              const needsExtraIndent = currentLine.trim().endsWith(':');

              // Calculate new indentation
              const newIndent = needsExtraIndent ? leadingSpaces + '    ' : leadingSpaces;

              // Insert newline with proper indentation
              const newText = '\n' + newIndent;
              codeEditor.value = value.substring(0, start) + newText + value.substring(end);

              // Move cursor after the indentation
              codeEditor.selectionStart = codeEditor.selectionEnd = start + newText.length;
            }
            else if (e.key === 'Backspace' && start === end) {
              // Smart backspace: delete entire indent if at beginning of whitespace
              const beforeCursor = value.substring(0, start);
              const currentLineStart = beforeCursor.lastIndexOf('\n') + 1;
              const currentLine = beforeCursor.substring(currentLineStart);

              // Check if we're in the leading whitespace
              if (currentLine.match(/^\s+$/) && currentLine.length % 4 === 0) {
                e.preventDefault();

                // Delete 4 spaces at once
                const deleteCount = Math.min(4, currentLine.length);
                codeEditor.value = value.substring(0, start - deleteCount) + value.substring(end);
                codeEditor.selectionStart = codeEditor.selectionEnd = start - deleteCount;
              }
            }
          });

          // Auto-resize textarea as content grows
          const autoResize = () => {
            codeEditor.style.height = 'auto';
            codeEditor.style.height = Math.min(codeEditor.scrollHeight, 500) + 'px';
          };

          codeEditor.addEventListener('input', autoResize);
          // Initial resize
          setTimeout(autoResize, 0);
        }
      } else if (challenge.type === 'ctf') {
        const submitBtn = card.querySelector('.ctf-submit-btn');
        const answerInput = card.querySelector('.answer-input');

        if (submitBtn && answerInput) {
          const getPartIndex = () => parseInt(answerInput.dataset.part || submitBtn.dataset.part, 10);

          submitBtn.addEventListener('click', () => {
            this.submitAnswer(challenge.id, answerInput.value, 0, getPartIndex());
          });

          answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              this.submitAnswer(challenge.id, answerInput.value, 0, getPartIndex());
            }
          });
        }
      } else {
        // Add event listeners for answer submission
        const submitBtn = card.querySelector('.submit-answer-btn');
        const answerInput = card.querySelector('.answer-input');

        if (submitBtn && answerInput) {
          submitBtn.addEventListener('click', () => {
            this.submitAnswer(challenge.id, answerInput.value);
          });

          answerInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
              this.submitAnswer(challenge.id, answerInput.value);
            }
          });
        }
      }
    }

    return card;
  }

  /**
   * Check if a challenge is unlocked (all challenges unlocked from start)
   */
  isChallengeUnlocked(challengeId) {
    return true; // All challenges are available from the start
  }

  /**
   * Toggle challenge expanded/collapsed state
   */
  toggleChallenge(challengeId) {
    const card = document.getElementById(`challenge-${challengeId}`);
    const content = card.querySelector('.challenge-content');
    const toggleIcon = card.querySelector('.toggle-icon');
    const challenge = this.challenges.find(c => c.id === challengeId);

    if (this.expandedChallenges.has(challengeId)) {
      // Collapse with fade
      if (this.forceExpandedChallengeId === challengeId) {
        this.forceExpandedChallengeId = null;
      }
      content.style.opacity = '0';
      setTimeout(() => {
        this.expandedChallenges.delete(challengeId);
        card.classList.remove('expanded');
        content.style.display = 'none';
        toggleIcon.textContent = '▶';
      }, 300);
    } else {
      // Expand with fade
      this.expandedChallenges.add(challengeId);
      card.classList.add('expanded');
      content.style.display = 'block';
      content.style.opacity = '0';
      requestAnimationFrame(() => {
        if (challenge && challenge.type === 'crossword') {
          this.syncCrosswordClueHeight(challengeId);
        }
        content.style.opacity = '1';
      });
      toggleIcon.textContent = '▼';
    }
  }

  /**
   * Create crossword game interface
   */
  createCrosswordGame(challenge) {
    const gridContainer = document.getElementById(`crossword-grid-${challenge.id}`);
    const cluesContainer = document.getElementById(`crossword-clues-${challenge.id}`);
    if (!gridContainer || !cluesContainer || !challenge.crossword) return;

    const { size, blackSquares, clues } = challenge.crossword;

    // Initialize grid state
    this.crosswordState = this.crosswordState || {};
    this.crosswordState[challenge.id] = {
      grid: Array(size).fill(null).map(() => Array(size).fill('')),
      currentCell: null,
      currentDirection: 'across'
    };

    const state = this.crosswordState[challenge.id];

    // Create grid
    const gridTable = document.createElement('table');
    gridTable.className = 'crossword-table';

    for (let row = 0; row < size; row++) {
      const tr = document.createElement('tr');
      for (let col = 0; col < size; col++) {
        const td = document.createElement('td');
        td.dataset.row = row;
        td.dataset.col = col;
        const isBlack = blackSquares.some(([r, c]) => r === row && c === col);

        if (isBlack) {
          td.className = 'crossword-cell black';
        } else {
          td.className = 'crossword-cell';
          const input = document.createElement('input');
          input.type = 'text';
          input.maxLength = 1;
          input.dataset.row = row;
          input.dataset.col = col;
          input.className = 'crossword-input';

          // Find clue number for this cell
          const acrossClue = clues.across.find(c => c.row === row && c.col === col);
          const downClue = clues.down.find(c => c.row === row && c.col === col);
          if (acrossClue || downClue) {
            const number = document.createElement('span');
            number.className = 'crossword-number';
            number.textContent = (acrossClue || downClue).number;
            td.appendChild(number);
          }

          td.appendChild(input);
        }

        tr.appendChild(td);
      }
      gridTable.appendChild(tr);
    }

    gridContainer.appendChild(gridTable);

    // Create clues lists
    const acrossDiv = document.createElement('div');
    acrossDiv.className = 'clue-list';
    acrossDiv.innerHTML = '<h4>Across</h4>';
    const acrossList = document.createElement('ul');
    clues.across.forEach(clue => {
      const li = document.createElement('li');
      li.className = 'clue-item';
      li.dataset.number = clue.number;
      li.dataset.direction = 'across';
      li.innerHTML = `<strong>${clue.number}.</strong> ${clue.clue}`;
      acrossList.appendChild(li);
    });
    acrossDiv.appendChild(acrossList);

    const downDiv = document.createElement('div');
    downDiv.className = 'clue-list';
    downDiv.innerHTML = '<h4>Down</h4>';
    const downList = document.createElement('ul');
    clues.down.forEach(clue => {
      const li = document.createElement('li');
      li.className = 'clue-item';
      li.dataset.number = clue.number;
      li.dataset.direction = 'down';
      li.innerHTML = `<strong>${clue.number}.</strong> ${clue.clue}`;
      downList.appendChild(li);
    });
    downDiv.appendChild(downList);

    cluesContainer.appendChild(acrossDiv);
    cluesContainer.appendChild(downDiv);

    this.registerCrosswordResize(challenge.id);
    requestAnimationFrame(() => {
      this.syncCrosswordClueHeight(challenge.id);
    });

    // Set up event handlers
    this.setupCrosswordHandlers(challenge.id);
  }

  /**
   * Setup crossword input handlers
   */
  setupCrosswordHandlers(challengeId) {
    const inputs = document.querySelectorAll(`#crossword-grid-${challengeId} .crossword-input`);
    const state = this.crosswordState[challengeId];

    inputs.forEach(input => {
      input.addEventListener('focus', () => {
        const row = parseInt(input.dataset.row);
        const col = parseInt(input.dataset.col);
        state.currentCell = [row, col];
        this.updateActiveClue(challengeId, row, col);
      });

      // Handle input
      input.addEventListener('input', (e) => {
        const value = e.target.value.toUpperCase();
        if (value.match(/[A-Z]/)) {
          e.target.value = value;
          const row = parseInt(e.target.dataset.row);
          const col = parseInt(e.target.dataset.col);
          state.grid[row][col] = value;
          state.currentCell = [row, col];

          // Move to next cell
          this.moveToNextCell(challengeId, row, col, state.currentDirection);
        } else {
          e.target.value = '';
        }
      });

      // Handle backspace
      input.addEventListener('keydown', (e) => {
        if (e.key === 'Backspace' && e.target.value === '') {
          e.preventDefault();
          const row = parseInt(e.target.dataset.row);
          const col = parseInt(e.target.dataset.col);
          this.moveToPreviousCell(challengeId, row, col, state.currentDirection);
        } else if (e.key === 'Tab') {
          e.preventDefault();
          // Switch direction
          state.currentDirection = state.currentDirection === 'across' ? 'down' : 'across';
          const row = parseInt(e.target.dataset.row);
          const col = parseInt(e.target.dataset.col);
          state.currentCell = [row, col];
          this.updateActiveClue(challengeId, row, col);
        }
      });

      // Handle click - highlight word
      input.addEventListener('click', () => {
        const row = parseInt(input.dataset.row);
        const col = parseInt(input.dataset.col);
        state.currentCell = [row, col];
        this.updateActiveClue(challengeId, row, col);
        input.select();
      });
    });

    // Handle clue clicks
    const clueItems = document.querySelectorAll(`#crossword-clues-${challengeId} .clue-item`);
    clueItems.forEach(item => {
      item.addEventListener('click', () => {
        const number = parseInt(item.dataset.number);
        const direction = item.dataset.direction;
        state.currentDirection = direction;

        // Find and focus the first cell of this clue
        const challenge = this.challenges.find(c => c.id === challengeId);
        const clue = challenge.crossword.clues[direction].find(c => c.number === number);
        if (clue) {
          const input = document.querySelector(
            `#crossword-grid-${challengeId} input[data-row="${clue.row}"][data-col="${clue.col}"]`
          );
          if (input) {
            input.focus();
            state.currentCell = [clue.row, clue.col];
            this.updateActiveClue(challengeId, clue.row, clue.col);
          }
        }
      });
    });

    // Add submit button handler
    const submitBtn = document.querySelector(`button[data-challenge="${challengeId}"]`);
    if (submitBtn) {
      submitBtn.addEventListener('click', () => {
        this.submitCrossword(challengeId);
      });
    }
  }

  /**
   * Move to next cell in crossword
   */
  moveToNextCell(challengeId, row, col, direction) {
    const challenge = this.challenges.find(c => c.id === challengeId);
    const state = this.crosswordState[challengeId];
    if (!challenge || !challenge.crossword || !state) return;

    const primaryDirection = direction || 'across';
    let activeDirection = primaryDirection;
    let clue = this.getClueForCell(challenge, row, col, primaryDirection);

    if (!clue) {
      const fallbackDirection = primaryDirection === 'across' ? 'down' : 'across';
      clue = this.getClueForCell(challenge, row, col, fallbackDirection);
      if (clue) {
        activeDirection = fallbackDirection;
      }
    }

    if (!clue) return;

    state.currentDirection = activeDirection;

    const isLastCell = activeDirection === 'across'
      ? col === clue.col + clue.length - 1
      : row === clue.row + clue.length - 1;

    if (isLastCell) {
      const next = this.getNextClue(challenge, clue, activeDirection);
      if (next) {
        state.currentDirection = next.direction;
        this.focusCrosswordCell(challengeId, next.clue.row, next.clue.col);
      }
      return;
    }

    const nextRow = activeDirection === 'across' ? row : row + 1;
    const nextCol = activeDirection === 'across' ? col + 1 : col;
    this.focusCrosswordCell(challengeId, nextRow, nextCol);
  }

  /**
   * Move to previous cell in crossword
   */
  moveToPreviousCell(challengeId, row, col, direction) {
    const challenge = this.challenges.find(c => c.id === challengeId);
    const { blackSquares } = challenge.crossword;

    let prevRow = row;
    let prevCol = col;

    if (direction === 'across') {
      prevCol--;
    } else {
      prevRow--;
    }

    // Check bounds and black squares
    if (prevRow >= 0 && prevCol >= 0) {
      const isBlack = blackSquares.some(([r, c]) => r === prevRow && c === prevCol);
      if (!isBlack) {
        const prevInput = document.querySelector(
          `#crossword-grid-${challengeId} input[data-row="${prevRow}"][data-col="${prevCol}"]`
        );
        if (prevInput) {
          prevInput.focus();
          prevInput.value = '';
          this.crosswordState[challengeId].grid[prevRow][prevCol] = '';
          this.crosswordState[challengeId].currentCell = [prevRow, prevCol];
          this.updateActiveClue(challengeId, prevRow, prevCol);
        }
      }
    }
  }

  /**
   * Submit crossword answer
   */
  submitCrossword(challengeId) {
    const state = this.crosswordState[challengeId];
    const gridJSON = JSON.stringify(state.grid);
    this.submitAnswer(challengeId, gridJSON);
  }

  /**
   * Capture the current scroll position relative to a challenge card
   */
  captureScrollAnchor(challengeId) {
    const card = document.getElementById(`challenge-${challengeId}`);
    if (!card) return;
    this.scrollAnchor = {
      challengeId: challengeId,
      top: card.getBoundingClientRect().top
    };
  }

  /**
   * Restore scroll position after rerendering challenge content
   */
  restoreScrollAnchor() {
    if (!this.scrollAnchor) return;
    const { challengeId, top } = this.scrollAnchor;
    requestAnimationFrame(() => {
      const card = document.getElementById(`challenge-${challengeId}`);
      if (!card) {
        this.scrollAnchor = null;
        return;
      }
      const newTop = card.getBoundingClientRect().top;
      const delta = newTop - top;
      if (delta !== 0) {
        window.scrollBy(0, delta);
      }
      this.scrollAnchor = null;
    });
  }

  /**
   * Track crossword instances for resize syncing
   */
  registerCrosswordResize(challengeId) {
    if (!this.crosswordResizeIds) {
      this.crosswordResizeIds = new Set();
    }
    this.crosswordResizeIds.add(challengeId);
    this.ensureCrosswordResizeHandler();
  }

  /**
   * Ensure a single resize handler keeps clue boxes aligned to grids
   */
  ensureCrosswordResizeHandler() {
    if (this.crosswordResizeHandler) return;
    this.crosswordResizeHandler = Terminal.debounce(() => {
      if (!this.crosswordResizeIds) return;
      this.crosswordResizeIds.forEach((id) => {
        this.syncCrosswordClueHeight(id);
      });
    }, 150);
    window.addEventListener('resize', this.crosswordResizeHandler);
  }

  /**
   * Sync clue panel height to the grid height
   */
  syncCrosswordClueHeight(challengeId) {
    const container = document.getElementById(`crossword-${challengeId}`);
    const gridTable = document.querySelector(`#crossword-grid-${challengeId} .crossword-table`);
    if (!container || !gridTable) return;

    const height = gridTable.getBoundingClientRect().height;
    if (height > 0) {
      container.style.setProperty('--crossword-grid-height', `${Math.round(height)}px`);
    }
  }

  /**
   * Update the active clue highlight based on current cursor position
   */
  updateActiveClue(challengeId, row, col) {
    const challenge = this.challenges.find(c => c.id === challengeId);
    const state = this.crosswordState[challengeId];
    if (!challenge || !challenge.crossword || !state) return;

    const direction = state.currentDirection || 'across';
    let clue = this.getClueForCell(challenge, row, col, direction);
    let activeDirection = direction;

    if (!clue) {
      const fallbackDirection = direction === 'across' ? 'down' : 'across';
      clue = this.getClueForCell(challenge, row, col, fallbackDirection);
      if (clue) {
        activeDirection = fallbackDirection;
        state.currentDirection = fallbackDirection;
      }
    }

    if (!clue) return;

    this.highlightActiveClue(challengeId, clue, activeDirection);
  }

  /**
   * Focus a specific crossword cell and update active clue display
   */
  focusCrosswordCell(challengeId, row, col) {
    const input = document.querySelector(
      `#crossword-grid-${challengeId} input[data-row="${row}"][data-col="${col}"]`
    );
    if (!input) return false;

    input.focus();
    input.select();

    const state = this.crosswordState[challengeId];
    if (state) {
      state.currentCell = [row, col];
    }
    this.updateActiveClue(challengeId, row, col);
    return true;
  }

  /**
   * Determine the next clue in order (across then down, then wrap)
   */
  getNextClue(challenge, currentClue, direction) {
    const across = challenge.crossword.clues.across;
    const down = challenge.crossword.clues.down;

    if (direction === 'across') {
      const index = across.findIndex(clue => clue.number === currentClue.number);
      if (index > -1 && index < across.length - 1) {
        return { clue: across[index + 1], direction: 'across' };
      }
      return down.length > 0 ? { clue: down[0], direction: 'down' } : null;
    }

    const index = down.findIndex(clue => clue.number === currentClue.number);
    if (index > -1 && index < down.length - 1) {
      return { clue: down[index + 1], direction: 'down' };
    }
    return across.length > 0 ? { clue: across[0], direction: 'across' } : null;
  }

  /**
   * Find the clue that contains the given cell
   */
  getClueForCell(challenge, row, col, direction) {
    const clues = challenge.crossword.clues[direction];
    return clues.find(clue => {
      if (direction === 'across') {
        return clue.row === row && col >= clue.col && col < clue.col + clue.length;
      }
      return clue.col === col && row >= clue.row && row < clue.row + clue.length;
    });
  }

  /**
   * Highlight the active clue and its word cells
   */
  highlightActiveClue(challengeId, clue, direction) {
    const clueItems = document.querySelectorAll(`#crossword-clues-${challengeId} .clue-item`);
    const cluesContainer = document.getElementById(`crossword-clues-${challengeId}`);
    let activeItem = null;

    clueItems.forEach(item => {
      const isActive = parseInt(item.dataset.number) === clue.number && item.dataset.direction === direction;
      item.classList.toggle('active', isActive);
      if (isActive) {
        activeItem = item;
      }
    });

    if (activeItem && cluesContainer && cluesContainer.scrollHeight > cluesContainer.clientHeight) {
      activeItem.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    this.clearActiveWordHighlight(challengeId);
    this.highlightActiveWordCells(challengeId, clue, direction);
  }

  /**
   * Remove active word highlighting
   */
  clearActiveWordHighlight(challengeId) {
    const activeCells = document.querySelectorAll(
      `#crossword-grid-${challengeId} .crossword-cell.active-word`
    );
    activeCells.forEach(cell => cell.classList.remove('active-word'));
  }

  /**
   * Highlight all cells in the active word
   */
  highlightActiveWordCells(challengeId, clue, direction) {
    for (let i = 0; i < clue.length; i++) {
      const row = direction === 'across' ? clue.row : clue.row + i;
      const col = direction === 'across' ? clue.col + i : clue.col;
      const cell = document.querySelector(
        `#crossword-grid-${challengeId} td[data-row="${row}"][data-col="${col}"]`
      );
      if (cell) {
        cell.classList.add('active-word');
      }
    }
  }

  /**
   * Create connection game interface
   */
  createConnectionGame(challenge) {
    const container = document.getElementById(`connection-game-${challenge.id}`);
    if (!container || !challenge.connections) return;

    // Shuffle achievements for the right column
    const shuffledAchievements = [...challenge.connections]
      .map(c => c.achievement)
      .sort(() => Math.random() - 0.5);

    // Create grid wrapper
    const gridWrapper = document.createElement('div');
    gridWrapper.className = 'connection-game-grid';

    // Create two columns
    const leftColumn = document.createElement('div');
    leftColumn.className = 'connection-column connection-left';

    const rightColumn = document.createElement('div');
    rightColumn.className = 'connection-column connection-right';

    // Populate left column (people)
    challenge.connections.forEach((conn, index) => {
      const item = document.createElement('div');
      item.className = 'connection-item connection-person';
      item.dataset.person = conn.person;
      item.textContent = conn.person;
      leftColumn.appendChild(item);
    });

    // Populate right column (achievements)
    shuffledAchievements.forEach((achievement, index) => {
      const item = document.createElement('div');
      item.className = 'connection-item connection-achievement';
      item.dataset.achievement = achievement;
      item.textContent = achievement;
      rightColumn.appendChild(item);
    });

    gridWrapper.appendChild(leftColumn);
    gridWrapper.appendChild(rightColumn);
    container.appendChild(gridWrapper);

    // Add progress display
    const progressDiv = document.createElement('div');
    progressDiv.className = 'connection-progress';
    progressDiv.id = `connection-progress-${challenge.id}`;
    progressDiv.innerHTML = '<strong>Matches:</strong> <span id="connection-count-' + challenge.id + '">0</span> / 8';
    container.appendChild(progressDiv);

    // Initialize connection state
    this.connectionState = this.connectionState || {};
    this.connectionState[challenge.id] = {
      correctMatches: 0,
      incorrectAttempts: 0,
      correctConnections: challenge.connections,
      character: challenge.character
    };

    // Add click handlers for matching
    this.setupConnectionHandlers(challenge.id, leftColumn, rightColumn);
  }

  /**
   * Setup connection game handlers
   */
  setupConnectionHandlers(challengeId, leftColumn, rightColumn) {
    const personItems = leftColumn.querySelectorAll('.connection-person');
    const achievementItems = rightColumn.querySelectorAll('.connection-achievement');

    let selectedPerson = null;
    let selectedPersonEl = null;

    // Handle person clicks
    personItems.forEach(personEl => {
      personEl.addEventListener('click', (e) => {
        e.stopPropagation();

        // Skip if already matched (hidden)
        if (personEl.classList.contains('matched')) return;

        const person = personEl.dataset.person;

        // Select/deselect
        if (selectedPerson === person) {
          // Deselect
          personEl.classList.remove('selected');
          selectedPerson = null;
          selectedPersonEl = null;
        } else {
          // Clear previous selection
          personItems.forEach(p => p.classList.remove('selected'));
          // Select this person
          personEl.classList.add('selected');
          selectedPerson = person;
          selectedPersonEl = personEl;
        }
      });
    });

    // Handle achievement clicks
    achievementItems.forEach(achievementEl => {
      achievementEl.addEventListener('click', (e) => {
        e.stopPropagation();

        // Skip if already matched (hidden)
        if (achievementEl.classList.contains('matched')) return;

        const achievement = achievementEl.dataset.achievement;

        // If a person is selected, check the connection
        if (selectedPerson) {
          this.checkConnection(challengeId, selectedPerson, achievement, selectedPersonEl, achievementEl);

          // Clear selection
          selectedPersonEl.classList.remove('selected');
          selectedPerson = null;
          selectedPersonEl = null;
        }
      });
    });
  }

  /**
   * Check if connection is correct
   */
  checkConnection(challengeId, person, achievement, personEl, achievementEl) {
    const state = this.connectionState[challengeId];
    const correctConnections = state.correctConnections;

    console.log('Checking connection:', person, '→', achievement);

    // Find the correct match for this person
    const correctMatch = correctConnections.find(c => c.person === person);

    if (correctMatch && correctMatch.achievement === achievement) {
      // CORRECT! Make them disappear
      console.log('✓ Correct match!');
      personEl.classList.add('correct');
      achievementEl.classList.add('correct');

      setTimeout(() => {
        personEl.classList.add('matched');
        achievementEl.classList.add('matched');

        // Update progress
        state.correctMatches++;
        console.log('Progress:', state.correctMatches, '/ 8');
        const countEl = document.getElementById(`connection-count-${challengeId}`);
        if (countEl) {
          countEl.textContent = state.correctMatches;
        }

        // Check if all 8 are matched
        if (state.correctMatches === 8) {
          console.log('All 8 matches complete!');
          this.handleAllConnectionsComplete(challengeId);
        }
      }, 600);

    } else {
      // INCORRECT! Flash red and reset
      console.log('✗ Incorrect match. Expected:', correctMatch ? correctMatch.achievement : 'unknown');
      state.incorrectAttempts++;
      personEl.classList.add('incorrect');
      achievementEl.classList.add('incorrect');

      setTimeout(() => {
        personEl.classList.remove('incorrect');
        achievementEl.classList.remove('incorrect');
      }, 600);
    }
  }

  /**
   * Handle all connections complete
   */
  handleAllConnectionsComplete(challengeId) {
    console.log('All connections complete for challenge', challengeId);

    const state = this.connectionState[challengeId];
    const incorrectAttempts = state.incorrectAttempts;
    const answer = state.character || (this.challenges.find(c => c.id === challengeId)?.character || '');

    const feedbackElement = document.getElementById(`feedback-${challengeId}`);
    feedbackElement.textContent = '✓ Perfect! All matches complete! Submitting...';
    feedbackElement.className = 'challenge-feedback visible success';

    // Auto-submit the answer to unlock the letter with attempt count
    setTimeout(() => {
      console.log(`Auto-submitting answer for challenge ${challengeId} with ${incorrectAttempts} incorrect attempts`);
      this.submitAnswer(challengeId, answer, incorrectAttempts);
    }, 1000);
  }


  /**
   * Submit an answer for a challenge
   */
  submitAnswer(challengeId, answer, incorrectAttempts = 0, partIndex = null) {
    if (!answer || answer.trim().length === 0) {
      Terminal.showError('Please enter an answer');
      return;
    }

    const feedbackElement = document.getElementById(`feedback-${challengeId}`);

    // Check if this is a connection game (no input field)
    const input = document.querySelector(`#answer-${challengeId}`);
    const button = document.querySelector(`button[data-challenge="${challengeId}"]`);

    if (input && button) {
      // Regular challenge
      feedbackElement.textContent = 'Submitting...';
      feedbackElement.className = 'challenge-feedback visible';
      input.disabled = true;
      button.disabled = true;
    } else {
      // Connection game - feedback already set by handleAllConnectionsComplete
    }

    // Submit to server with incorrect attempts count
    if (Number.isInteger(partIndex)) {
      socketClient.submitAnswerWithPart(this.teamName, challengeId, answer, partIndex, incorrectAttempts);
    } else {
      socketClient.submitAnswer(this.teamName, challengeId, answer, incorrectAttempts);
    }
  }

  /**
   * Handle challenge result from server
   */
  handleChallengeResult(data) {
    const { challengeId, correct, message, character, points, partial, partIndex, partsSolved, partsTotal } = data;
    const feedbackElement = document.getElementById(`feedback-${challengeId}`);

    if (correct) {
      if (partial) {
        const progressText = partsTotal ? ` (${partsSolved}/${partsTotal})` : '';
        feedbackElement.textContent = message || `✓ Part ${partIndex} complete${progressText}.`;
        feedbackElement.className = 'challenge-feedback visible success';
        Terminal.showSuccess(`Part ${partIndex} complete!`);
        this.forceExpandedChallengeId = challengeId;
        this.captureScrollAnchor(challengeId);

        setTimeout(() => {
          socketClient.requestGameState(this.teamName);
        }, 300);

        return;
      }

      this.forceExpandedChallengeId = null;

      // Success!
      const pointsText = points ? ` (+${points} points)` : '';
      feedbackElement.textContent = `✓ Correct! Letter revealed: ${character}${pointsText}`;
      feedbackElement.className = 'challenge-feedback visible success';
      Terminal.showSuccess(`Challenge ${challengeId} solved!`);

      // Close current challenge and open next one
      setTimeout(() => {
        this.expandedChallenges.delete(challengeId);

        // Find next unsolved challenge
        const nextChallengeId = challengeId + 1;
        if (nextChallengeId <= this.challenges.length) {
          this.expandedChallenges.add(nextChallengeId);
        }
      }, 1500);

      // Request updated game state
      setTimeout(() => {
        socketClient.requestGameState(this.teamName);
      }, 500);
    } else {
      // Incorrect
      feedbackElement.textContent = `✗ ${message}`;
      feedbackElement.className = 'challenge-feedback visible error';

      // Re-enable input for regular challenges
      const input = document.querySelector(`#answer-${challengeId}`);
      const button = document.querySelector(`button[data-challenge="${challengeId}"]`);
      if (input && button) {
        input.disabled = false;
        button.disabled = false;
        input.focus();
        input.select();
      }
    }
  }

  /**
   * Check if final password section should be unlocked
   */
  checkFinalPasswordUnlock() {
    const allSolved = this.teamData.challenges.every(c => c.solved);
    const passwordSection = document.getElementById('final-password-section');

    if (allSolved) {
      passwordSection.classList.add('unlocked');
      Terminal.pulse(passwordSection, 2000);
    } else {
      passwordSection.classList.remove('unlocked');
    }
  }

  /**
   * Submit final password
   */
  submitFinalPassword() {
    const input = document.getElementById('final-password-input');
    const button = document.getElementById('submit-password-btn');
    const feedback = document.getElementById('password-feedback');
    const password = input.value.trim();

    if (!password) {
      Terminal.showError('Please enter the master password');
      return;
    }

    // Disable input
    input.disabled = true;
    button.disabled = true;
    feedback.textContent = 'Verifying access...';
    feedback.className = 'challenge-feedback visible';

    // Submit to server
    socketClient.submitPassword(this.teamName, password);
  }

  /**
   * Run code for a code challenge
   */
  async runCode(challengeId) {
    const codeEditor = document.getElementById(`code-editor-${challengeId}`);
    const consoleOutput = document.getElementById(`console-output-${challengeId}`);
    const feedbackElement = document.getElementById(`feedback-${challengeId}`);
    const runBtn = document.querySelector(`.run-code-btn[data-challenge="${challengeId}"]`);
    const submitBtn = document.querySelector(`.submit-code-btn[data-challenge="${challengeId}"]`);

    if (!codeEditor) return;

    const code = codeEditor.value;

    // Update UI
    runBtn.disabled = true;
    runBtn.textContent = '⏳ Running...';
    consoleOutput.textContent = 'Executing code...';
    consoleOutput.className = 'console-output';
    feedbackElement.textContent = '';
    feedbackElement.className = 'challenge-feedback';

    try {
      // Call the execute-code API with n=5 for sample test
      const response = await fetch('/api/execute-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: code,
          challengeId: challengeId,
          n: 5 // Sample test with n=5
        })
      });

      const result = await response.json();

      if (result.success) {
        // Show output
        consoleOutput.textContent = `Sample Test (n=${result.n}):\n${result.output || '(no output)'}`;

        if (result.isValid) {
          // Code is correct for sample!
          consoleOutput.className = 'console-output success';
          feedbackElement.textContent = '✓ Sample test passed! Click "Submit Answer" to test with random values (10-30).';
          feedbackElement.className = 'challenge-feedback visible success';
          submitBtn.disabled = false;
          submitBtn.dataset.validated = 'true';
        } else {
          // Code ran but output is wrong
          consoleOutput.className = 'console-output error';
          feedbackElement.textContent = '✗ Sample test failed. Expected: 0, 1, 1, 2, 3 (each on new line)';
          feedbackElement.className = 'challenge-feedback visible error';
          submitBtn.disabled = true;
        }
      } else {
        // Execution error
        consoleOutput.textContent = result.error || 'Execution failed';
        consoleOutput.className = 'console-output error';
        feedbackElement.textContent = '✗ Error in code execution. Check the output above.';
        feedbackElement.className = 'challenge-feedback visible error';
        submitBtn.disabled = true;
      }
    } catch (error) {
      consoleOutput.textContent = `Network error: ${error.message}`;
      consoleOutput.className = 'console-output error';
      feedbackElement.textContent = '✗ Failed to execute code. Please try again.';
      feedbackElement.className = 'challenge-feedback visible error';
    } finally {
      runBtn.disabled = false;
      runBtn.textContent = '▶ Run Code';
    }
  }

  /**
   * Submit a code challenge answer
   */
  async submitCodeChallenge(challengeId) {
    const submitBtn = document.querySelector(`.submit-code-btn[data-challenge="${challengeId}"]`);
    const runBtn = document.querySelector(`.run-code-btn[data-challenge="${challengeId}"]`);
    const feedbackElement = document.getElementById(`feedback-${challengeId}`);
    const consoleOutput = document.getElementById(`console-output-${challengeId}`);
    const codeEditor = document.getElementById(`code-editor-${challengeId}`);

    if (submitBtn.dataset.validated !== 'true') {
      Terminal.showError('Please run your code first and ensure it produces the correct output.');
      return;
    }

    // Disable buttons while testing
    submitBtn.disabled = true;
    runBtn.disabled = true;
    submitBtn.textContent = '⏳ Testing...';
    consoleOutput.textContent = 'Running multiple test cases...';
    consoleOutput.className = 'console-output';
    feedbackElement.textContent = '';

    try {
      // Call the validate-code API for comprehensive testing
      const response = await fetch('/api/validate-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          code: codeEditor.value,
          challengeId: challengeId
        })
      });

      const result = await response.json();

      if (result.passed) {
        // All tests passed!
        const testSummary = result.results.map(r => `✓ n=${r.n}: Passed`).join('\n');
        consoleOutput.textContent = `All Tests Passed!\n\n${testSummary}`;
        consoleOutput.className = 'console-output success';
        feedbackElement.textContent = '✓ All test cases passed! Submitting...';
        feedbackElement.className = 'challenge-feedback visible success';

        // Submit the challenge
        setTimeout(() => {
          this.submitAnswer(challengeId, 'CODE_CHALLENGE');
        }, 1000);
      } else {
        // Some tests failed
        const failedTest = result.results.find(r => !r.passed);
        const testSummary = result.results.map(r =>
          r.passed ? `✓ n=${r.n}: Passed` : `✗ n=${r.n}: Failed`
        ).join('\n');

        consoleOutput.textContent = `Test Failed:\n\n${testSummary}\n\nFirst failure (n=${failedTest.n}):\nYour output:\n${failedTest.output || '(no output)'}\n\nExpected:\n${failedTest.expected}`;
        consoleOutput.className = 'console-output error';
        feedbackElement.textContent = `✗ Test case failed for n=${failedTest.n}. Check the output above.`;
        feedbackElement.className = 'challenge-feedback visible error';

        // Re-enable buttons
        submitBtn.disabled = false;
        runBtn.disabled = false;
        submitBtn.textContent = 'Submit Answer';
      }
    } catch (error) {
      consoleOutput.textContent = `Error: ${error.message}`;
      consoleOutput.className = 'console-output error';
      feedbackElement.textContent = '✗ Failed to validate code. Please try again.';
      feedbackElement.className = 'challenge-feedback visible error';

      // Re-enable buttons
      submitBtn.disabled = false;
      runBtn.disabled = false;
      submitBtn.textContent = 'Submit Answer';
    }
  }

  /**
   * Handle password result from server
   */
  handlePasswordResult(data) {
    const { correct, message } = data;
    const input = document.getElementById('final-password-input');
    const button = document.getElementById('submit-password-btn');
    const feedback = document.getElementById('password-feedback');

    if (correct) {
      // Victory!
      feedback.textContent = `✓ Correct! Password accepted!`;
      feedback.className = 'challenge-feedback visible success';
      Terminal.showSuccess('Congratulations! You solved the puzzle!');

      // Redirect to victory page
      setTimeout(() => {
        window.location.href = '/victory.html';
      }, 2000);
    } else {
      // Incorrect
      feedback.textContent = `✗ ${message}`;
      feedback.className = 'challenge-feedback visible error';
      Terminal.showError('Access Denied');

      // Update attempts count
      const attemptsElement = document.getElementById('password-attempts-count');
      const currentAttempts = parseInt(attemptsElement.textContent || '0');
      attemptsElement.textContent = currentAttempts + 1;

      // Re-enable input
      input.disabled = false;
      button.disabled = false;
      input.focus();
      input.select();
    }
  }
}

// Initialize game when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    new Game();
  });
} else {
  new Game();
}
