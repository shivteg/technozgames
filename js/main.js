/**
 * TechnozGames - UI Coordinator & Application Entry
 * Handles modals, score calculations, leaderboards, sound settings, and game launch.
 */

class TechnozUI {
  constructor() {
    this.game = null;
    this.leaderboardKey = 'technoz_battle_leaderboard';
    this.selectedMode = 'pvcpu';
    this.selectedDifficulty = 'medium';

    this.initDOM();
    this.initLeaderboardStorage();
  }

  init(gameInstance) {
    this.game = gameInstance;
  }

  initDOM() {
    // Buttons in Header
    const btnMode = document.getElementById('btn-mode-select');
    const btnControls = document.getElementById('btn-controls');
    const btnScores = document.getElementById('btn-leaderboard');
    const btnAudio = document.getElementById('btn-audio-toggle');
    const btnFullscreen = document.getElementById('btn-fullscreen');

    // Modals
    const modalMode = document.getElementById('modal-mode');
    const modalControls = document.getElementById('modal-controls');
    const modalResults = document.getElementById('modal-match-results');
    const modalScores = document.getElementById('modal-leaderboard');

    // Close buttons
    document.getElementById('btn-close-mode')?.addEventListener('click', () => modalMode.classList.add('hidden'));
    document.getElementById('btn-close-controls')?.addEventListener('click', () => modalControls.classList.add('hidden'));
    document.getElementById('btn-close-leaderboard')?.addEventListener('click', () => modalScores.classList.add('hidden'));
    document.getElementById('btn-close-scores')?.addEventListener('click', () => modalScores.classList.add('hidden'));

    // Open Modal listeners
    btnMode?.addEventListener('click', () => modalMode.classList.remove('hidden'));
    btnControls?.addEventListener('click', () => modalControls.classList.remove('hidden'));
    btnScores?.addEventListener('click', () => {
      this.renderLeaderboard();
      modalScores.classList.remove('hidden');
    });

    // Sound toggle
    btnAudio?.addEventListener('click', () => {
      if (window.soundEngine) {
        const isMuted = !window.soundEngine.toggleMute();
        const icon = document.getElementById('audio-icon');
        if (icon) icon.textContent = isMuted ? '🔇' : '🔊';
      }
    });

    // Fullscreen toggle
    btnFullscreen?.addEventListener('click', () => {
      if (!document.fullscreenElement) {
        document.documentElement.requestFullscreen().catch(() => {});
      } else {
        document.exitFullscreen().catch(() => {});
      }
    });

    // Mode Card Selection
    const modeCards = document.querySelectorAll('.mode-card');
    modeCards.forEach(card => {
      card.addEventListener('click', () => {
        modeCards.forEach(c => c.classList.remove('selected'));
        card.classList.add('selected');
        this.selectedMode = card.getAttribute('data-mode');
      });
    });

    // Difficulty dropdown
    const diffSelect = document.getElementById('ai-difficulty');
    diffSelect?.addEventListener('change', (e) => {
      this.selectedDifficulty = e.target.value;
    });

    // Start Selected Mode button
    document.getElementById('btn-start-selected-mode')?.addEventListener('click', () => {
      modalMode.classList.add('hidden');
      if (this.game) {
        this.game.setMode(this.selectedMode, this.selectedDifficulty);
        this.game.startNewMatch();
      }
    });

    // Results screen buttons
    document.getElementById('btn-results-rematch')?.addEventListener('click', () => {
      modalResults.classList.add('hidden');
      if (this.game) {
        this.game.startNewMatch();
      }
    });

    document.getElementById('btn-results-menu')?.addEventListener('click', () => {
      modalResults.classList.add('hidden');
      modalMode.classList.remove('hidden');
    });

    // Pause menu buttons
    document.getElementById('btn-resume')?.addEventListener('click', () => {
      if (this.game) this.game.togglePause();
    });

    document.getElementById('btn-restart-match')?.addEventListener('click', () => {
      const pauseOverlay = document.getElementById('pause-overlay');
      if (pauseOverlay) pauseOverlay.classList.add('hidden');
      if (this.game) {
        this.game.roundState = 'fighting';
        this.game.startNewMatch();
      }
    });

    document.getElementById('btn-quit-menu')?.addEventListener('click', () => {
      const pauseOverlay = document.getElementById('pause-overlay');
      if (pauseOverlay) pauseOverlay.classList.add('hidden');
      modalMode.classList.remove('hidden');
    });

    // Clear scores button
    document.getElementById('btn-clear-scores')?.addEventListener('click', () => {
      localStorage.removeItem(this.leaderboardKey);
      this.initLeaderboardStorage();
      this.renderLeaderboard();
    });

    // Set initial audio icon state
    if (window.soundEngine && window.soundEngine.muted) {
      const icon = document.getElementById('audio-icon');
      if (icon) icon.textContent = '🔇';
    }
  }

  showMatchResults(victor, runnerUp, p1, p2) {
    const modal = document.getElementById('modal-match-results');
    if (!modal) return;

    // Winner Headline
    const headline = document.getElementById('results-winner-name');
    if (headline) {
      headline.textContent = `${victor.name.toUpperCase()} WINS!`;
      headline.style.color = victor.themeColor;
    }

    // Winner & Runner Up Badges
    const p1Badge = document.getElementById('p1-win-tag');
    const p2Badge = document.getElementById('p2-win-tag');
    if (p1Badge && p2Badge) {
      if (victor.id === 1) {
        p1Badge.textContent = '👑 CHAMPION';
        p1Badge.className = 'results-badge';
        p2Badge.textContent = 'RUNNER UP';
        p2Badge.className = 'results-badge badge-runner';
      } else {
        p2Badge.textContent = '👑 CHAMPION';
        p2Badge.className = 'results-badge';
        p1Badge.textContent = 'RUNNER UP';
        p1Badge.className = 'results-badge badge-runner';
      }
    }

    // Populate Detailed Score & Combat Calculation Breakdown
    // P1 Stats
    document.getElementById('res-p1-rounds').textContent = p1.roundsWon;
    document.getElementById('res-p1-damage').textContent = p1.damageDealt;
    document.getElementById('res-p1-hits').textContent = p1.hitsLanded;
    document.getElementById('res-p1-combo').textContent = `${p1.maxCombo}x`;
    document.getElementById('res-p1-combat-pts').textContent = p1.hitsLanded * 100 + p1.damageDealt * 2;
    document.getElementById('res-p1-bonus-pts').textContent = `+${Math.max(0, p1.points - (p1.hitsLanded * 100 + p1.damageDealt * 2))}`;
    document.getElementById('res-p1-total-pts').textContent = p1.points;

    // P2 Stats
    document.getElementById('res-p2-rounds').textContent = p2.roundsWon;
    document.getElementById('res-p2-damage').textContent = p2.damageDealt;
    document.getElementById('res-p2-hits').textContent = p2.hitsLanded;
    document.getElementById('res-p2-combo').textContent = `${p2.maxCombo}x`;
    document.getElementById('res-p2-combat-pts').textContent = p2.hitsLanded * 100 + p2.damageDealt * 2;
    document.getElementById('res-p2-bonus-pts').textContent = `+${Math.max(0, p2.points - (p2.hitsLanded * 100 + p2.damageDealt * 2))}`;
    document.getElementById('res-p2-total-pts').textContent = p2.points;

    // Save to Leaderboard
    this.recordScore(victor, p1, p2);

    // Reveal modal
    modal.classList.remove('hidden');
  }

  initLeaderboardStorage() {
    if (!localStorage.getItem(this.leaderboardKey)) {
      const defaultRecords = [
        { champion: 'Volt Striker', mode: 'PvCPU (Master)', rounds: '2 - 1', points: 12450, date: '2026-10-18' },
        { champion: 'Crimson Titan', mode: 'PvCPU (Warrior)', rounds: '2 - 0', points: 9800, date: '2026-10-17' },
        { champion: 'Volt Striker', mode: '2-Player Local', rounds: '2 - 0', points: 8750, date: '2026-10-15' }
      ];
      localStorage.setItem(this.leaderboardKey, JSON.stringify(defaultRecords));
    }
  }

  recordScore(victor, p1, p2) {
    try {
      const records = JSON.parse(localStorage.getItem(this.leaderboardKey)) || [];
      const modeStr = this.selectedMode === 'pvcpu' ? `PvCPU (${this.selectedDifficulty})` : (this.selectedMode === 'pvp' ? '2-Player Local' : 'Training');
      
      const newEntry = {
        champion: victor.name,
        mode: modeStr,
        rounds: `${p1.roundsWon} - ${p2.roundsWon}`,
        points: victor.points,
        date: new Date().toISOString().split('T')[0]
      };

      records.push(newEntry);
      // Sort descending by points
      records.sort((a, b) => b.points - a.points);
      // Keep top 15
      const trimmed = records.slice(0, 15);
      localStorage.setItem(this.leaderboardKey, JSON.stringify(trimmed));
    } catch (e) {
      console.error('Failed to record score in leaderboard:', e);
    }
  }

  renderLeaderboard() {
    const tbody = document.getElementById('leaderboard-body');
    if (!tbody) return;

    try {
      const records = JSON.parse(localStorage.getItem(this.leaderboardKey)) || [];
      tbody.innerHTML = '';

      if (records.length === 0) {
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center; color:#888;">No battle records found yet. Fight and make history!</td></tr>';
        return;
      }

      records.forEach((rec, idx) => {
        const tr = document.createElement('tr');
        const rankMedal = idx === 0 ? '🥇' : (idx === 1 ? '🥈' : (idx === 2 ? '🥉' : `#${idx + 1}`));
        tr.innerHTML = `
          <td>${rankMedal}</td>
          <td><b>${rec.champion}</b></td>
          <td>${rec.mode}</td>
          <td>${rec.rounds}</td>
          <td><b>${rec.points.toLocaleString()} PTS</b></td>
          <td>${rec.date}</td>
        `;
        tbody.appendChild(tr);
      });
    } catch (e) {
      console.error('Error rendering leaderboard:', e);
    }
  }
}

// Global UI Instance
window.technozUI = new TechnozUI();

// Initialize Game when DOM is Ready
window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('gameCanvas');
  if (canvas) {
    const game = new GameEngine(canvas);
    window.technozUI.init(game);
    game.startNewMatch();
    game.run();
  }
});
