// Basketball Game Manager Pro Application - Enhanced Professional Edition
// This file contains the main application logic, including the newly integrated
// ProfessionalCourtInterface module for advanced stat tracking.

// --- CONSTANTS ---
// These objects store the precise SVG dimensions for FIBA and NBA courts.
const FIBA_DIMS = {
    width: 1500, height: 1400, unitsPerMeter: 100,
    basketX: 750, basketY: 157.5, backboardY: 120, 
    baselineY: 0,
    keyWidth: 490, keyHeight: 580, keyLeftX: 505, keyRightX: 995,
    ftCircleRadius: 180, restrictedRadius: 125,
    threePointRadius: 675, threePointLineX: 90, threePointY: 299.1,
    halfCourtY: 1400,
    logoShotStartY: 1100,
    paintColor: 'rgba(224, 154, 97, 0.5)'
};
const NBA_DIMS = {
    width: 500, height: 470, unitsPerFoot: 10,
    basketX: 250, basketY: 52.5, backboardY: 40, 
    baselineY: 0,
    keyWidth: 160, keyHeight: 190, keyLeftX: 170, keyRightX: 330,
    ftCircleRadius: 60, ftLineY: 190, restrictedRadius: 40,
    threePointRadius: 237.5, threePointLineX: 30, threePointY: 140,
    halfCourtY: 470,
    logoShotStartY: 380,
    paintColor: 'rgba(224, 154, 97, 0.5)'
};

// --- COURT VIEW MODULE ---

/**
 * @class CourtZoneDetector
 * A utility class responsible for identifying the court zone based on SVG coordinates.
 */
class CourtZoneDetector {
    constructor(dims) { this.court = dims; }
    
    detectZone(x, y) {
        const dist = Math.hypot(x - this.court.basketX, y - this.court.basketY);
        if (this.isAtFreeThrowLine(x, y)) return { name: 'free-throw', details: 'Free Throw Line' };
        if (dist <= this.court.restrictedRadius) return { name: 'paint', details: 'Restricted Area' };
        if (this.isInPaint(x, y)) return { name: 'paint', details: 'In the Paint' };
        if (y > this.court.logoShotStartY) return { name: 'logo-shot', details: 'Logo Shot' };
        if (this.isCornerThree(x, y)) return { name: 'corner-three', details: 'Corner 3' };
        if (dist > this.court.threePointRadius) return { name: 'three-point', details: 'Three-Point Range' };
        return { name: 'mid-range', details: 'Mid-Range' };
    }

    isInPaint(x, y) { return x >= this.court.keyLeftX && x <= this.court.keyRightX && y >= this.court.baselineY && y <= this.court.keyHeight; }
    isCornerThree(x, y) { return y <= this.court.threePointY && (x < this.court.threePointLineX || x > (this.court.width - this.court.threePointLineX)); }
    isAtFreeThrowLine(x, y) {
        const ftLineY = this.court.keyHeight;
        return y > ftLineY - 20 && y < ftLineY + 20 && x > this.court.keyLeftX && x < this.court.keyRightX;
    }
}

/**
 * @class ProfessionalCourtInterface
 * Manages all interactions with the basketball court SVG. This is the "view" controller for the court.
 */
class ProfessionalCourtInterface {
    constructor(courtType, onAction) {
        this.onAction = onAction;
        this.actionsToDisplay = [];
        this.settings = { showGhost: true, fadeShot: false, heatmapOpacity: 0.7, isHeatmapVisible: false };
        this.setCourtType(courtType);
        this.setupCourtListeners();
        this.setupMenus();
        this.setupSettingsPanel();
    }

    setCourtType(courtType) {
        this.courtType = courtType;
        this.dims = courtType === 'nba' ? NBA_DIMS : FIBA_DIMS;
        this.zoneDetector = new CourtZoneDetector(this.dims);
        const wrapper = document.getElementById('court-wrapper');
        const svg = document.getElementById('basketballCourt');
        svg.setAttribute('data-court-type', courtType);
        wrapper.style.paddingBottom = `${(this.dims.height / this.dims.width) * 100}%`;
        svg.setAttribute('viewBox', `0 0 ${this.dims.width} ${this.dims.height}`);
        document.querySelectorAll('.court-type-btn').forEach(btn => {
            const isActive = btn.dataset.type === courtType;
            btn.classList.toggle('bg-blue-500', isActive);
            btn.classList.toggle('text-white', isActive);
        });
        this.drawCourt();
        this.render();
    }

    updateActionDisplay(actions) {
        this.actionsToDisplay = actions;
        this.render();
    }

    render() {
        this.settings.isHeatmapVisible ? this.renderHeatmap() : this.clearHeatmap();
        this.renderActionHistory();
    }

    drawCourt() {
        const markings = this.courtType === 'nba' ? this.getNbaMarkings() : this.getFibaMarkings();
        document.getElementById('court-markings').innerHTML = markings;
    }

    getNbaMarkings() {
        const c = this.dims;
        const threePointArcPath = `M ${c.threePointLineX} ${c.baselineY} L ${c.threePointLineX} ${c.threePointY} A ${c.threePointRadius} ${c.threePointRadius} 0 0 0 ${c.width - c.threePointLineX} ${c.threePointY} L ${c.width - c.threePointLineX} ${c.baselineY}`;
        return `
            <rect x="${c.keyLeftX}" y="${c.baselineY}" width="${c.keyWidth}" height="${c.keyHeight}" fill="${c.paintColor}" />
            <line x1="${c.keyLeftX}" y1="${c.baselineY}" x2="${c.keyLeftX}" y2="${c.keyHeight}" stroke="#000000" stroke-width="2"/>
            <line x1="${c.keyRightX}" y1="${c.baselineY}" x2="${c.keyRightX}" y2="${c.keyHeight}" stroke="#000000" stroke-width="2"/>
            <line class="interactive-line" x1="${c.keyLeftX}" y1="${c.keyHeight}" x2="${c.keyRightX}" y2="${c.keyHeight}" stroke="#000000" stroke-width="2"/>
            <path d="M ${c.keyLeftX} ${c.keyHeight} A ${c.ftCircleRadius} ${c.ftCircleRadius} 0 0 1 ${c.keyRightX} ${c.keyHeight}" fill="none" stroke="#000000" stroke-width="2"/>
            <path d="M ${c.keyLeftX} ${c.keyHeight} A ${c.ftCircleRadius} ${c.ftCircleRadius} 0 0 0 ${c.keyRightX} ${c.keyHeight}" fill="none" stroke="#000000" stroke-width="2" stroke-dasharray="8,6"/>
            <path d="M ${c.basketX - c.restrictedRadius} ${c.backboardY} A ${c.restrictedRadius} ${c.restrictedRadius} 0 0 0 ${c.basketX + c.restrictedRadius} ${c.backboardY}" fill="none" stroke="#000000" stroke-width="2" stroke-dasharray="4,4"/>
            <path class="interactive-line" d="${threePointArcPath}" fill="none" stroke="#000000" stroke-width="2" />
            <path d="M ${c.basketX - c.ftCircleRadius*2} ${c.halfCourtY} A ${c.ftCircleRadius*2} ${c.ftCircleRadius*2} 0 0 1 ${c.basketX + c.ftCircleRadius*2} ${c.halfCourtY}" fill="none" stroke="#000000" stroke-width="2"/>
            <rect x="${c.basketX - 30}" y="${c.backboardY}" width="60" height="1" fill="none" stroke="#000000" stroke-width="2"/>
            <circle cx="${c.basketX}" cy="${c.basketY}" r="7.5" fill="none" stroke="#FF6B35" stroke-width="2"/>
            <line x1="0" y1="${c.baselineY}" x2="${c.width}" y2="${c.baselineY}" stroke="#000000" stroke-width="2" />
            <line x1="0" y1="${c.baselineY}" x2="0" y2="${c.halfCourtY}" stroke="#000000" stroke-width="2"/>
            <line x1="${c.width}" y1="${c.baselineY}" x2="${c.width}" y2="${c.halfCourtY}" stroke="#000000" stroke-width="2"/>
            <line x1="0" y1="${c.halfCourtY}" x2="${c.width}" y2="${c.halfCourtY}" stroke="#000000" stroke-width="2" />
        `;
    }

    getFibaMarkings() {
        const c = this.dims;
        const threePointArcPath = `M ${c.threePointLineX} ${c.baselineY} L ${c.threePointLineX} ${c.threePointY} A ${c.threePointRadius} ${c.threePointRadius} 0 0 0 ${c.width - c.threePointLineX} ${c.threePointY} L ${c.width - c.threePointLineX} ${c.baselineY}`;
        return `
            <rect x="${c.keyLeftX}" y="${c.baselineY}" width="${c.keyWidth}" height="${c.keyHeight}" fill="${c.paintColor}" />
            <line x1="${c.keyLeftX}" y1="${c.baselineY}" x2="${c.keyLeftX}" y2="${c.keyHeight}" stroke="#282828" stroke-width="5"/>
            <line x1="${c.keyRightX}" y1="${c.baselineY}" x2="${c.keyRightX}" y2="${c.keyHeight}" stroke="#282828" stroke-width="5"/>
            <line class="interactive-line" x1="${c.keyLeftX}" y1="${c.keyHeight}" x2="${c.keyRightX}" y2="${c.keyHeight}" stroke="#282828" stroke-width="5"/>
            <path d="M ${c.keyLeftX} ${c.keyHeight} A ${c.ftCircleRadius} ${c.ftCircleRadius} 0 0 1 ${c.keyRightX} ${c.keyHeight}" fill="none" stroke="#282828" stroke-width="5"/>
            <path d="M ${c.keyLeftX} ${c.keyHeight} A ${c.ftCircleRadius} ${c.ftCircleRadius} 0 0 0 ${c.keyRightX} ${c.keyHeight}" fill="none" stroke="#282828" stroke-width="5" stroke-dasharray="20,15"/>
            <path d="M ${c.basketX - c.restrictedRadius} ${c.backboardY} A ${c.restrictedRadius} ${c.restrictedRadius} 0 0 0 ${c.basketX + c.restrictedRadius} ${c.backboardY}" fill="none" stroke="#282828" stroke-width="5" stroke-dasharray="10,10"/>
            <path class="interactive-line" d="${threePointArcPath}" fill="none" stroke="#282828" stroke-width="5" />
            <circle cx="${c.basketX}" cy="${c.halfCourtY}" r="${c.ftCircleRadius}" fill="none" stroke="#282828" stroke-width="5"/>
            <line x1="${c.basketX - 90}" y1="${c.backboardY}" x2="${c.basketX + 90}" y2="${c.backboardY}" style="stroke-width: 8; stroke: #6b7280;" />
            <circle cx="${c.basketX}" cy="${c.basketY}" r="22.5" style="stroke-width: 6; stroke: #f97316;" fill="none" />
            <line x1="0" y1="${c.baselineY}" x2="${c.width}" y2="${c.baselineY}" stroke="#282828" stroke-width="5"/>
            <line x1="0" y1="${c.baselineY}" x2="0" y2="${c.halfCourtY}" stroke="#282828" stroke-width="5"/>
            <line x1="${c.width}" y1="${c.baselineY}" x2="${c.width}" y2="${c.halfCourtY}" stroke="#282828" stroke-width="5"/>
            <line x1="0" y1="${c.halfCourtY}" x2="${c.width}" y2="${c.halfCourtY}" stroke="#282828" stroke-width="5"/>
        `;
    }

    setupCourtListeners() {
        const court = document.getElementById('basketballCourt');
        const indicators = { zone: document.getElementById('zoneIndicator'), dist: document.getElementById('distanceIndicator') };
        court.addEventListener('click', e => {
            const p = this.getEventPoint(e);
            this.showSmartRadialMenu(p.svgX, p.svgY, p.screenX, p.screenY);
            this.showSelectionPulse(p.svgX, p.svgY);
        });
        document.addEventListener('click', e => { if (court && !court.contains(e.target)) this.hideRadialMenu(); });
        court.addEventListener('mousemove', e => {
            const p = this.getEventPoint(e);
            const zone = this.zoneDetector.detectZone(p.svgX, p.svgY);
            const dist = this.calculateDistance(p.svgX, p.svgY);
            indicators.zone.textContent = zone.details;
            indicators.dist.textContent = `${dist} ft`;
            Object.values(indicators).forEach(el => el.classList.add('visible'));
            if (this.settings.showGhost) this.showGhostMarker(p.svgX, p.svgY);
        });
        court.addEventListener('mouseleave', () => {
            Object.values(indicators).forEach(el => el.classList.remove('visible'));
            document.getElementById('selection-preview').innerHTML = '';
        });
    }

    renderActionHistory() {
        const historyGroup = document.getElementById('shotHistory');
        historyGroup.innerHTML = ''; 
        let actionsToRender = this.actionsToDisplay;

        if (this.settings.fadeShot) {
            actionsToRender = this.actionsToDisplay.slice(-3);
        }

        actionsToRender.forEach((action, index) => {
            const radius = this.courtType === 'fiba' ? 24 : 8;
            const marker = this.createActionMarker(historyGroup, action, radius, this.courtType);
            if (this.settings.fadeShot) {
                const opacity = 1 - (actionsToRender.length - 1 - index) * 0.35;
                marker.style.opacity = Math.max(0.3, opacity);
            } else {
                marker.style.opacity = 1;
            }
        });
    }

    createActionMarker(parent, action, radius, courtType) {
        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        marker.setAttribute('class', 'shot-history-marker');
        marker.setAttribute('transform', `translate(${action.location.svgX}, ${action.location.svgY})`);
        
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('r', radius);
        circle.setAttribute('stroke', '#ffffff');
        circle.setAttribute('stroke-width', '2');

        let fillColor = '#3b82f6';
        if (action.result === 'make') fillColor = '#10b981';
        else if (action.result === 'miss') fillColor = '#ef4444';
        else if (action.action === 'rebound') fillColor = '#facc15';
        circle.setAttribute('fill', fillColor);
        
        marker.appendChild(circle);

        if (action.playerNumber) {
            const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
            text.setAttribute('text-anchor', 'middle');
            text.setAttribute('dominant-baseline', 'central');
            text.setAttribute('fill', 'white');
            text.setAttribute('font-size', courtType === 'fiba' ? '21px' : '7px');
            text.setAttribute('font-weight', 'bold');
            text.textContent = action.playerNumber;
            marker.appendChild(text);
        }

        parent.appendChild(marker);
        return marker;
    }

    setupMenus() {
        this.primaryActions = {
            'paint': [ { action: 'make2-layup', label: 'Layup ✓', icon: '🏀' }, { action: 'miss2-layup', label: 'Layup ✗', icon: '❌' }, { action: 'rebound', label: 'Rebound', icon: '🙌' }, { action: 'more', label: 'More...', icon: '...' } ],
            'mid-range': [ { action: 'make2-jumper', label: 'Jumper ✓', icon: '🏀' }, { action: 'miss2-jumper', label: 'Jumper ✗', icon: '❌' }, { action: 'rebound', label: 'Rebound', icon: '🙌' }, { action: 'more', label: 'More...', icon: '...' } ],
            'three-point': [ { action: 'make3', label: '3PT ✓', icon: '🎯' }, { action: 'miss3', label: '3PT ✗', icon: '❌' }, { action: 'rebound', label: 'Rebound', icon: '🙌' }, { action: 'more', label: 'More...', icon: '...' } ],
            'corner-three': [ { action: 'make3', label: 'Corner 3 ✓', icon: '🎯' }, { action: 'miss3', label: 'Corner 3 ✗', icon: '❌' }, { action: 'rebound', label: 'Rebound', icon: '🙌' }, { action: 'more', label: 'More...', icon: '...' } ],
            'logo-shot': [ { action: 'make3-logo', label: 'Logo Shot ✓', icon: '🎯' }, { action: 'miss3-logo', label: 'Logo Shot ✗', icon: '❌' } ],
            'free-throw': [ { action: 'make1-ft', label: 'FT ✓', icon: '🎯' }, { action: 'miss1-ft', label: 'FT ✗', icon: '❌' } ]
        };
        this.secondaryActions = {
            'paint': [ { action: 'make2-dunk', label: 'Dunk ✓', icon: '💥' }, { action: 'make2-post', label: 'Post Up ✓', icon: '💪' }, { action: 'miss2-post', label: 'Post Up ✗', icon: '🧱' }, { action: 'make2-floater', label: 'Floater ✓', icon: '💧' }, { action: 'miss2-floater', label: 'Floater ✗', icon: '💨' }, { action: 'assist', label: 'Assist', icon: '🤝' }, { action: 'foul', label: 'Foul', icon: '✋' }, { action: 'back', label: 'Back', icon: '↩️' } ],
            'mid-range': [ { action: 'make2-fadeaway', label: 'Fadeaway ✓', icon: '🏃' }, { action: 'miss2-fadeaway', label: 'Fadeaway ✗', icon: '💨' }, { action: 'assist', label: 'Assist', icon: '🤝' }, { action: 'foul', label: 'Foul', icon: '✋' }, { action: 'back', label: 'Back', icon: '↩️' } ],
            'default': [ { action: 'assist', label: 'Assist', icon: '🤝' }, { action: 'foul', label: 'Foul', icon: '✋' }, { action: 'back', label: 'Back', icon: '↩️' } ]
        };
    }

    showSmartRadialMenu(svgX, svgY, screenX, screenY, isSecondary = false) {
        const zone = this.zoneDetector.detectZone(svgX, svgY);
        let options;
        if (isSecondary) {
            options = this.secondaryActions[zone.name] || this.secondaryActions['mid-range'] || this.secondaryActions['default'];
        } else {
            options = this.primaryActions[zone.name] || this.primaryActions['mid-range'];
        }
        this.renderRadialMenu(options, screenX, screenY, { svgX, svgY });
    }

    renderRadialMenu(options, screenX, screenY, location) {
        const menu = document.getElementById('radialMenu');
        menu.innerHTML = '';
        const radius = 120;
        const angleStep = (Math.PI * 2) / options.length;
        options.forEach((option, index) => {
            const angle = (index * angleStep) - (Math.PI / 2);
            const button = document.createElement('button');
            button.className = 'radial-btn';
            if(option.action.includes('make')) button.classList.add('make');
            else if(option.action.includes('miss')) button.classList.add('miss');
            else button.classList.add('play');
            button.style.transform = `translate(-50%, -50%) translate(${Math.cos(angle) * radius}px, ${Math.sin(angle) * radius}px)`;
            button.innerHTML = `<div class="btn-icon">${option.icon}</div><div class="btn-label">${option.label}</div>`;
            button.onclick = e => { 
                e.stopPropagation(); 
                if (option.action === 'more') this.showSmartRadialMenu(location.svgX, location.svgY, screenX, screenY, true);
                else if (option.action === 'back') this.showSmartRadialMenu(location.svgX, location.svgY, screenX, screenY, false);
                else { this.hideRadialMenu(); this.onAction({ action: option.action, location }); }
            };
            menu.appendChild(button);
        });
        const menuSize = 300;
        let left = screenX; let top = screenY;
        if (screenX - menuSize/2 < 10) left = menuSize/2 + 10;
        if (screenX + menuSize/2 > window.innerWidth - 10) left = window.innerWidth - menuSize/2 - 10;
        if (screenY - menuSize/2 < 10) top = menuSize/2 + 10;
        if (screenY + menuSize/2 > window.innerHeight - 10) top = window.innerHeight - menuSize/2 - 10;
        menu.style.left = `${left}px`;
        menu.style.top = `${top}px`;
        menu.style.transform = `translate(-50%, -50%)`;
        menu.classList.remove('hidden');
    }
    
    hideRadialMenu() { 
        document.getElementById('radialMenu').classList.add('hidden');
        document.getElementById('selection-preview').innerHTML = '';
    }

    setupSettingsPanel() {
        const modal = document.getElementById('settingsModal');
        const openBtn = document.getElementById('openSettingsBtn');
        const closeBtn = document.getElementById('closeSettingsBtn');
        const showModal = () => {
            modal.classList.remove('hidden');
            setTimeout(() => {
                modal.classList.remove('opacity-0');
                modal.querySelector('.transform').classList.remove('scale-95');
            }, 10);
        };
        const hideModal = () => {
            modal.classList.add('opacity-0');
            modal.querySelector('.transform').classList.add('scale-95');
            setTimeout(() => modal.classList.add('hidden'), 200);
        };
        openBtn.addEventListener('click', showModal);
        closeBtn.addEventListener('click', hideModal);
        modal.addEventListener('click', (e) => { if(e.target === modal) hideModal(); });
        document.querySelectorAll('.court-type-btn').forEach(btn => {
            btn.addEventListener('click', () => { this.setCourtType(btn.dataset.type); });
        });
        const setupToggle = (id, settingKey) => {
            const toggle = document.getElementById(id);
            toggle.addEventListener('click', () => {
                this.settings[settingKey] = !this.settings[settingKey];
                toggle.classList.toggle('bg-green-500', this.settings[settingKey]);
                toggle.classList.toggle('bg-gray-200', !this.settings[settingKey]);
                toggle.querySelector('span').classList.toggle('translate-x-5');
                this.render();
            });
        };
        setupToggle('showGhostToggle', 'showGhost');
        setupToggle('fadeShotToggle', 'fadeShot');
        setupToggle('heatmapToggle', 'isHeatmapVisible');
        document.getElementById('heatmapOpacity').addEventListener('input', (e) => {
            this.settings.heatmapOpacity = e.target.value;
            if(this.settings.isHeatmapVisible) this.renderHeatmap();
        });
    }

    renderHeatmap() {
        const canvas = document.getElementById('heatmapCanvas');
        const ctx = canvas.getContext('2d');
        const rect = document.getElementById('basketballCourt').getBoundingClientRect();
        canvas.width = rect.width; canvas.height = rect.height;
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const makes = this.actionsToDisplay.filter(s => s.result === 'make');
        if (!makes.length) return;
        const pointRadius = canvas.width * 0.08;
        makes.forEach(shot => {
            const x = (shot.location.svgX / this.dims.width) * canvas.width;
            const y = (shot.location.svgY / this.dims.height) * canvas.height;
            const g = ctx.createRadialGradient(x, y, 0, x, y, pointRadius);
            g.addColorStop(0, 'rgba(255, 255, 0, 0.5)');
            g.addColorStop(0.5, 'rgba(255, 100, 0, 0.25)');
            g.addColorStop(1, 'rgba(255, 0, 0, 0)');
            ctx.fillStyle = g;
            ctx.beginPath(); ctx.arc(x, y, pointRadius, 0, 2 * Math.PI); ctx.fill();
        });
        canvas.style.opacity = this.settings.heatmapOpacity;
        canvas.classList.remove('hidden');
    }

    clearHeatmap() { document.getElementById('heatmapCanvas').classList.add('hidden'); }
    
    showGhostMarker(svgX, svgY) { document.getElementById('selection-preview').innerHTML = `<circle cx="${svgX}" cy="${svgY}" r="15" fill="rgba(59, 130, 246, 0.5)" stroke="white" stroke-width="2" stroke-dasharray="4" />`; }
    showSelectionPulse(svgX, svgY) { document.getElementById('selection-preview').innerHTML = `<circle cx="${svgX}" cy="${svgY}" r="20" fill="none" stroke="#3b82f6" stroke-width="4" class="pulse-animation" />`; }
    
    calculateDistance(svgX, svgY) {
        const pixelDist = Math.hypot(svgX - this.dims.basketX, svgY - this.dims.basketY);
        const unitsPerFoot = this.courtType === 'nba' ? this.dims.unitsPerFoot : this.dims.unitsPerMeter * 0.3048;
        const feetDist = (pixelDist / unitsPerFoot);
        return feetDist.toFixed(1);
    }

    getEventPoint(e) {
        const svg = e.currentTarget;
        const pt = svg.createSVGPoint();
        pt.x = e.clientX; pt.y = e.clientY;
        const svgP = pt.matrixTransform(svg.getScreenCTM().inverse());
        return { screenX: e.clientX, screenY: e.clientY, svgX: svgP.x, svgY: svgP.y };
    }
}


// --- MAIN APPLICATION CLASS ---

class BasketballGameManagerPro {
    constructor() {
        this.currentGame = null;
        this.currentGameCode = null;
        this.isAdmin = false;
        this.gameUpdateInterval = null;
        this.clockInterval = null;
        this.shotClockInterval = null;
        this.selectedQuickPlayer = null;
        this.selectedCourtPlayer = null;
        this.selectedQuickTeam = 'home';
        this.selectedCourtTeam = 'home';
        this.playByPlayFeed = [];
        this.undoStack = [];
        this.maxUndoStackSize = 20;
        
        // The court interface module will be initialized later, when needed.
        this.courtInterface = null;
    }
    
    init() {
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.setupApplication());
        } else {
            this.setupApplication();
        }
    }

    setupApplication() {
        try {
            this.setupEventListeners();
            this.loadActiveGames();
            this.generateNewGameCode();
            this.setupEnhancedKeyboardShortcuts();
            
            const urlParams = new URLSearchParams(window.location.search);
            const code = urlParams.get('code');
            const mode = urlParams.get('mode');
            
            if (code && mode) {
                this.currentGameCode = code.toUpperCase();
                if (mode === 'viewer') {
                    this.joinGame(code, false);
                    this.switchPage('viewer');
                } else if (mode === 'admin') {
                    this.showPasswordField();
                }
            }
            
            this.startGameUpdates();
        } catch (error) {
            console.error('Error during application setup:', error);
            this.showAlert('Error', 'Error initializing application. Please refresh the page.', 'error');
        }
    }
    
    // --- EVENT LISTENERS SETUP (Main Application) ---
    setupEventListeners() {
        this.setupHomePageEvents();
        this.setupConfigPageEvents();
        this.setupPlayerSetupEvents();
        this.setupControllerEvents();
        this.setupViewerEvents();
        this.setupTabEvents();
        this.setupTeamTabEvents();
        this.setupExportEvents();
        this.setupFoulTimeoutControls();
        this.setupHelpModal();
        
        document.addEventListener('fullscreenchange', () => {
            if (!document.fullscreenElement) document.body.classList.remove('fullscreen');
        });
        
        window.addEventListener('beforeunload', (e) => {
            if (this.currentGame && this.currentGame.status === 'live' && this.isAdmin) {
                e.preventDefault();
                e.returnValue = 'Game is currently live. Are you sure you want to leave?';
            }
        });
    }

    // --- NEW BRIDGE FUNCTION ---
    handleNewCourtAction(data) {
        const player = this.getSelectedPlayer('court');
        if (!player) {
            this.showAlert('Select Player', 'Please select a player for court actions.', 'warning');
            return;
        }

        const { action, location } = data;
        const distance = this.courtInterface.calculateDistance(location.svgX, location.svgY);
        const [outcome, shotType] = action.split('-');
        
        const statEntry = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            playerId: player.id,
            playerNumber: player.number,
            playerName: player.name,
            team: this.selectedCourtTeam,
            action,
            location,
            distance,
            period: this.currentGame.gameState.period,
            gameClock: this.formatTime(this.currentGame.gameState.gameTime),
            timestamp: new Date().toISOString()
        };

        if (outcome.includes('make') || outcome.includes('miss')) {
            statEntry.type = 'shot';
            statEntry.result = outcome.startsWith('make') ? 'make' : 'miss';
            if (outcome.includes('3')) statEntry.points = 3;
            else if (outcome.includes('2')) statEntry.points = 2;
            else if (outcome.includes('1')) statEntry.points = 1;
            else statEntry.points = 0;
            statEntry.shotType = shotType || 'shot';
            this.handleShotAction(statEntry, this.currentGame.stats[player.id], this.selectedCourtTeam);
        } else {
            statEntry.type = action;
            this.handleStatAction(action, this.currentGame.stats[player.id], player);
        }

        this.currentGame.shots.push(statEntry);
        this.addToUndoStack(statEntry);

        this.updateAllDisplays();
        this.updateAnalytics();
        this.updateActionsCount();
        this.saveGame();

        this.courtInterface.updateActionDisplay(this.getAllActionsForTeam(this.selectedCourtTeam));
    }

    // --- MODIFIED/REFACTORED METHODS ---
    setupEnhancedCourtEvents() {
        const courtPlayerSelect = document.getElementById('courtPlayerSelect');
        if (courtPlayerSelect) {
            courtPlayerSelect.addEventListener('change', (e) => {
                this.selectedCourtPlayer = e.target.value;
            });
        }
        
        const undoShotBtn = document.getElementById('undoShotBtn');
        if (undoShotBtn) {
            undoShotBtn.addEventListener('click', (e) => {
                e.preventDefault();
                this.undoLastAction();
            });
        }
    }

    selectCourtTeam(team) {
        this.selectedCourtTeam = team;
        document.querySelectorAll('#courtHomeTab, #courtAwayTab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.team === team);
        });
        this.updateCourtPlayerDropdown();
        if (this.courtInterface) {
            this.courtInterface.updateActionDisplay(this.getAllActionsForTeam(team));
        }
    }

    undoLastAction() {
        if (!this.isAdmin || this.undoStack.length === 0) return;
        
        const undoData = this.undoStack.pop();
        const { action, gameStateBefore, statsBefore, analyticsBefore } = undoData;
        
        this.currentGame.gameState = gameStateBefore;
        this.currentGame.stats = statsBefore;
        this.currentGame.analytics = analyticsBefore;
        
        this.currentGame.shots = this.currentGame.shots.filter(shot => shot.id !== action.id);
        
        this.addPlayByPlayEvent(`Undone: ${action.type} by #${action.playerNumber} ${action.playerName}`);
        
        this.updateAllDisplays();
        this.updateAnalytics();
        this.updateActionsCount();
        this.saveGame();
        
        this.courtInterface.updateActionDisplay(this.getAllActionsForTeam(this.selectedCourtTeam));
        
        this.showAlert('Action Undone', '', 'success');
    }

    loadExistingActions() {
        if (!this.currentGame || !this.currentGame.shots) return;
        if (this.courtInterface) {
            this.courtInterface.updateActionDisplay(this.getAllActionsForTeam(this.selectedCourtTeam));
        }
        this.updateActionsCount();
    }
    
    // --- HELPER METHODS ---
    getSelectedPlayer(type = 'quick') {
        const playerId = type === 'court' ? this.selectedCourtPlayer : this.selectedQuickPlayer;
        if (!playerId) return null;
        return this.getPlayerById(playerId);
    }
    
    updateActionsCount() {
        const count = this.currentGame && this.currentGame.shots ? this.currentGame.shots.length : 0;
        const countEl = document.getElementById('shotsCount');
        if (countEl) {
            countEl.textContent = `Actions: ${count}`;
        }
    }

    getAllActionsForTeam(teamId) {
        if (!this.currentGame || !this.currentGame.shots) return [];
        return this.currentGame.shots.filter(action => action.team === teamId);
    }
    
    // --- PAGE NAVIGATION (MODIFIED) ---
    switchPage(pageName) {
        console.log('Switching to page:', pageName);
        document.querySelectorAll('.page').forEach(page => {
            page.classList.remove('active');
        });
        
        const targetPage = document.getElementById(`${pageName}Page`);
        if (targetPage) {
            targetPage.classList.add('active');
        } else {
            console.error('Page not found:', pageName);
        }
        
        const url = new URL(window.location);
        if (pageName === 'viewer' && this.currentGameCode) {
            url.searchParams.set('code', this.currentGameCode);
            url.searchParams.set('mode', 'viewer');
        } else {
            url.searchParams.delete('code');
            url.searchParams.delete('mode');
        }
        window.history.replaceState({}, '', url);
        
        // **FIX**: Initialize court interface only when switching to the controller page
        if (pageName === 'controller' && !this.courtInterface) {
            this.courtInterface = new ProfessionalCourtInterface('fiba', (actionData) => {
                this.handleNewCourtAction(actionData);
            });
        }
        
        if (pageName === 'controller') {
            setTimeout(() => {
                this.loadExistingActions();
                this.updatePlayByPlayDisplay();
                this.updateAnalytics();
                this.updatePlayerSelects();
            }, 100);
        }
    }

    // --- ALL OTHER ORIGINAL METHODS FROM app.js GO HERE ---
    // (For brevity, only the modified/new methods are shown in full detail.
    // The following is a placeholder for the rest of the original code.)

    setupFoulTimeoutControls() {
        document.querySelectorAll('.stat-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                const team = btn.dataset.team;
                const stat = btn.dataset.stat;
                const isIncrement = btn.classList.contains('stat-plus');
                
                this.adjustTeamStat(team, stat, isIncrement ? 1 : -1);
            });
        });
    }
    setupHelpModal() {
        const helpModal = document.getElementById('shortcutsModal');
        const closeBtn = document.getElementById('closeShortcutsBtn');
        if (closeBtn) closeBtn.addEventListener('click', () => this.hideShortcutsModal());
        if (helpModal) {
            const backdrop = helpModal.querySelector('.modal-backdrop');
            const modalClose = helpModal.querySelector('.modal-close');
            if (backdrop) backdrop.addEventListener('click', () => this.hideShortcutsModal());
            if (modalClose) modalClose.addEventListener('click', () => this.hideShortcutsModal());
        }
    }
    adjustTeamStat(team, stat, adjustment) {
        if (!this.isAdmin || !this.currentGame) return;
        const currentValue = this.currentGame.gameState[stat][team];
        const newValue = Math.max(0, currentValue + adjustment);
        if (typeof Swal !== 'undefined') {
            if (stat === 'fouls' && newValue > this.currentGame.settings.foulLimit && adjustment > 0) {
                Swal.fire({
                    title: 'Foul Limit Exceeded!',
                    text: `${this.currentGame.teams[team].name} has reached the foul limit (${this.currentGame.settings.foulLimit}).`,
                    icon: 'warning',
                    confirmButtonText: 'Add Anyway',
                    showCancelButton: true,
                    cancelButtonText: 'Cancel'
                }).then((result) => {
                    if (result.isConfirmed) this.applyStatAdjustment(team, stat, newValue);
                });
                return;
            }
            if (stat === 'timeouts' && newValue < 0) {
                Swal.fire({ title: 'No Timeouts Remaining', text: `${this.currentGame.teams[team].name} has no timeouts left.`, icon: 'error', confirmButtonText: 'OK' });
                return;
            }
        }
        this.applyStatAdjustment(team, stat, newValue);
    }
    applyStatAdjustment(team, stat, newValue) {
        const oldValue = this.currentGame.gameState[stat][team];
        const action = {
            id: Date.now() + '_' + Math.random().toString(36).substr(2, 9),
            type: 'teamStatAdjustment', team, stat, oldValue, newValue, timestamp: Date.now()
        };
        this.addToUndoStack(action);
        this.currentGame.gameState[stat][team] = newValue;
        const statName = stat === 'fouls' ? 'foul' : 'timeout';
        const verb = newValue > oldValue ? 'added' : 'removed';
        this.addPlayByPlayEvent(`${this.currentGame.teams[team].name} ${statName} ${verb} (${newValue})`);
        this.updateAllDisplays();
        this.saveGame();
    }
    setupTeamTabEvents() {
        document.querySelectorAll('#quickHomeTab, #quickAwayTab').forEach(tab => tab.addEventListener('click', (e) => { e.preventDefault(); this.selectQuickTeam(e.target.dataset.team); }));
        document.querySelectorAll('#courtHomeTab, #courtAwayTab').forEach(tab => tab.addEventListener('click', (e) => { e.preventDefault(); this.selectCourtTeam(e.target.dataset.team); }));
    }
    setupExportEvents() {
        const exportBtn = document.getElementById('exportBtn');
        if (exportBtn) exportBtn.addEventListener('click', (e) => { e.preventDefault(); this.showExportModal(); });
        const modal = document.getElementById('exportModal');
        if (modal) {
            const closeBtn = modal.querySelector('.modal-close');
            const cancelBtn = document.getElementById('cancelExportBtn');
            const backdrop = modal.querySelector('.modal-backdrop');
            if (closeBtn) closeBtn.addEventListener('click', () => this.hideExportModal());
            if (cancelBtn) cancelBtn.addEventListener('click', () => this.hideExportModal());
            if (backdrop) backdrop.addEventListener('click', () => this.hideExportModal());
            modal.querySelectorAll('.export-option').forEach(option => option.addEventListener('click', (e) => this.selectExportOption(e.currentTarget)));
            const confirmBtn = document.getElementById('confirmExportBtn');
            if (confirmBtn) confirmBtn.addEventListener('click', () => this.confirmExport());
        }
    }
    selectQuickTeam(team) {
        this.selectedQuickTeam = team;
        document.querySelectorAll('#quickHomeTab, #quickAwayTab').forEach(tab => tab.classList.toggle('active', tab.dataset.team === team));
        this.updateQuickPlayerDropdown();
    }
    updateQuickPlayerDropdown() {
        const select = document.getElementById('quickPlayerSelect');
        if (!select || !this.currentGame) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Player</option>';
        const team = this.selectedQuickTeam;
        if (this.currentGame.teams[team] && this.currentGame.teams[team].players) {
            this.currentGame.teams[team].players.sort((a, b) => a.number - b.number).forEach(player => {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = `#${player.number} ${player.name} (${player.position})`;
                select.appendChild(option);
            });
        }
        if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
            select.value = currentValue;
            this.selectedQuickPlayer = currentValue;
        } else {
            this.selectedQuickPlayer = null;
        }
    }
    updateCourtPlayerDropdown() {
        const select = document.getElementById('courtPlayerSelect');
        if (!select || !this.currentGame) return;
        const currentValue = select.value;
        select.innerHTML = '<option value="">Select Player for Court Actions</option>';
        const team = this.selectedCourtTeam;
        if (this.currentGame.teams[team] && this.currentGame.teams[team].players) {
            this.currentGame.teams[team].players.sort((a, b) => a.number - b.number).forEach(player => {
                const option = document.createElement('option');
                option.value = player.id;
                option.textContent = `#${player.number} ${player.name} (${player.position})`;
                select.appendChild(option);
            });
        }
        if (currentValue && select.querySelector(`option[value="${currentValue}"]`)) {
            select.value = currentValue;
            this.selectedCourtPlayer = currentValue;
        } else {
            this.selectedCourtPlayer = null;
        }
    }
    setupHomePageEvents() {
        const generateBtn = document.getElementById('generateCodeBtn');
        if (generateBtn) generateBtn.addEventListener('click', (e) => { e.preventDefault(); this.generateNewGameCode(); });
        const createBtn = document.getElementById('createGameBtn');
        if (createBtn) createBtn.addEventListener('click', (e) => { e.preventDefault(); this.createNewGame(); });
        const joinAdminBtn = document.getElementById('joinAdminBtn');
        if (joinAdminBtn) joinAdminBtn.addEventListener('click', (e) => { e.preventDefault(); const code = document.getElementById('joinGameCode').value.trim().toUpperCase(); this.showPasswordField(); this.attemptAdminJoin(code); });
        const joinViewerBtn = document.getElementById('joinViewerBtn');
        if (joinViewerBtn) joinViewerBtn.addEventListener('click', (e) => { e.preventDefault(); const code = document.getElementById('joinGameCode').value.trim().toUpperCase(); this.joinGame(code, false); });
        const joinCodeInput = document.getElementById('joinGameCode');
        if (joinCodeInput) {
            joinCodeInput.addEventListener('input', (e) => { if (e.target.value.trim().length === 6) this.hidePasswordField(); e.target.value = e.target.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); });
            joinCodeInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') this.showPasswordField(); });
        }
        const joinPasswordInput = document.getElementById('joinPassword');
        if (joinPasswordInput) joinPasswordInput.addEventListener('keypress', (e) => { if (e.key === 'Enter') { const code = document.getElementById('joinGameCode').value.trim().toUpperCase(); this.attemptAdminJoin(code); } });
        const refreshBtn = document.getElementById('refreshGamesBtn');
        if (refreshBtn) refreshBtn.addEventListener('click', (e) => { e.preventDefault(); this.loadActiveGames(); });
    }
    setupConfigPageEvents() {
        const backBtn = document.getElementById('backToHomeBtn');
        if (backBtn) backBtn.addEventListener('click', (e) => { e.preventDefault(); this.switchPage('home'); });
        const continueBtn = document.getElementById('continueConfigBtn');
        if (continueBtn) continueBtn.addEventListener('click', (e) => { e.preventDefault(); this.saveGameConfig(); });
        document.querySelectorAll('.game-type-card').forEach(card => card.addEventListener('click', () => { document.querySelectorAll('.game-type-card').forEach(c => c.classList.remove('selected')); card.classList.add('selected'); }));
    }
    setupPlayerSetupEvents() {
        const backConfigBtn = document.getElementById('backToConfigBtn');
        if (backConfigBtn) backConfigBtn.addEventListener('click', (e) => { e.preventDefault(); this.switchPage('config'); });
        const startBtn = document.getElementById('startGameBtn');
        if (startBtn) startBtn.addEventListener('click', (e) => { e.preventDefault(); this.startGame(); });
        const addHomeBtn = document.getElementById('addHomePlayerBtn');
        if (addHomeBtn) addHomeBtn.addEventListener('click', (e) => { e.preventDefault(); this.addPlayer('home'); });
        const addAwayBtn = document.getElementById('addAwayPlayerBtn');
        if (addAwayBtn) addAwayBtn.addEventListener('click', (e) => { e.preventDefault(); this.addPlayer('away'); });
        ['homePlayerName', 'homePlayerNumber', 'awayPlayerName', 'awayPlayerNumber'].forEach(id => {
            const element = document.getElementById(id);
            if (element) element.addEventListener('keypress', (e) => { if (e.key === 'Enter') { e.preventDefault(); const team = id.includes('home') ? 'home' : 'away'; this.addPlayer(team); } });
        });
    }
    setupControllerEvents() {
        const playPauseBtn = document.getElementById('playPauseBtn');
        if (playPauseBtn) playPauseBtn.addEventListener('click', (e) => { e.preventDefault(); this.toggleGameClock(); });
        const resetClockBtn = document.getElementById('resetClockBtn');
        if (resetClockBtn) resetClockBtn.addEventListener('click', (e) => { e.preventDefault(); this.resetGameClock(); });
        const resetShotClockBtn = document.getElementById('resetShotClockBtn');
        if (resetShotClockBtn) resetShotClockBtn.addEventListener('click', (e) => { e.preventDefault(); this.resetShotClock(); });
        const nextPeriodBtn = document.getElementById('nextPeriodBtn');
        if (nextPeriodBtn) nextPeriodBtn.addEventListener('click', (e) => { e.preventDefault(); this.nextPeriod(); });
        const endGameBtn = document.getElementById('endGameBtn');
        if (endGameBtn) endGameBtn.addEventListener('click', (e) => { e.preventDefault(); this.confirmEndGame(); });
        const viewGameBtn = document.getElementById('viewGameBtn');
        if (viewGameBtn) viewGameBtn.addEventListener('click', (e) => { e.preventDefault(); this.openViewerWindow(); });
        this.setupEnhancedQuickStatsEvents();
    }
    setupEnhancedQuickStatsEvents() {
        document.querySelectorAll('.quick-stat-btn').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); const stat = e.target.dataset.stat; const points = parseInt(e.target.dataset.points) || 0; this.recordQuickStat(stat, points); }));
        const quickPlayerSelect = document.getElementById('quickPlayerSelect');
        if (quickPlayerSelect) quickPlayerSelect.addEventListener('change', (e) => { this.selectedQuickPlayer = e.target.value; });
    }
    setupViewerEvents() {
        const copyUrlBtn = document.getElementById('copyUrlBtn');
        if (copyUrlBtn) copyUrlBtn.addEventListener('click', (e) => { e.preventDefault(); this.copyViewerUrl(); });
        const fullscreenBtn = document.getElementById('viewerFullscreenBtn');
        if (fullscreenBtn) fullscreenBtn.addEventListener('click', (e) => { e.preventDefault(); this.toggleFullscreen(); });
        const backToControllerBtn = document.getElementById('backToControllerBtn');
        if (backToControllerBtn) backToControllerBtn.addEventListener('click', (e) => { e.preventDefault(); this.switchPage('controller'); });
    }
    setupTabEvents() {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.addEventListener('click', (e) => { e.preventDefault(); this.switchTab(e.target.dataset.tab); }));
    }
    setupEnhancedKeyboardShortcuts() {
        document.addEventListener('keydown', (e) => {
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') { if (e.key === 'Escape') e.target.blur(); return; }
            if (e.key === ' ') { e.preventDefault(); if (this.isAdmin) this.toggleGameClock(); return; }
            if (e.key === 'Enter') { e.preventDefault(); if (this.isAdmin) this.resetShotClock(); return; }
            if (e.key === '?') { e.preventDefault(); this.showShortcutsModal(); return; }
            if (e.ctrlKey && e.key === 'z') { e.preventDefault(); this.undoLastAction(); return; }
            if (e.key === 'Escape') { e.preventDefault(); if (this.courtInterface) this.courtInterface.hideRadialMenu(); this.hideShortcutsModal(); return; }
            if (!this.isAdmin || !this.getSelectedPlayer()) return;
            switch (e.key.toLowerCase()) {
                case '1': e.preventDefault(); this.recordQuickStat('ft', 1); break;
                case '2': e.preventDefault(); this.recordQuickStat('fg2', 2); break;
                case '3': e.preventDefault(); this.recordQuickStat('fg3', 3); break;
                case 'r': e.preventDefault(); this.recordQuickStat('rebound'); break;
                case 'a': e.preventDefault(); this.recordQuickStat('assist'); break;
                case 'b': e.preventDefault(); this.recordQuickStat('block'); break;
                case 's': e.preventDefault(); this.recordQuickStat('steal'); break;
                case 'f': e.preventDefault(); if (e.shiftKey) this.recordQuickStat('foul+'); else this.recordQuickStat('foul-'); break;
                case 't': e.preventDefault(); if (e.shiftKey) this.recordQuickStat('timeout+'); else this.recordQuickStat('timeout-'); break;
                case 'o': e.preventDefault(); this.recordQuickStat('turnover'); break;
            }
        });
    }
    showShortcutsModal() { const modal = document.getElementById('shortcutsModal'); if (modal) modal.classList.remove('hidden'); }
    hideShortcutsModal() { const modal = document.getElementById('shortcutsModal'); if (modal) modal.classList.add('hidden'); }
    showPasswordField() { const pg = document.getElementById('passwordGroup'); if (pg) { pg.style.display = 'block'; setTimeout(() => { const pi = document.getElementById('joinPassword'); if (pi) pi.focus(); }, 100); } }
    hidePasswordField() { const pg = document.getElementById('passwordGroup'); if (pg) { pg.style.display = 'none'; const pi = document.getElementById('joinPassword'); if (pi) pi.value = ''; } }
    attemptAdminJoin(code) {
        const passwordInput = document.getElementById('joinPassword');
        const password = passwordInput ? passwordInput.value : '';
        if (!code || !password) { this.showAlert('Missing Information', 'Please enter both game code and password.', 'error'); return; }
        try {
            const gameData = localStorage.getItem(`game_${code}`);
            if (!gameData) { this.showAlert('Game Not Found', 'Please check the code and try again.', 'error'); return; }
            const game = JSON.parse(gameData);
            if (game.adminPassword !== password) { this.showAlert('Incorrect Password', 'The admin password is incorrect.', 'error'); return; }
            this.joinGame(code, true);
        } catch (e) { console.error('Error during admin join:', e); this.showAlert('Error', 'Error joining game. Please try again.', 'error'); }
    }
    showAlert(title, text, icon) { if (typeof Swal !== 'undefined') Swal.fire({ title, text, icon }); else alert(`${title}: ${text}`); }
    generateNewGameCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'; let code;
        do { code = ''; for (let i = 0; i < 6; i++) code += chars.charAt(Math.floor(Math.random() * chars.length)); } while (this.gameCodeExists(code));
        const codeDisplay = document.getElementById('newGameCode'); if (codeDisplay) codeDisplay.textContent = code; return code;
    }
    gameCodeExists(code) { try { return localStorage.getItem(`game_${code}`) !== null; } catch (e) { return false; } }
    createNewGame() {
        const codeDisplay = document.getElementById('newGameCode'); const gameNameInput = document.getElementById('newGameName'); const passwordInput = document.getElementById('newGamePassword');
        const code = codeDisplay ? codeDisplay.textContent : this.generateNewGameCode(); const gameName = gameNameInput ? gameNameInput.value.trim() : ''; const adminPassword = passwordInput ? passwordInput.value.trim() : '';
        if (!adminPassword) { this.showAlert('Password Required', 'Please enter an admin password to create the game.', 'warning'); return; }
        try {
            this.currentGameCode = code; this.isAdmin = true;
            this.currentGame = { code, name: gameName || 'Basketball Game', adminPassword, type: 'professional', status: 'setup', created: new Date().toISOString(), settings: { gameFormat: 'quarters', periodDuration: 12, timeoutsPerTeam: 7, foulLimit: 7, shotClockEnabled: true, shotClockTime: 24 }, teams: { home: { name: 'Home Team', color: 'bg-1', players: [] }, away: { name: 'Away Team', color: 'bg-4', players: [] } }, gameState: { period: 1, gameTime: 720, shotClock: 24, scores: { home: 0, away: 0 }, fouls: { home: 0, away: 0 }, timeouts: { home: 7, away: 7 } }, stats: {}, shots: [], playByPlay: [], analytics: { totalShots: 0, madeShots: 0, threePointAttempts: 0, threePointMakes: 0, totalActions: 0 } };
            this.saveGame(); this.updateGameCodeDisplays(); this.switchPage('config');
        } catch (error) { console.error('Error creating game:', error); this.showAlert('Error', 'Error creating game. Please try again.', 'error'); }
    }
    joinGame(code, asAdmin = false) {
        if (!code || code.length !== 6) { this.showAlert('Invalid Code', 'Please enter a valid 6-character game code.', 'error'); return; }
        try {
            const gameData = localStorage.getItem(`game_${code}`);
            if (!gameData) { this.showAlert('Game Not Found', 'Please check the code and try again.', 'error'); return; }
            this.currentGame = JSON.parse(gameData); this.currentGameCode = code; this.isAdmin = asAdmin;
            if (!this.currentGame.shots) this.currentGame.shots = []; if (!this.currentGame.playByPlay) this.currentGame.playByPlay = []; if (!this.currentGame.analytics) this.currentGame.analytics = { totalShots: 0, madeShots: 0, threePointAttempts: 0, threePointMakes: 0, totalActions: 0 };
            this.updateGameCodeDisplays(); this.clearError(); this.hidePasswordField();
            if (asAdmin) { if (this.currentGame.status === 'setup') this.switchPage('config'); else this.switchPage('controller'); } else { this.switchPage('viewer'); }
            this.updateAllDisplays(); this.loadExistingActions();
        } catch (e) { console.error('Error joining game:', e); this.showAlert('Error', 'Error loading game. Please try again.', 'error'); }
    }
    saveGameConfig() {
        if (!this.currentGame) return;
        this.currentGame.name = document.getElementById('gameName').value || 'Basketball Game';
        this.currentGame.teams.home.name = document.getElementById('homeTeamName').value || 'Home Team';
        this.currentGame.teams.away.name = document.getElementById('awayTeamName').value || 'Away Team';
        this.currentGame.teams.home.color = document.getElementById('homeTeamColor').value;
        this.currentGame.teams.away.color = document.getElementById('awayTeamColor').value;
        this.currentGame.settings.gameFormat = document.getElementById('gameFormat').value;
        this.currentGame.settings.periodDuration = parseInt(document.getElementById('periodDuration').value);
        this.currentGame.settings.timeoutsPerTeam = parseInt(document.getElementById('timeoutsPerTeam').value);
        this.currentGame.settings.foulLimit = parseInt(document.getElementById('foulLimit').value);
        this.currentGame.settings.shotClockEnabled = document.getElementById('shotClockEnabled').checked;
        this.currentGame.type = document.querySelector('.game-type-card.selected').dataset.type;
        this.currentGame.gameState.gameTime = this.currentGame.settings.periodDuration * 60;
        this.currentGame.gameState.timeouts.home = this.currentGame.settings.timeoutsPerTeam;
        this.currentGame.gameState.timeouts.away = this.currentGame.settings.timeoutsPerTeam;
        if (this.currentGame.settings.shotClockEnabled) this.currentGame.gameState.shotClock = this.currentGame.settings.shotClockTime || 24;
        this.saveGame();
        if (this.currentGame.type === 'professional') this.switchPage('playerSetup'); else this.startGame();
    }
    addPlayer(team) {
        const nameInput = document.getElementById(`${team}PlayerName`); const numberInput = document.getElementById(`${team}PlayerNumber`); const positionInput = document.getElementById(`${team}PlayerPosition`);
        if (!nameInput || !numberInput) return;
        const name = nameInput.value.trim(); const number = parseInt(numberInput.value); const position = positionInput ? positionInput.value : 'N/A';
        if (!name) { this.showAlert('Name Required', 'Please enter a player name.', 'warning'); return; }
        if (isNaN(number) || number < 0 || number > 99) { this.showAlert('Invalid Number', 'Please enter a valid jersey number (0-99).', 'warning'); return; }
        if (this.currentGame.teams[team].players.find(p => p.number === number)) { this.showAlert('Number Taken', `Jersey number ${number} is already taken.`, 'warning'); return; }
        const player = { name, number, position: position || 'N/A', id: `${team}_${number}` };
        this.currentGame.teams[team].players.push(player);
        this.currentGame.stats[player.id] = { points: 0, rebounds: 0, assists: 0, fouls: 0, steals: 0, blocks: 0, turnovers: 0, fieldGoals: { made: 0, attempted: 0 }, threePointers: { made: 0, attempted: 0 }, freeThrows: { made: 0, attempted: 0 } };
        nameInput.value = ''; numberInput.value = ''; if (positionInput) positionInput.value = '';
        this.updatePlayersList(team); this.updateStartGameButton(); this.saveGame();
    }
    removePlayer(team, playerId) {
        if (typeof Swal !== 'undefined') { Swal.fire({ title: 'Remove Player?', text: 'Are you sure you want to remove this player?', icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, remove', cancelButtonText: 'Cancel' }).then((result) => { if (result.isConfirmed) this.doRemovePlayer(team, playerId); }); }
        else { if (confirm('Are you sure you want to remove this player?')) this.doRemovePlayer(team, playerId); }
    }
    doRemovePlayer(team, playerId) {
        this.currentGame.teams[team].players = this.currentGame.teams[team].players.filter(p => p.id !== playerId); delete this.currentGame.stats[playerId];
        this.updatePlayersList(team); this.updateStartGameButton(); this.saveGame();
    }
    updatePlayersList(team) {
        const list = document.getElementById(`${team}PlayersList`); if (!list) return; list.innerHTML = '';
        this.currentGame.teams[team].players.forEach(player => {
            const div = document.createElement('div'); div.className = 'player-item';
            div.innerHTML = `<div class="player-info"><span class="player-number-badge">${player.number}</span><div><div class="player-name">${player.name}</div><div class="player-position">${player.position}</div></div></div><button class="btn btn--sm btn--outline" onclick="window.appInstance.removePlayer('${team}', '${player.id}')">Remove</button>`;
            list.appendChild(div);
        });
        const status = document.getElementById(`${team}TeamStatus`); const count = this.currentGame.teams[team].players.length;
        if (status) { if (count === 0) { status.textContent = 'No players added'; status.className = 'team-status'; } else { status.textContent = `${count} player${count > 1 ? 's' : ''} added`; status.className = 'team-status ready'; } }
    }
    updateStartGameButton() {
        const button = document.getElementById('startGameBtn'); if (!button || !this.currentGame) return;
        const homeCount = this.currentGame.teams.home.players.length; const awayCount = this.currentGame.teams.away.players.length;
        if (homeCount > 0 && awayCount > 0) { button.disabled = false; button.textContent = 'Start Game'; } else { button.disabled = true; button.textContent = 'Need players for both teams'; }
    }
    startGame() {
        if (!this.currentGame) return;
        this.currentGame.status = 'ready'; this.addPlayByPlayEvent('Game started'); this.saveGame(); this.switchPage('controller'); this.updateAllDisplays(); this.updatePlayerSelects();
        this.showAlert('Game Started!', 'Players and teams are ready. Use Space to start the clock.', 'success');
    }
    toggleGameClock() { if (!this.currentGame || !this.isAdmin) return; if (this.currentGame.status === 'live') this.pauseGame(); else this.resumeGame(); }
    resumeGame() {
        this.currentGame.status = 'live'; this.addPlayByPlayEvent(`Game resumed - ${this.getPeriodName()}`);
        this.clockInterval = setInterval(() => { if (this.currentGame.gameState.gameTime > 0) { this.currentGame.gameState.gameTime--; this.updateClockDisplays(); if (this.currentGame.gameState.gameTime === 0) this.handlePeriodEnd(); } }, 1000);
        if (this.currentGame.settings.shotClockEnabled) {
            this.shotClockInterval = setInterval(() => {
                if (this.currentGame.gameState.shotClock > 0) {
                    this.currentGame.gameState.shotClock--; this.updateClockDisplays();
                    [document.getElementById('shotClockDisplay'), document.getElementById('viewerShotClock')].forEach(el => { if (el) { el.classList.remove('warning', 'danger'); if (this.currentGame.gameState.shotClock <= 5) el.classList.add('danger'); else if (this.currentGame.gameState.shotClock <= 10) el.classList.add('warning'); } });
                }
            }, 1000);
        }
        this.updateAllDisplays(); this.saveGame();
    }
    pauseGame() { this.currentGame.status = 'paused'; this.addPlayByPlayEvent('Game paused'); this.clearIntervals(); this.updateAllDisplays(); this.saveGame(); }
    clearIntervals() { if (this.clockInterval) { clearInterval(this.clockInterval); this.clockInterval = null; } if (this.shotClockInterval) { clearInterval(this.shotClockInterval); this.shotClockInterval = null; } }
    resetGameClock() {
        if (!this.isAdmin) return;
        if (typeof Swal !== 'undefined') { Swal.fire({ title: 'Reset Game Clock?', text: 'This will reset the game clock to the full period time.', icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, reset', cancelButtonText: 'Cancel' }).then((result) => { if (result.isConfirmed) this.doResetGameClock(); }); }
        else { if (confirm('Reset game clock to full period time?')) this.doResetGameClock(); }
    }
    doResetGameClock() { this.currentGame.gameState.gameTime = this.currentGame.settings.periodDuration * 60; this.addPlayByPlayEvent('Game clock reset'); this.updateClockDisplays(); this.saveGame(); }
    resetShotClock() { if (!this.isAdmin) return; this.currentGame.gameState.shotClock = this.currentGame.settings.shotClockTime || 24; this.updateClockDisplays(); this.saveGame(); }
    nextPeriod() {
        if (!this.isAdmin) return;
        if (typeof Swal !== 'undefined') { Swal.fire({ title: 'End Current Period?', text: 'This will end the current period and move to the next.', icon: 'question', showCancelButton: true, confirmButtonText: 'Yes, next period', cancelButtonText: 'Cancel' }).then((result) => { if (result.isConfirmed) this.handlePeriodEnd(); }); }
        else { if (confirm('End current period and move to next?')) this.handlePeriodEnd(); }
    }
    handlePeriodEnd() {
        this.clearIntervals(); this.currentGame.status = 'paused';
        const maxPeriods = this.currentGame.settings.gameFormat === 'quarters' ? 4 : 2;
        if (this.currentGame.gameState.period < maxPeriods) { this.currentGame.gameState.period++; this.currentGame.gameState.gameTime = this.currentGame.settings.periodDuration * 60; this.addPlayByPlayEvent(`End of ${this.getPeriodName(this.currentGame.gameState.period - 1)}`); this.showAlert(`End of ${this.getPeriodName(this.currentGame.gameState.period - 1)}`, `Starting ${this.getPeriodName()}`, 'info'); }
        else if (this.currentGame.gameState.scores.home === this.currentGame.gameState.scores.away) { this.currentGame.gameState.period++; this.currentGame.gameState.gameTime = 300; this.addPlayByPlayEvent('Overtime period started'); this.showAlert('Overtime!', 'Game is tied. Starting 5-minute overtime period.', 'warning'); }
        else { this.endGame(); return; }
        this.updateAllDisplays(); this.saveGame();
    }
    confirmEndGame() {
        if (!this.isAdmin) return;
        if (typeof Swal !== 'undefined') { Swal.fire({ title: 'End Game?', text: 'Are you sure you want to end the game? This cannot be undone.', icon: 'warning', showCancelButton: true, confirmButtonText: 'Yes, end game', cancelButtonText: 'Cancel', confirmButtonColor: '#d33' }).then((result) => { if (result.isConfirmed) this.endGame(); }); }
        else { if (confirm('Are you sure you want to end the game? This cannot be undone.')) this.endGame(); }
    }
    endGame() {
        this.clearIntervals(); this.currentGame.status = 'final';
        const { home: homeScore, away: awayScore } = this.currentGame.gameState.scores;
        const { home: homeName, away: awayName } = this.currentGame.teams;
        let message = 'Game Over! ';
        if (homeScore > awayScore) message += `${homeName.name} wins ${homeScore}-${awayScore}!`;
        else if (awayScore > homeScore) message += `${awayName.name} wins ${awayScore}-${homeScore}!`;
        else message += `Game ended in a tie ${homeScore}-${awayScore}!`;
        this.addPlayByPlayEvent(message); this.updateAllDisplays(); this.saveGame(); this.showAlert('Game Over!', message, 'success');
    }
    handleShotAction(action, stats, team) {
        const { result, shotType, points } = action;
        if (shotType === '3PT' || shotType === 'logo') { stats.threePointers.attempted++; if (result === 'make') { stats.threePointers.made++; stats.points += points; this.addScore(team, points); } this.currentGame.analytics.threePointAttempts++; if (result === 'make') this.currentGame.analytics.threePointMakes++; }
        else if (shotType === 'ft') { stats.freeThrows.attempted++; if (result === 'make') { stats.freeThrows.made++; stats.points += points; this.addScore(team, points); } }
        else { stats.fieldGoals.attempted++; if (result === 'make') { stats.fieldGoals.made++; stats.points += points; this.addScore(team, points); } }
        this.currentGame.analytics.totalShots++; if (result === 'make') this.currentGame.analytics.madeShots++;
        if (result === 'make' && this.currentGame.settings.shotClockEnabled) this.resetShotClock();
        this.addPlayByPlayEvent(`#${action.playerNumber} ${action.playerName} ${result}s ${shotType} (${action.gameClock})`);
    }
    handleStatAction(actionType, stats, player) {
        switch (actionType) {
            case 'rebound': stats.rebounds++; this.addPlayByPlayEvent(`#${player.number} ${player.name} rebound`); break;
            case 'assist': stats.assists++; this.addPlayByPlayEvent(`#${player.number} ${player.name} assist`); break;
            case 'block': stats.blocks++; this.addPlayByPlayEvent(`#${player.number} ${player.name} block`); break;
        }
    }
    addScore(team, points) { this.currentGame.gameState.scores[team] += points; this.currentGame.analytics.totalActions++; this.updateScoreDisplays(); this.saveGame(); this.updateViewerDisplays(); }
    recordQuickStat(statType, points = 0) {
        if (!this.isAdmin) { this.showAlert('Admin Required', 'Admin access required to record stats.', 'error'); return; }
        const selectedPlayer = this.getSelectedPlayer();
        if (!selectedPlayer && !statType.includes('timeout')) { this.showAlert('Select Player', 'Please select a team and player first.', 'warning'); return; }
        if (statType.includes('foul') || statType.includes('timeout')) { const team = this.selectedQuickTeam; const isIncrement = statType.includes('+'); const stat = statType.includes('foul') ? 'fouls' : 'timeouts'; this.adjustTeamStat(team, stat, isIncrement ? 1 : -1); return; }
        const stats = this.currentGame.stats[selectedPlayer.id]; if (!stats) return;
        const action = { id: Date.now() + '_' + Math.random().toString(36).substr(2, 9), type: 'quickStat', statType, playerId: selectedPlayer.id, playerName: selectedPlayer.name, playerNumber: selectedPlayer.number, team: this.getPlayerTeam(selectedPlayer.id), points, period: this.currentGame.gameState.period, gameClock: this.formatTime(this.currentGame.gameState.gameTime), timestamp: Date.now() };
        this.addToUndoStack(action);
        const team = this.getPlayerTeam(selectedPlayer.id);
        switch (statType) {
            case 'ft': stats.freeThrows.made++; stats.freeThrows.attempted++; stats.points += points; this.addScore(team, points); this.addPlayByPlayEvent(`#${selectedPlayer.number} ${selectedPlayer.name} makes free throw`); break;
            case 'fg2': stats.fieldGoals.made++; stats.fieldGoals.attempted++; stats.points += points; this.addScore(team, points); this.currentGame.analytics.totalShots++; this.currentGame.analytics.madeShots++; this.addPlayByPlayEvent(`#${selectedPlayer.number} ${selectedPlayer.name} makes 2-pointer`); if (this.currentGame.settings.shotClockEnabled) this.resetShotClock(); break;
            case 'fg3': stats.threePointers.made++; stats.threePointers.attempted++; stats.points += points; this.addScore(team, points); this.currentGame.analytics.totalShots++; this.currentGame.analytics.madeShots++; this.currentGame.analytics.threePointAttempts++; this.currentGame.analytics.threePointMakes++; this.addPlayByPlayEvent(`#${selectedPlayer.number} ${selectedPlayer.name} makes 3-pointer`); if (this.currentGame.settings.shotClockEnabled) this.resetShotClock(); break;
            case 'rebound': stats.rebounds++; this.addPlayByPlayEvent(`#${selectedPlayer.number} ${selectedPlayer.name} rebound`); break;
            case 'assist': stats.assists++; this.addPlayByPlayEvent(`#${selectedPlayer.number} ${selectedPlayer.name} assist`); break;
            case 'block': stats.blocks++; this.addPlayByPlayEvent(`#${selectedPlayer.number} ${selectedPlayer.name} block`); break;
            case 'steal': stats.steals++; this.addPlayByPlayEvent(`#${selectedPlayer.number} ${selectedPlayer.name} steal`); break;
            case 'turnover': stats.turnovers++; this.addPlayByPlayEvent(`#${selectedPlayer.number} ${selectedPlayer.name} turnover`); break;
        }
        this.currentGame.analytics.totalActions++; this.updateAllDisplays(); this.updateAnalytics(); this.saveGame();
    }
    addToUndoStack(action) { this.undoStack.push({ action, gameStateBefore: JSON.parse(JSON.stringify(this.currentGame.gameState)), statsBefore: JSON.parse(JSON.stringify(this.currentGame.stats)), analyticsBefore: JSON.parse(JSON.stringify(this.currentGame.analytics)) }); if (this.undoStack.length > this.maxUndoStackSize) this.undoStack.shift(); }
    updatePlayerSelects() { this.selectQuickTeam('home'); this.selectCourtTeam('home'); this.updateQuickPlayerDropdown(); this.updateCourtPlayerDropdown(); }
    updateAnalytics() {
        if (!this.currentGame) return;
        const { analytics } = this.currentGame;
        const shootingPct = analytics.totalShots > 0 ? Math.round((analytics.madeShots / analytics.totalShots) * 100) : 0;
        const threePointPct = analytics.threePointAttempts > 0 ? Math.round((analytics.threePointMakes / analytics.threePointAttempts) * 100) : 0;
        const elements = { 'teamShootingPct': `${shootingPct}%`, 'threePointPct': `${threePointPct}%`, 'totalShots': analytics.totalActions || analytics.totalShots };
        Object.entries(elements).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
    }
    addPlayByPlayEvent(message) {
        if (!this.currentGame) return;
        const event = { message, time: this.formatTime(this.currentGame.gameState.gameTime), period: this.currentGame.gameState.period, timestamp: Date.now() };
        this.currentGame.playByPlay.unshift(event);
        if (this.currentGame.playByPlay.length > 50) this.currentGame.playByPlay = this.currentGame.playByPlay.slice(0, 50);
        this.updatePlayByPlayDisplay();
    }
    updatePlayByPlayDisplay() {
        const container = document.getElementById('playByPlay'); if (!container || !this.currentGame || !this.currentGame.playByPlay) return;
        container.innerHTML = this.currentGame.playByPlay.map(event => `<div class="feed-item ${event.message.includes('makes') ? 'highlight' : ''}">${event.period}Q ${event.time} - ${event.message}</div>`).join('');
    }
    switchTab(tabName) {
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.toggle('active', btn.dataset.tab === tabName));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.toggle('active', content.id === `${tabName}Tab`));
        if (tabName === 'feed') this.updatePlayByPlayDisplay(); else if (tabName === 'analytics') this.updateAnalytics();
    }
    updateAllDisplays() { this.updateClockDisplays(); this.updateScoreDisplays(); this.updateStatusDisplays(); this.updateTeamDisplays(); this.updateQuickStatsVisibility(); }
    updateClockDisplays() {
        if (!this.currentGame) return;
        const gameTime = this.formatTime(this.currentGame.gameState.gameTime);
        const shotClock = this.currentGame.gameState.shotClock;
        ['gameClockDisplay', 'viewerGameClock'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = gameTime; });
        ['shotClockDisplay', 'viewerShotClock'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = shotClock; });
    }
    updateScoreDisplays() {
        if (!this.currentGame) return;
        const { home: homeScore, away: awayScore } = this.currentGame.gameState.scores;
        ['homeScore', 'viewerHomeScore'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = homeScore; });
        ['awayScore', 'viewerAwayScore'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = awayScore; });
        const updates = { 'homeFouls': this.currentGame.gameState.fouls.home, 'awayFouls': this.currentGame.gameState.fouls.away, 'homeTimeouts': this.currentGame.gameState.timeouts.home, 'awayTimeouts': this.currentGame.gameState.timeouts.away, 'viewerHomeFouls': this.currentGame.gameState.fouls.home, 'viewerAwayFouls': this.currentGame.gameState.fouls.away, 'viewerHomeTimeouts': this.currentGame.gameState.timeouts.home, 'viewerAwayTimeouts': this.currentGame.gameState.timeouts.away };
        Object.entries(updates).forEach(([id, value]) => { const el = document.getElementById(id); if (el) el.textContent = value; });
    }
    updateStatusDisplays() {
        if (!this.currentGame) return;
        const status = this.currentGame.status.charAt(0).toUpperCase() + this.currentGame.status.slice(1);
        const period = this.getPeriodName();
        ['gameStatusBadge', 'viewerStatus'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = status; });
        ['periodDisplay', 'viewerPeriod'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = period; });
        const btn = document.getElementById('playPauseBtn'); if (btn) btn.textContent = this.currentGame.status === 'live' ? '⏸️ Pause' : '▶️ Start';
    }
    updateTeamDisplays() {
        if (!this.currentGame) return;
        const { home: homeTeam, away: awayTeam } = this.currentGame.teams;
        ['homeTeamTitle', 'viewerHomeName'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = homeTeam.name; });
        ['awayTeamTitle', 'viewerAwayName'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = awayTeam.name; });
        const quickHomeTab = document.getElementById('quickHomeTab'); if (quickHomeTab) quickHomeTab.textContent = homeTeam.name.slice(0, 8);
        const quickAwayTab = document.getElementById('quickAwayTab'); if (quickAwayTab) quickAwayTab.textContent = awayTeam.name.slice(0, 8);
        const courtHomeTab = document.getElementById('courtHomeTab'); if (courtHomeTab) courtHomeTab.textContent = homeTeam.name.slice(0, 8);
        const courtAwayTab = document.getElementById('courtAwayTab'); if (courtAwayTab) courtAwayTab.textContent = awayTeam.name.slice(0, 8);
        const gameNameEl = document.getElementById('gameName'); if (gameNameEl && this.currentGame.name) gameNameEl.value = this.currentGame.name;
        if (this.currentGame.type === 'professional') { this.updatePlayersList('home'); this.updatePlayersList('away'); this.updatePlayerSelects(); }
    }
    updateQuickStatsVisibility() { const el = document.getElementById('quickStatsSection'); if (el) el.style.display = this.currentGame && this.currentGame.type === 'professional' && this.isAdmin ? 'block' : 'none'; }
    updateGameCodeDisplays() { if (!this.currentGameCode) return; ['currentGameCode', 'configGameCode', 'playerGameCode', 'controllerGameCode', 'viewerGameCode'].forEach(id => { const el = document.getElementById(id); if (el) el.textContent = this.currentGameCode; }); }
    formatTime(seconds) { const minutes = Math.floor(seconds / 60); const secs = seconds % 60; return `${minutes}:${secs.toString().padStart(2, '0')}`; }
    getPeriodName(period = null) {
        if (!this.currentGame) return '1st Quarter';
        const p = period || this.currentGame.gameState.period;
        const format = this.currentGame.settings.gameFormat;
        if (format === 'quarters') { const names = ['1st Quarter', '2nd Quarter', '3rd Quarter', '4th Quarter']; return names[p - 1] || `OT${p - 4}`; }
        else { const names = ['1st Half', '2nd Half']; return names[p - 1] || `OT${p - 2}`; }
    }
    showError(message) { const el = document.getElementById('joinError'); if (el) { el.textContent = message; el.style.color = 'var(--color-error)'; } }
    clearError() { const el = document.getElementById('joinError'); if (el) el.textContent = ''; }
    saveGame() { if (!this.currentGame || !this.currentGameCode) return; try { this.currentGame.lastUpdated = new Date().toISOString(); localStorage.setItem(`game_${this.currentGameCode}`, JSON.stringify(this.currentGame)); } catch (e) { console.error('Error saving game:', e); } }
    loadActiveGames() {
        const gamesList = document.getElementById('activeGamesList'); if (!gamesList) return;
        const games = [];
        try { for (let i = 0; i < localStorage.length; i++) { const key = localStorage.key(i); if (key && key.startsWith('game_')) { const gameData = localStorage.getItem(key); if (gameData) games.push(JSON.parse(gameData)); } } } catch (e) { console.error('Error loading games:', e); }
        if (games.length === 0) { gamesList.innerHTML = '<div class="no-games">No active games found</div>'; return; }
        games.sort((a, b) => new Date(b.lastUpdated || b.created) - new Date(a.lastUpdated || a.created));
        gamesList.innerHTML = games.map(game => `<div class="game-item"><div class="game-info"><h4>${game.name || 'Basketball Game'}</h4><div class="game-details">${game.teams.home.name} vs ${game.teams.away.name} • Status: ${game.status.charAt(0).toUpperCase() + game.status.slice(1)} • Type: ${game.type.charAt(0).toUpperCase() + game.type.slice(1)} • Actions: ${game.shots ? game.shots.length : 0}</div></div><div class="game-actions"><span class="game-code-badge">${game.code}</span></div></div>`).join('');
    }
    startGameUpdates() { this.gameUpdateInterval = setInterval(() => { if (this.currentGameCode && !this.isAdmin) this.refreshGameData(); }, 2000); }
    refreshGameData() {
        if (!this.currentGameCode) return;
        try {
            const gameData = localStorage.getItem(`game_${this.currentGameCode}`);
            if (gameData) {
                const updatedGame = JSON.parse(gameData);
                if (updatedGame.lastUpdated !== this.currentGame?.lastUpdated) { this.currentGame = updatedGame; this.updateAllDisplays(); this.loadExistingActions(); this.updatePlayByPlayDisplay(); this.updateAnalytics(); }
            }
        } catch (e) { console.error('Error refreshing game data:', e); }
    }
    openViewerWindow() { if (!this.currentGameCode) return; const url = `${window.location.origin}${window.location.pathname}?code=${this.currentGameCode}&mode=viewer`; window.open(url, '_blank'); }
    copyViewerUrl() {
        if (!this.currentGameCode) return;
        const url = `${window.location.origin}${window.location.pathname}?code=${this.currentGameCode}&mode=viewer`;
        navigator.clipboard.writeText(url).then(() => { this.showAlert('URL Copied!', 'Viewer URL copied to clipboard.', 'success'); }).catch(() => { prompt('Copy this URL:', url); });
    }
    toggleFullscreen() {
        const viewerPage = document.getElementById('viewerPage');
        if (!document.fullscreenElement) { viewerPage.requestFullscreen().then(() => document.body.classList.add('fullscreen')).catch(err => console.log('Fullscreen not supported:', err)); }
        else { document.exitFullscreen().then(() => document.body.classList.remove('fullscreen')); }
    }
    updateViewerDisplays() { this.updateScoreDisplays(); this.updateClockDisplays(); this.updateStatusDisplays(); }
    getPlayerById(playerId) {
        if (!this.currentGame) return null;
        for (const team of ['home', 'away']) { const player = this.currentGame.teams[team].players.find(p => p.id === playerId); if (player) return player; }
        return null;
    }
    getPlayerTeam(playerId) {
        if (!this.currentGame) return null;
        for (const team of ['home', 'away']) { const player = this.currentGame.teams[team].players.find(p => p.id === playerId); if (player) return team; }
        return null;
    }
}


// --- INITIALIZATION ---
let appInstance;
document.addEventListener('DOMContentLoaded', () => {
    appInstance = new BasketballGameManagerPro();
    window.appInstance = appInstance;
    appInstance.init();
});
