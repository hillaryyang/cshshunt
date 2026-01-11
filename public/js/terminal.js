/**
 * Terminal Effects and Utilities
 * Provides visual effects for the terminal-themed interface
 */

const Terminal = {
  /**
   * Type text with animation
   */
  typeText(element, text, speed = 30) {
    return new Promise((resolve) => {
      element.textContent = '';
      let index = 0;

      const typeChar = () => {
        if (index < text.length) {
          element.textContent += text.charAt(index);
          index++;
          setTimeout(typeChar, speed);
        } else {
          resolve();
        }
      };

      typeChar();
    });
  },

  /**
   * Add glitch effect to an element
   */
  glitch(element, duration = 300) {
    element.classList.add('glitch');
    setTimeout(() => {
      element.classList.remove('glitch');
    }, duration);
  },

  /**
   * Create a pulse animation
   */
  pulse(element, duration = 1000) {
    element.classList.add('pulse');
    setTimeout(() => {
      element.classList.remove('pulse');
    }, duration);
  },

  /**
   * Fade in an element
   */
  fadeIn(element, duration = 500) {
    element.style.opacity = '0';
    element.classList.add('fade-in');
    element.style.display = 'block';

    setTimeout(() => {
      element.style.opacity = '1';
    }, 10);
  },

  /**
   * Fade out an element
   */
  fadeOut(element, duration = 500) {
    element.style.transition = `opacity ${duration}ms`;
    element.style.opacity = '0';

    setTimeout(() => {
      element.style.display = 'none';
    }, duration);
  },

  /**
   * Show a success message
   */
  showSuccess(message, duration = 3000) {
    this.showNotification(message, 'success', duration);
  },

  /**
   * Show an error message
   */
  showError(message, duration = 3000) {
    this.showNotification(message, 'error', duration);
  },

  /**
   * Show a warning message
   */
  showWarning(message, duration = 3000) {
    this.showNotification(message, 'warning', duration);
  },

  /**
   * Show a notification toast
   */
  showNotification(message, type = 'info', duration = 3000) {
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.textContent = message;

    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      padding: 15px 25px;
      background: var(--secondary-bg);
      border: 2px solid ${this.getColorForType(type)};
      border-radius: 6px;
      color: ${this.getColorForType(type)};
      font-family: var(--font-mono);
      font-size: 1rem;
      box-shadow: 0 0 20px ${this.getColorForType(type)}33;
      z-index: 10000;
      animation: slideInRight 0.3s ease-out;
      max-width: 400px;
      word-wrap: break-word;
    `;

    document.body.appendChild(notification);

    setTimeout(() => {
      notification.style.animation = 'fadeOut 0.3s ease-out';
      setTimeout(() => {
        document.body.removeChild(notification);
      }, 300);
    }, duration);
  },

  /**
   * Get color for notification type
   */
  getColorForType(type) {
    const colors = {
      success: '#00ff9f',
      error: '#ff0055',
      warning: '#ffaa00',
      info: '#00ffff'
    };
    return colors[type] || colors.info;
  },

  /**
   * Format time in MM:SS format
   */
  formatTime(milliseconds) {
    const totalSeconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(totalSeconds / 60);
    const seconds = totalSeconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  },

  /**
   * Create a timer that updates an element
   */
  startTimer(element, startTime) {
    const updateTimer = () => {
      const elapsed = Date.now() - startTime;
      element.textContent = this.formatTime(elapsed);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);

    return {
      stop: () => clearInterval(interval),
      getElapsed: () => Date.now() - startTime
    };
  },

  /**
   * Animate a progress bar
   */
  animateProgress(progressBar, targetPercent, duration = 500) {
    progressBar.style.transition = `width ${duration}ms ease`;
    progressBar.style.width = `${targetPercent}%`;
  },

  /**
   * Add a cursor animation to an element
   */
  addCursor(element) {
    const cursor = document.createElement('span');
    cursor.className = 'cursor';
    element.appendChild(cursor);
    return cursor;
  },

  /**
   * Remove cursor animation
   */
  removeCursor(cursor) {
    if (cursor && cursor.parentNode) {
      cursor.parentNode.removeChild(cursor);
    }
  },

  /**
   * Create a matrix rain effect (optional background effect)
   */
  createMatrixRain(canvasId) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const columns = Math.floor(canvas.width / 20);
    const drops = Array(columns).fill(1);

    const characters = '01アイウエオカキクケコサシスセソタチツテト';

    function draw() {
      ctx.fillStyle = 'rgba(10, 14, 39, 0.05)';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      ctx.fillStyle = '#00ff9f';
      ctx.font = '15px monospace';

      for (let i = 0; i < drops.length; i++) {
        const text = characters.charAt(Math.floor(Math.random() * characters.length));
        ctx.fillText(text, i * 20, drops[i] * 20);

        if (drops[i] * 20 > canvas.height && Math.random() > 0.975) {
          drops[i] = 0;
        }
        drops[i]++;
      }
    }

    const interval = setInterval(draw, 33);

    return {
      stop: () => clearInterval(interval)
    };
  },

  /**
   * Sanitize HTML to prevent XSS
   */
  sanitizeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  },

  /**
   * Parse simple markdown to HTML (for challenge descriptions)
   * Handles: `code`, **bold**, ```code blocks```, and preserves line breaks
   */
  parseMarkdown(str) {
    // Trim leading/trailing whitespace
    str = str.trim();

    // Dedent: Remove common leading whitespace from all lines
    const lines = str.split('\n');
    const nonEmptyLines = lines.filter(line => line.trim().length > 0);
    if (nonEmptyLines.length > 1) {
      // Skip first line when calculating indent (it might be on same line as template literal backtick)
      const indents = nonEmptyLines.slice(1).map(line => {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
      });
      const minIndent = Math.min(...indents);
      if (minIndent > 0) {
        // Keep first line as-is, dedent the rest
        const firstLine = lines[0];
        const remainingLines = lines.slice(1).map(line => line.slice(minIndent));
        str = [firstLine, ...remainingLines].join('\n');
      }
    }

    // First escape HTML to prevent injection
    const div = document.createElement('div');
    div.textContent = str;
    let html = div.innerHTML;

    // Convert ```code blocks``` to <pre><code>
    html = html.replace(/```(\w+)?\n([\s\S]*?)```/g, function(match, lang, code) {
      return `<pre class="code-block ${lang || ''}"><code>${code.trim()}</code></pre>`;
    });

    // Convert **bold** to <strong>
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');

    // Convert `code` to <code>
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Convert [[hidden:TEXT]] to a hidden span (for CTF-style challenges)
    html = html.replace(/\[\[hidden:([^\]]+)\]\]/g, '<span class="hidden-flag">$1</span>');

    return html;
  },

  /**
   * Shuffle array (Fisher-Yates algorithm)
   */
  shuffle(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
  },

  /**
   * Debounce function calls
   */
  debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
      const later = () => {
        clearTimeout(timeout);
        func(...args);
      };
      clearTimeout(timeout);
      timeout = setTimeout(later, wait);
    };
  },

  /**
   * Throttle function calls
   */
  throttle(func, limit) {
    let inThrottle;
    return function executedFunction(...args) {
      if (!inThrottle) {
        func(...args);
        inThrottle = true;
        setTimeout(() => inThrottle = false, limit);
      }
    };
  },

  /**
   * Get a random item from an array
   */
  randomItem(array) {
    return array[Math.floor(Math.random() * array.length)];
  },

  /**
   * Create a random ID
   */
  randomId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  }
};

// Export for use in other scripts
if (typeof window !== 'undefined') {
  window.Terminal = Terminal;
}
