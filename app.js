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
        document.addEventListener('click', e => { if (!court.contains(e.target)) this.hideRadialMenu(); });
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
        
        // NEW: Instance of the court interface module
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
            // Initialize the court interface module first
            this.courtInterface = new ProfessionalCourtInterface('fiba', (actionData) => {
                this.handleNewCourtAction(actionData);
            });

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
            alert('Error initializing application. Please refresh the page.');
        }
    }
    
    // ... (rest of the BasketballGameManagerPro class methods)
    
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

    // ... (All other setup... methods from the original app.js, unchanged)
    
    // --- NEW BRIDGE FUNCTION ---
    /**
     * Handles actions emitted from the ProfessionalCourtInterface module.
     * This is the primary integration point.
     * @param {object} data - The action data from the court module.
     */
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

        // Refresh the court with the new, complete list of actions
        this.courtInterface.updateActionDisplay(this.getAllActionsForTeam(this.selectedCourtTeam));
    }


    // --- MODIFIED/REFACTORED METHODS ---

    /**
     * Overhauled this method to remove direct court interaction logic.
     * It now only sets up player selection listeners.
     */
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

    /**
     * Modified to update the court view when the team selection changes.
     */
    selectCourtTeam(team) {
        this.selectedCourtTeam = team;
        document.querySelectorAll('#courtHomeTab, #courtAwayTab').forEach(tab => {
            tab.classList.toggle('active', tab.dataset.team === team);
        });
        this.updateCourtPlayerDropdown();
        // Update the court to show the newly selected team's actions
        if (this.courtInterface) {
            this.courtInterface.updateActionDisplay(this.getAllActionsForTeam(team));
        }
    }

    /**
     * Modified to update the court view after an action is undone.
     */
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
        
        // Refresh the court display
        this.courtInterface.updateActionDisplay(this.getAllActionsForTeam(this.selectedCourtTeam));
        
        this.showAlert('Action Undone', '', 'success');
    }

    /**
     * Modified to refresh the court display when loading a game.
     */
    loadExistingActions() {
        if (!this.currentGame || !this.currentGame.shots) return;
        this.courtInterface.updateActionDisplay(this.getAllActionsForTeam(this.selectedCourtTeam));
        this.updateActionsCount();
    }
    
    // ... (The rest of the original app.js methods, like createNewGame, joinGame, etc., remain largely the same)
    
    // --- HELPER METHODS (some modified) ---
    
    getSelectedPlayer(type = 'quick') {
        const playerId = type === 'court' ? this.selectedCourtPlayer : this.selectedQuickPlayer;
        if (!playerId) return null;
        return this.getPlayerById(playerId);
    }
    
    updateActionsCount() {
        const count = this.currentGame ? this.currentGame.shots.length : 0;
        const countEl = document.getElementById('shotsCount');
        if (countEl) {
            countEl.textContent = `Actions: ${count}`;
        }
    }

    getAllActionsForTeam(teamId) {
        if (!this.currentGame || !this.currentGame.shots) return [];
        return this.currentGame.shots.filter(action => action.team === teamId);
    }

    // --- PASTE ALL ORIGINAL BasketballGameManagerPro METHODS HERE ---
    // (Excluding the ones we've explicitly modified or removed above)
    // For brevity, I'll omit pasting them all again, but they would go here.
    // This includes: setupHomePageEvents, setupConfigPageEvents, setupPlayerSetupEvents, etc.
    // ... all the methods from the original file that were not touched ...
}


// --- INITIALIZATION ---
let appInstance;
document.addEventListener('DOMContentLoaded', () => {
    appInstance = new BasketballGameManagerPro();
    window.appInstance = appInstance;
    appInstance.init();
});
