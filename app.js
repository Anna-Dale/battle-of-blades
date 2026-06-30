const App = {
  state: {
    screen: 'home',
    playerName: '',
    selectedBeyblade: null,
    selectedBattlefield: null,
    opponentMode: null,
    friendName: '',
    inviteLink: '',
    invitedBy: null,
    tutorialStep: 0,
    round: 1,
    playerWins: 0,
    enemyWins: 0,
    gameStats: null,
    cumulativeStats: {
      powerAttacks: 0,
      dodges: 0,
      criticalHits: 0,
      collisions: 0,
      damageDealt: 0,
      damageTaken: 0,
      roundsWonLowHp: 0
    },
    engine: null
  },

  init() {
    const invite = InviteManager.getInviteFromUrl();
    if (invite.invited) {
      this.state.invitedBy = invite.from;
    }
    this.render();
  },

  setScreen(screen) {
    this.state.screen = screen;
    this.render();
  },

  render() {
    const app = document.getElementById('app');
    switch (this.state.screen) {
      case 'home': app.innerHTML = this.renderHome(); this.renderHomeBlades(); break;
      case 'name': app.innerHTML = this.renderName(); break;
      case 'beyblade': app.innerHTML = this.renderBeybladeSelect(); this.renderBeybladeIcons(); break;
      case 'battlefield': app.innerHTML = this.renderBattlefieldSelect(); break;
      case 'opponent': app.innerHTML = this.renderOpponentSelect(); this.renderInviteLink(); break;
      case 'tutorial': app.innerHTML = this.renderTutorial(); break;
      case 'game': app.innerHTML = this.renderGame(); this.startGameEngine(); break;
      case 'roundResult': app.innerHTML = this.renderRoundResult(); break;
      case 'results': app.innerHTML = this.renderResults(); break;
    }
    this.bindEvents();
  },

  bindEvents() {
    document.querySelectorAll('[data-action]').forEach(el => {
      el.addEventListener('click', (e) => {
        const action = el.dataset.action;
        this.handleAction(action, el);
      });
    });

    document.querySelectorAll('[data-beyblade]').forEach(el => {
      el.addEventListener('click', () => {
        this.state.selectedBeyblade = BEYBLADES.find(b => b.id === el.dataset.beyblade);
        this.render();
      });
    });

    document.querySelectorAll('[data-battlefield]').forEach(el => {
      el.addEventListener('click', () => {
        this.state.selectedBattlefield = BATTLEFIELDS.find(b => b.id === el.dataset.battlefield);
        this.render();
      });
    });

    const nameInput = document.getElementById('playerName');
    if (nameInput) {
      nameInput.addEventListener('input', (e) => {
        this.state.playerName = e.target.value.trim();
        const btn = document.getElementById('confirmName');
        if (btn) btn.disabled = this.state.playerName.length < 1;
      });
      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && this.state.playerName.length >= 1) this.setScreen('beyblade');
      });
    }

    const friendInput = document.getElementById('friendName');
    if (friendInput) {
      friendInput.addEventListener('input', (e) => {
        this.state.friendName = e.target.value.trim();
      });
    }
  },

  handleAction(action, el) {
    switch (action) {
      case 'start': this.setScreen('name'); break;
      case 'confirmName':
        if (this.state.playerName.length >= 1) this.setScreen('beyblade');
        break;
      case 'confirmBeyblade':
        if (this.state.selectedBeyblade) this.setScreen('battlefield');
        break;
      case 'confirmBattlefield':
        if (this.state.selectedBattlefield) this.setScreen('opponent');
        break;
      case 'selectBot':
        this.state.opponentMode = 'bot';
        this.render();
        break;
      case 'selectFriend':
        this.state.opponentMode = 'friend';
        this.state.inviteLink = InviteManager.generateLink(this.state.playerName);
        this.render();
        break;
      case 'copyLink':
        this.copyInviteLink();
        break;
      case 'confirmOpponent':
        this.state.tutorialStep = 0;
        this.setScreen('tutorial');
        break;
      case 'tutorialNext':
        if (this.state.tutorialStep < TUTORIAL_SLIDES.length - 1) {
          this.state.tutorialStep++;
          this.render();
        } else {
          this.resetMatch();
          this.setScreen('game');
        }
        break;
      case 'nextRound':
        this.state.round++;
        this.setScreen('game');
        break;
      case 'playAgain':
        this.resetAll();
        this.setScreen('home');
        break;
    }
  },

  resetMatch() {
    this.state.round = 1;
    this.state.playerWins = 0;
    this.state.enemyWins = 0;
    this.state.cumulativeStats = {
      powerAttacks: 0, dodges: 0, criticalHits: 0,
      collisions: 0, damageDealt: 0, damageTaken: 0, roundsWonLowHp: 0
    };
  },

  resetAll() {
    this.resetMatch();
    this.state.playerName = '';
    this.state.selectedBeyblade = null;
    this.state.selectedBattlefield = null;
    this.state.opponentMode = null;
    this.state.friendName = '';
    this.state.inviteLink = '';
    this.state.invitedBy = null;
    this.state.tutorialStep = 0;
  },

  getEnemyBeyblade() {
    const available = BEYBLADES.filter(b => b.id !== this.state.selectedBeyblade.id);
    return available[Math.floor(Math.random() * available.length)];
  },

  getEnemyName() {
    if (this.state.opponentMode === 'friend' && this.state.friendName) {
      return this.state.friendName;
    }
    const names = ['Blade Master', 'Spin King', 'Storm Rider', 'Turbo Titan', 'Neon Ninja'];
    return names[Math.floor(Math.random() * names.length)];
  },

  getInviteLink() {
    if (!this.state.inviteLink && this.state.playerName) {
      this.state.inviteLink = InviteManager.generateLink(this.state.playerName);
    }
    return this.state.inviteLink || InviteManager.generateLink(this.state.playerName || 'Blader');
  },

  copyInviteLink() {
    const link = this.getInviteLink();
    navigator.clipboard.writeText(link).then(() => {
      const status = document.getElementById('inviteStatus');
      if (status) status.textContent = '📋 Link copied! Text or send it to your friend.';
    });
  },

  renderInviteLink() {
    if (this.state.opponentMode !== 'friend') return;
    const linkEl = document.getElementById('inviteLink');
    if (linkEl) linkEl.value = this.getInviteLink();
  },

  renderBeybladeIcons() {
    document.querySelectorAll('[data-bey-canvas]').forEach(canvas => {
      const id = canvas.dataset.beyCanvas;
      const bey = BEYBLADES.find(b => b.id === id);
      if (bey) BeybladeRenderer.drawToCanvas(canvas, bey, 56);
    });
    const preview = document.getElementById('beyPreviewCanvas');
    if (preview && this.state.selectedBeyblade) {
      BeybladeRenderer.drawToCanvas(preview, this.state.selectedBeyblade, 80);
    }
  },

  renderHomeBlades() {
    document.querySelectorAll('[data-home-bey]').forEach(canvas => {
      const id = canvas.dataset.homeBey;
      const bey = BEYBLADES.find(b => b.id === id);
      if (bey) BeybladeRenderer.drawToCanvas(canvas, bey, parseInt(canvas.dataset.size || 80));
    });
  },

  startGameEngine() {
    if (this.state.engine) this.state.engine.destroy();

    const canvas = document.getElementById('gameCanvas');
    if (!canvas) return;

    const enemyBeyblade = this.getEnemyBeyblade();

    this.state.engine = new GameEngine(canvas, {
      playerName: this.state.playerName,
      enemyName: this.getEnemyName(),
      playerBeyblade: this.state.selectedBeyblade,
      enemyBeyblade,
      battlefield: this.state.selectedBattlefield,
      onUpdate: (player, enemy, power) => {
        this.updateHUD(player, enemy, power);
      },
      onRoundEnd: (playerWon, stats) => {
        Object.keys(stats).forEach(k => {
          this.state.cumulativeStats[k] += stats[k];
        });
        if (playerWon) this.state.playerWins++;
        else this.state.enemyWins++;

        if (this.state.playerWins >= 2 || this.state.enemyWins >= 2) {
          this.state.gameStats = { ...this.state.cumulativeStats };
          this.setScreen('results');
        } else {
          this.state.lastRoundWon = playerWon;
          this.setScreen('roundResult');
        }
      }
    });

    setTimeout(() => {
      this.showRoundOverlay(`ROUND ${this.state.round}`, () => {
        this.state.engine.initRound(this.state.round);
      });
    }, 300);
  },

  showRoundOverlay(text, callback) {
    const overlay = document.getElementById('roundOverlay');
    const textEl = document.getElementById('roundOverlayText');
    if (overlay && textEl) {
      textEl.textContent = text;
      overlay.style.display = 'flex';
      setTimeout(() => {
        overlay.style.display = 'none';
        if (callback) callback();
      }, 1500);
    } else if (callback) {
      callback();
    }
  },

  updateHUD(player, enemy, power) {
    const pHearts = document.getElementById('playerHearts');
    const eHearts = document.getElementById('enemyHearts');
    const powerFill = document.getElementById('powerFill');

    if (pHearts) {
      pHearts.innerHTML = this.renderHearts(player.hp, player.maxHp);
    }
    if (eHearts) {
      eHearts.innerHTML = this.renderHearts(enemy.hp, enemy.maxHp);
    }
    if (powerFill) {
      powerFill.style.width = power + '%';
    }
  },

  renderHearts(hp, maxHp) {
    let html = '';
    for (let i = 0; i < maxHp; i++) {
      html += `<span class="heart ${hp <= i ? 'lost' : ''}">❤️</span>`;
    }
    return html;
  },

  getBestTactics() {
    const s = this.state.gameStats || this.state.cumulativeStats;
    const tactics = [];

    if (s.powerAttacks >= 3) {
      tactics.push({ icon: '⚡', label: 'Power Master', desc: `You landed ${s.powerAttacks} charged spin attacks — devastating!` });
    } else if (s.powerAttacks >= 1) {
      tactics.push({ icon: '⚡', label: 'Power Striker', desc: `Nice use of space bar — ${s.powerAttacks} power attack(s) connected.` });
    }

    if (s.dodges >= 10) {
      tactics.push({ icon: '🌀', label: 'Evasion Expert', desc: `${s.dodges} successful dodges — you were untouchable!` });
    } else if (s.dodges >= 5) {
      tactics.push({ icon: '🌀', label: 'Agile Blader', desc: `Smart movement with ${s.dodges} dodges kept you in the fight.` });
    }

    if (s.criticalHits >= 2) {
      tactics.push({ icon: '💥', label: 'Critical Crusher', desc: `${s.criticalHits} critical hits — maximum spin power!` });
    }

    if (s.damageDealt > s.damageTaken * 1.5) {
      tactics.push({ icon: '🎯', label: 'Offensive Dominance', desc: 'You dealt far more damage than you took — aggressive and effective!' });
    } else if (s.damageTaken < s.damageDealt) {
      tactics.push({ icon: '🛡️', label: 'Smart Defense', desc: 'You traded hits wisely and came out ahead on damage.' });
    }

    if (s.roundsWonLowHp >= 1) {
      tactics.push({ icon: '🔥', label: 'Clutch Comeback', desc: 'You won a round while low on health — true blader spirit!' });
    }

    if (tactics.length === 0) {
      tactics.push({ icon: '🏆', label: 'Persistent Fighter', desc: 'You battled through all three rounds — never give up!' });
    }

    return tactics;
  },

  renderHome() {
    const homeBeys = ['sword-dran', 'scythe-incendio', 'soar-phoenix'];
    const positions = [
      { top: '38%', left: '12%', size: 80 },
      { top: '52%', left: '48%', size: 100 },
      { top: '42%', left: '78%', size: 75 }
    ];
    const orbits = homeBeys.map((id, i) => {
      const p = positions[i];
      return `<canvas class="home-beyblade" data-home-bey="${id}" data-size="${p.size}" style="top:${p.top};left:${p.left};width:${p.size}px;height:${p.size}px"></canvas>`;
    }).join('');

    return `
      <div class="screen home-screen">
        <div class="battle-bg">${orbits}</div>
        <h1 class="home-title">BATTLE<br>OF BLADES</h1>
        <button class="start-btn" data-action="start">START GAME</button>
      </div>
    `;
  },

  renderName() {
    const inviteBanner = this.state.invitedBy ? `
      <p style="text-align:center;color:var(--gold);margin-bottom:1rem;font-size:1rem">
        💌 You've been invited by <strong>${this.state.invitedBy}</strong>!
      </p>
    ` : '';

    return `
      <div class="screen center-screen">
        <div class="panel" style="width:min(420px,90vw)">
          <h2 class="screen-header">Enter Your Name</h2>
          ${inviteBanner}
          <input class="input-field" id="playerName" type="text" placeholder="Blader name..." maxlength="20" autofocus />
          <div class="btn-row">
            <button class="btn btn-primary" id="confirmName" data-action="confirmName" disabled>CONFIRM</button>
          </div>
        </div>
      </div>
    `;
  },

  renderBeybladeSelect() {
    const selected = this.state.selectedBeyblade;
    const cards = BEYBLADES.map(b => `
      <div class="beyblade-card ${selected && selected.id === b.id ? 'selected' : ''}" data-beyblade="${b.id}">
        <canvas class="beyblade-icon" data-bey-canvas="${b.id}" width="56" height="56"></canvas>
        <div class="beyblade-name">${b.name}</div>
        <div class="beyblade-type">${b.type}</div>
      </div>
    `).join('');

    const detail = selected ? `
      <div class="beyblade-detail">
        <canvas id="beyPreviewCanvas" width="80" height="80" style="display:block;margin:0 auto 0.8rem"></canvas>
        <h3>${selected.name} — ${selected.type}</h3>
        <p style="font-size:0.85rem;color:var(--text-dim);margin-bottom:0.6rem">${selected.description}</p>
        ${['attack','defense','stamina','speed'].map(stat => `
          <div class="stat-bar">
            <span class="stat-bar-label">${stat.charAt(0).toUpperCase() + stat.slice(1)}</span>
            <div class="stat-bar-track">
              <div class="stat-bar-fill" style="width:${selected.stats[stat]}%;background:${selected.color}"></div>
            </div>
            <span>${selected.stats[stat]}</span>
          </div>
        `).join('')}
        <div class="fan-tip">💡 ${selected.fanTip}</div>
      </div>
    ` : '<div class="beyblade-detail" style="text-align:center;color:var(--text-dim)">Click a Beyblade to see its stats</div>';

    return `
      <div class="screen select-layout" style="background:radial-gradient(ellipse at center,#121830,#0a0e1a)">
        <h2 class="screen-header">Choose Your Beyblade</h2>
        <div class="beyblade-grid">${cards}</div>
        ${detail}
        <button class="btn btn-primary confirm-fixed" data-action="confirmBeyblade" ${!selected ? 'disabled' : ''}>CONFIRM</button>
      </div>
    `;
  },

  renderBattlefieldSelect() {
    const selected = this.state.selectedBattlefield;
    const cards = BATTLEFIELDS.map(bf => `
      <div class="battlefield-card ${selected && selected.id === bf.id ? 'selected' : ''}" data-battlefield="${bf.id}">
        <div class="bf-preview" style="background:${bf.gradient}">${bf.emoji}</div>
        <div class="bf-info">
          <div class="bf-name">${bf.name}</div>
          <div class="bf-desc">${bf.description}</div>
          <div class="bf-month">${bf.month}</div>
        </div>
      </div>
    `).join('');

    return `
      <div class="screen select-layout" style="background:radial-gradient(ellipse at center,#121830,#0a0e1a)">
        <h2 class="screen-header">Choose Your Battlefield</h2>
        <p style="text-align:center;color:var(--text-dim);margin-bottom:1rem;max-width:600px;font-size:0.95rem">
          Each arena celebrates a chapter of our journey together 💕
        </p>
        <div class="battlefield-grid">${cards}</div>
        <button class="btn btn-primary confirm-fixed" data-action="confirmBattlefield" ${!selected ? 'disabled' : ''}>CONFIRM</button>
      </div>
    `;
  },

  renderOpponentSelect() {
    const mode = this.state.opponentMode;
    const inviteSection = mode === 'friend' ? `
      <div class="invite-box panel">
        <h3 style="font-family:Orbitron,sans-serif;font-size:0.9rem;margin-bottom:0.5rem">Share With Your Friend</h3>
        <p style="font-size:0.85rem;color:var(--text-dim);margin-bottom:0.8rem">Copy this link and send it — your friend can play their own battle!</p>
        <div class="invite-link">
          <input class="input-field" id="inviteLink" type="text" readonly value="${this.getInviteLink()}" />
          <button class="btn btn-primary" data-action="copyLink">COPY LINK</button>
        </div>
        <div class="status-msg" id="inviteStatus">Send the link via text, iMessage, or any app!</div>
      </div>
    ` : '';

    return `
      <div class="screen center-screen">
        <h2 class="screen-header">Choose Opponent</h2>
        <div class="mode-cards">
          <div class="mode-card ${mode === 'bot' ? 'selected' : ''}" data-action="selectBot">
            <div class="mode-icon">🤖</div>
            <div class="mode-title">VS BOT</div>
            <div class="mode-desc">Battle an AI opponent — perfect for practice!</div>
          </div>
          <div class="mode-card ${mode === 'friend' ? 'selected' : ''}" data-action="selectFriend">
            <div class="mode-icon">👥</div>
            <div class="mode-title">INVITE FRIEND</div>
            <div class="mode-desc">Get a shareable link to send your friend so they can play too!</div>
          </div>
        </div>
        ${inviteSection}
        <div class="btn-row" style="margin-top:2rem">
          <button class="btn btn-primary" data-action="confirmOpponent" ${!mode ? 'disabled' : ''}>CONTINUE</button>
        </div>
      </div>
    `;
  },

  renderTutorial() {
    const slide = TUTORIAL_SLIDES[this.state.tutorialStep];
    const keys = slide.keys.map(k => `<span class="key">${k}</span>`).join('');
    const dots = TUTORIAL_SLIDES.map((_, i) =>
      `<span class="dot ${i === this.state.tutorialStep ? 'active' : ''}"></span>`
    ).join('');

    return `
      <div class="screen center-screen">
        <div class="panel tutorial-card">
          <div class="tutorial-icon">${slide.icon}</div>
          <h2 class="screen-header">${slide.title}</h2>
          <p class="tutorial-text">${slide.text}</p>
          ${keys ? `<div class="key-hint">${keys}</div>` : ''}
          <div class="tutorial-dots">${dots}</div>
          <button class="btn btn-primary" data-action="tutorialNext">
            ${this.state.tutorialStep < TUTORIAL_SLIDES.length - 1 ? 'NEXT' : 'START BATTLE!'}
          </button>
        </div>
      </div>
    `;
  },

  renderGame() {
    return `
      <div class="screen game-screen">
        <canvas id="gameCanvas"></canvas>
        <div class="hud">
          <div class="hud-player">
            <div class="hud-name">${this.state.playerName}</div>
            <div class="hearts" id="playerHearts">${this.renderHearts(5, 5)}</div>
          </div>
          <div style="text-align:center">
            <div class="round-badge">ROUND ${this.state.round} / 3</div>
            <div class="score-badge" style="margin-top:0.4rem">${this.state.playerWins} - ${this.state.enemyWins}</div>
          </div>
          <div class="hud-player" style="align-items:flex-end">
            <div class="hud-name">${this.getEnemyName()}</div>
            <div class="hearts" id="enemyHearts">${this.renderHearts(5, 5)}</div>
          </div>
        </div>
        <div class="power-label">POWER (HOLD SPACE)</div>
        <div class="power-meter"><div class="power-fill" id="powerFill"></div></div>
        <div class="round-overlay" id="roundOverlay" style="display:none">
          <div class="round-text" id="roundOverlayText">ROUND 1</div>
        </div>
      </div>
    `;
  },

  renderRoundResult() {
    const won = this.state.lastRoundWon;
    return `
      <div class="screen center-screen">
        <div class="panel" style="text-align:center;width:min(420px,90vw)">
          <div style="font-size:4rem;margin-bottom:1rem">${won ? '🏆' : '💫'}</div>
          <h2 class="screen-header">${won ? 'ROUND WON!' : 'ROUND LOST'}</h2>
          <p style="color:var(--text-dim);margin:1rem 0">
            Score: ${this.state.playerWins} - ${this.state.enemyWins} &nbsp;|&nbsp; Best of 3
          </p>
          <button class="btn btn-primary" data-action="nextRound">NEXT ROUND</button>
        </div>
      </div>
    `;
  },

  renderResults() {
    const won = this.state.playerWins > this.state.enemyWins;
    const tactics = this.getBestTactics();

    return `
      <div class="screen results-screen">
        <div class="results-title">${won ? '🏆 VICTORY!' : '💫 DEFEAT'}</div>
        <div class="results-sub">${won ? 'Let it rip! You are the champion!' : 'Great battle! Every blader grows stronger.'}</div>
        <div class="winner-banner">${this.state.playerName} ${this.state.playerWins} — ${this.state.enemyWins} ${this.getEnemyName()}</div>

        <div class="scoreboard">
          <h3>📊 Match Stats</h3>
          <div class="score-row"><span>Power Attacks</span><span>${this.state.gameStats.powerAttacks}</span></div>
          <div class="score-row"><span>Dodges</span><span>${this.state.gameStats.dodges}</span></div>
          <div class="score-row"><span>Critical Hits</span><span>${this.state.gameStats.criticalHits}</span></div>
          <div class="score-row"><span>Total Collisions</span><span>${this.state.gameStats.collisions}</span></div>
          <div class="score-row"><span>Damage Dealt</span><span>${this.state.gameStats.damageDealt.toFixed(1)}</span></div>
          <div class="score-row"><span>Damage Taken</span><span>${this.state.gameStats.damageTaken.toFixed(1)}</span></div>
        </div>

        <div class="scoreboard">
          <h3>🎯 Best Tactics</h3>
          ${tactics.map(t => `
            <div class="tactic-item">
              <span class="tactic-icon">${t.icon}</span>
              <div><span class="tactic-label">${t.label}</span> — ${t.desc}</div>
            </div>
          `).join('')}
        </div>

        <button class="btn btn-accent" data-action="playAgain" style="font-size:1.1rem;padding:1rem 3rem">PLAY AGAIN</button>
      </div>
    `;
  }
};

document.addEventListener('DOMContentLoaded', () => {
  App.init();
});
