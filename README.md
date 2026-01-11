# 🎮 Puzzle Hunt Challenge

A real-time multiplayer puzzle hunt game where teams compete to solve challenges and discover the master password.

## 🎯 Game Overview

**Mission**: Solve all challenges to collect password fragments and complete the game.

**Objective**:
- Solve challenges sequentially (unlock them in order)
- Each challenge reveals one letter of the master password
- Enter the complete password to win
- Compete against other teams in real-time

**Default Password**: `FIREWALL` (8 letters, 8 challenges)

## 🎨 Customization

Want to change the password or add your own challenges?

**See [CUSTOMIZATION_GUIDE.md](CUSTOMIZATION_GUIDE.md) for detailed instructions!**

Quick start:
1. Edit `server/challenges.js` to change the password
2. Add/modify challenges in the same file
3. Restart the server

## 🚀 Quick Start

### Prerequisites
- Node.js (v14 or higher)
- npm (v6 or higher)

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd hunt
```

2. Install dependencies:
```bash
npm install
```

3. Create environment file (optional):
```bash
cp .env.example .env
```

4. Start the server:
```bash
npm start
```

5. Open your browser and navigate to:
```
http://localhost:3000
```

## 🎮 How to Play

### For Players

1. **Registration**: Enter your team name on the landing page
2. **Challenges**: Solve security challenges sequentially (Challenge 1 → 2 → 3...)
3. **Password Building**: Each solved challenge reveals one letter
4. **Final Password**: Once all 8 challenges are solved, enter the master password
5. **Victory**: Complete the breach and view your time on the leaderboard!

### For Game Masters

- **View Live Progress**: Open `/leaderboard.html` to see all teams' progress in real-time
- **Multiple Sessions**: Each team name creates a separate session
- **Auto-Sync**: All progress syncs automatically across all connected clients

## 📁 Project Structure

```
hunt/
├── server/
│   ├── server.js          # Main Express + Socket.IO server
│   ├── gameState.js       # In-memory game state management
│   └── challenges.js      # Challenge definitions and validation
├── public/
│   ├── index.html         # Landing page / team registration
│   ├── game.html          # Main game interface
│   ├── leaderboard.html   # Live leaderboard
│   ├── victory.html       # Victory celebration page
│   ├── css/
│   │   ├── theme.css      # Global terminal theme
│   │   ├── game.css       # Game interface styles
│   │   └── leaderboard.css# Leaderboard styles
│   └── js/
│       ├── socket-client.js # Socket.IO wrapper
│       ├── terminal.js      # Terminal effects utilities
│       ├── game.js          # Game logic
│       └── leaderboard.js   # Leaderboard logic
├── package.json
├── .env.example
└── README.md
```

## 🧩 Challenge Types

The game includes 8 diverse challenges:

1. **Binary Breach** - Decode binary sequences
2. **Index Intrusion** - Array manipulation
3. **Recursive Riddle** - Code tracing
4. **Cipher Sequence** - Pattern recognition
5. **Logic Gate Lock** - Boolean logic
6. **ASCII Assault** - Character encoding
7. **Lambda Lock** - Functional programming
8. **SQL Injection** - Database security

## 🔧 Configuration

### Environment Variables

Create a `.env` file based on `.env.example`:

```env
PORT=3000                # Server port (default: 3000)
NODE_ENV=development     # Environment mode
```

### Game Settings

Modify these in `server/gameState.js` and `server/challenges.js`:

- **Rate Limiting**: 1 submission per second per team (adjustable in `gameState.js`)
- **Challenge Order**: Sequential unlocking (must solve Challenge N to unlock N+1)
- **Master Password**: Defined in `challenges.js`

## 🌐 API Endpoints

### REST API

- `POST /api/team/register` - Register a new team
- `GET /api/leaderboard` - Get current leaderboard
- `GET /api/team/:teamName` - Get team progress
- `GET /api/challenges` - Get all challenges (without answers)

### Socket.IO Events

**Client → Server:**
- `registerTeam` - Register a team
- `submitAnswer` - Submit challenge answer
- `submitPassword` - Submit final password
- `requestGameState` - Request team state
- `requestLeaderboard` - Request leaderboard

**Server → Client:**
- `registrationResult` - Team registration result
- `challengeResult` - Challenge submission result
- `passwordResult` - Password submission result
- `gameState` - Current game state
- `leaderboardUpdate` - Leaderboard updates
- `teamVictory` - Victory announcement

## 🎨 Features

### Real-Time Multiplayer
- Live leaderboard updates
- Instant challenge validation
- Team victory notifications
- WebSocket-based communication

### Terminal Theme
- Cyberpunk/hacker aesthetic
- Glitch effects
- Matrix-style backgrounds
- Neon color scheme
- Scanline effects

### Progress Tracking
- Visual password assembly
- Challenge unlock progression
- Time tracking
- Attempt counting

### Security
- Input sanitization
- Rate limiting
- XSS prevention
- No answer exposure in client code

## 🧪 Testing

### Single Team Testing

1. Open `http://localhost:3000`
2. Register as "Team Alpha"
3. Solve challenges and test gameplay

### Multiple Team Testing

1. Open multiple browser windows/tabs or use incognito mode
2. Register different team names in each
3. Verify real-time leaderboard updates
4. Test concurrent challenge solving

### Answers (for testing):

1. Challenge 1: `F`
2. Challenge 2: `I`
3. Challenge 3: `R`
4. Challenge 4: `E`
5. Challenge 5: `W`
6. Challenge 6: `A`
7. Challenge 7: `L`
8. Challenge 8: `L`
9. Final Password: `FIREWALL`

## 🔄 Development

### Running in Development Mode

```bash
npm run dev
```

### Code Structure

- **Server**: Node.js + Express + Socket.IO
- **State Management**: In-memory (resets on server restart)
- **Client**: Vanilla JavaScript (no framework dependencies)
- **Styling**: CSS with CSS Variables

## 🚢 Deployment

### Heroku Deployment

1. Create a Heroku app
2. Set environment variables
3. Deploy:
```bash
git push heroku main
```

### Other Platforms

The app works on any Node.js hosting platform:
- Render
- Railway
- DigitalOcean App Platform
- AWS Elastic Beanstalk
- Google Cloud Run

Just ensure:
- Node.js v14+
- WebSocket support
- PORT environment variable configured

## 🐛 Troubleshooting

### Common Issues

**Teams can't connect:**
- Check if server is running (`npm start`)
- Verify port 3000 is not in use
- Check firewall settings

**Challenges not appearing:**
- Open browser console for errors
- Verify `/api/challenges` endpoint returns data
- Check Socket.IO connection status

**Leaderboard not updating:**
- Verify Socket.IO connection (green indicator)
- Check server logs for errors
- Try refreshing the page

**State resets:**
- The game uses in-memory storage
- State resets when server restarts
- For persistence, add database integration

## 🎯 Future Enhancements

Potential improvements:
- [ ] Database persistence (MongoDB/PostgreSQL)
- [ ] Admin dashboard
- [ ] Custom challenge creation
- [ ] Hint penalty system
- [ ] Team chat/collaboration
- [ ] Achievement badges
- [ ] Sound effects
- [ ] Mobile optimization
- [ ] Difficulty levels
- [ ] Challenge randomization

## 📝 License

MIT License - feel free to use this for educational purposes, events, or competitions!

## 🤝 Contributing

Contributions welcome! Feel free to:
- Report bugs
- Suggest features
- Submit pull requests
- Create new challenges

## 📧 Support

For issues or questions:
- Open an issue on GitHub
- Check existing documentation
- Review the code comments

---

**Built with ❤️ for puzzle hunt enthusiasts**

*Happy Hacking!* 🔐💻✨
