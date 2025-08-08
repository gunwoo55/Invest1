/**
 * FINE U - 전역 레벨 관리 시스템
 * 모든 페이지에서 사용자 등급 정보를 공유하는 중앙화된 관리 시스템
 */

// 레벨 시스템 정의 (Yellow → Black 순서)
const LEVEL_SYSTEM = {
    yellow: { 
        name: 'YELLOW', 
        exp: 0, 
        max: 3000, 
        class: 'level-yellow level-metal-yellow', 
        order: 1,
        metalType: 'yellow',
        displayName: 'YELLOW',
        investmentUnlocks: ['deposit'] // 예적금만 가능
    },
    orange: { 
        name: 'ORANGE', 
        exp: 3000, 
        max: 6000, 
        class: 'level-orange level-metal-orange', 
        order: 2,
        metalType: 'orange',
        displayName: 'ORANGE',
        investmentUnlocks: ['deposit', 'stock'] // 주식 추가
    },
    green: { 
        name: 'GREEN', 
        exp: 6000, 
        max: 10000, 
        class: 'level-green level-metal-green', 
        order: 3,
        metalType: 'green',
        displayName: 'GREEN',
        investmentUnlocks: ['deposit', 'stock', 'bond'] // 채권 추가
    },
    blue: { 
        name: 'BLUE', 
        exp: 10000, 
        max: 15000, 
        class: 'level-blue level-metal-blue', 
        order: 4,
        metalType: 'blue',
        displayName: 'BLUE',
        investmentUnlocks: ['deposit', 'stock', 'bond', 'etf'] // ETF/펀드 추가
    },
    brown: { 
        name: 'BROWN', 
        exp: 15000, 
        max: 25000, 
        class: 'level-brown level-metal-brown', 
        order: 5,
        metalType: 'brown',
        displayName: 'BROWN',
        investmentUnlocks: ['deposit', 'stock', 'bond', 'etf', 'crypto'] // 암호화폐 추가
    },
    black: { 
        name: 'BLACK', 
        exp: 25000, 
        max: 50000, 
        class: 'level-black level-metal-black', 
        order: 6,
        metalType: 'black',
        displayName: 'BLACK',
        investmentUnlocks: ['deposit', 'stock', 'bond', 'etf', 'crypto', 'commodity'] // 귀금속/원자재 추가
    }
};

// 전역 레벨 관리자 클래스
class LevelManager {
    constructor() {
        this.currentUser = null;
        this.levelChangeCallbacks = [];
        this.init();
    }

    init() {
        // 현재 사용자 정보 로드
        this.loadCurrentUser();
        
        // 스토리지 변경 감지 (다른 탭/창에서의 변경사항 동기화)
        window.addEventListener('storage', (e) => {
            if (e.key === 'fineu_current_user' || e.key?.startsWith('user_')) {
                this.loadCurrentUser();
                this.notifyLevelChange();
            }
        });
    }

    // 현재 사용자 정보 로드
    loadCurrentUser() {
        try {
            const savedUser = localStorage.getItem('fineu_current_user');
            if (savedUser) {
                this.currentUser = JSON.parse(savedUser);
                return true;
            }
        } catch (error) {
            console.error('사용자 정보 로드 오류:', error);
        }
        return false;
    }

    // 현재 사용자의 레벨 정보 가져오기
    getCurrentLevel() {
        if (!this.currentUser) return LEVEL_SYSTEM.yellow;
        return LEVEL_SYSTEM[this.currentUser.level] || LEVEL_SYSTEM.yellow;
    }

    // 현재 사용자의 경험치 가져오기
    getCurrentExp() {
        return this.currentUser?.exp || 0;
    }

    // 레벨 업데이트
    updateLevel(newLevel) {
        if (!this.currentUser) return false;
        
        const oldLevel = this.currentUser.level;
        this.currentUser.level = newLevel;
        
        // 로컬 스토리지 업데이트
        localStorage.setItem('fineu_current_user', JSON.stringify(this.currentUser));
        
        // 사용자별 데이터도 업데이트
        if (this.currentUser.id) {
            const userData = JSON.parse(localStorage.getItem(`user_${this.currentUser.id}`) || '{}');
            userData.level = newLevel;
            localStorage.setItem(`user_${this.currentUser.id}`, JSON.stringify(userData));
        }
        
        // a5.html과의 호환성을 위해 currentUser도 업데이트
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser && Object.keys(currentUser).length > 0) {
            currentUser.level = newLevel;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }

        // 레벨 변경 콜백 실행
        this.notifyLevelChange(oldLevel, newLevel);
        
        return true;
    }

    // 경험치 추가 및 레벨업 체크
    addExperience(expToAdd) {
        if (!this.currentUser) return false;

        const oldExp = this.currentUser.exp || 0;
        const newExp = oldExp + expToAdd;
        this.currentUser.exp = newExp;

        // 레벨업 체크
        const newLevel = this.calculateLevelFromExp(newExp);
        const oldLevel = this.currentUser.level;

        if (newLevel !== oldLevel) {
            this.updateLevel(newLevel);
            return { levelUp: true, oldLevel, newLevel, newExp };
        } else {
            // 경험치만 업데이트
            try {
                localStorage.setItem('fineu_current_user', JSON.stringify(this.currentUser));
                if (this.currentUser.id) {
                    const userData = JSON.parse(localStorage.getItem(`user_${this.currentUser.id}`) || '{}');
                    if (typeof userData === 'object') {
                        userData.exp = newExp;
                        localStorage.setItem(`user_${this.currentUser.id}`, JSON.stringify(userData));
                    }
                }
            } catch (error) {
                console.error('경험치 저장 오류:', error);
            }
            this.notifyLevelChange();
            return { levelUp: false, newExp };
        }
    }

    // 경험치로부터 레벨 계산
    calculateLevelFromExp(exp) {
        for (const [levelKey, levelData] of Object.entries(LEVEL_SYSTEM)) {
            if (exp >= levelData.exp && exp < levelData.max) {
                return levelKey;
            }
        }
        // 최고 레벨
        return 'red';
    }

    // 사용자 정보 강제 업데이트
    forceUpdateUser(userData) {
        this.currentUser = userData;
        localStorage.setItem('fineu_current_user', JSON.stringify(userData));
        this.notifyLevelChange();
    }

    // 투자 상품 접근 권한 체크
    hasInvestmentAccess(investmentType) {
        if (!this.currentUser) return false;
        
        const currentLevel = this.getCurrentLevel();
        return currentLevel.investmentUnlocks && currentLevel.investmentUnlocks.includes(investmentType);
    }

    // 접근 가능한 투자 상품 목록 반환
    getAvailableInvestments() {
        if (!this.currentUser) return ['deposit']; // 기본값
        
        const currentLevel = this.getCurrentLevel();
        return currentLevel.investmentUnlocks || ['deposit'];
    }

    // 투자 상품별 잠금 상태 확인
    getInvestmentLockStatus() {
        const allInvestments = ['deposit', 'stock', 'bond', 'etf', 'crypto', 'commodity'];
        const available = this.getAvailableInvestments();
        
        return allInvestments.reduce((status, investment) => {
            status[investment] = {
                unlocked: available.includes(investment),
                requiredLevel: this.getRequiredLevelForInvestment(investment)
            };
            return status;
        }, {});
    }

    // 특정 투자 상품에 필요한 최소 레벨 반환
    getRequiredLevelForInvestment(investmentType) {
        for (const [levelKey, levelData] of Object.entries(LEVEL_SYSTEM)) {
            if (levelData.investmentUnlocks && levelData.investmentUnlocks.includes(investmentType)) {
                return levelData.displayName;
            }
        }
        return 'UNKNOWN';
    }

    // 레벨 변경 콜백 등록
    onLevelChange(callback) {
        this.levelChangeCallbacks.push(callback);
    }

    // 레벨 변경 알림
    notifyLevelChange(oldLevel = null, newLevel = null) {
        this.levelChangeCallbacks.forEach(callback => {
            try {
                callback(this.getCurrentLevel(), this.getCurrentExp(), oldLevel, newLevel);
            } catch (error) {
                console.error('레벨 변경 콜백 오류:', error);
            }
        });
    }

    // 금속 효과 CSS 생성
    generateMetallicCSS() {
        if (document.getElementById('metallicStyles')) return;

        const metallicStyles = document.createElement('style');
        metallicStyles.id = 'metallicStyles';
        metallicStyles.textContent = `
            /* 기본 금속 효과 베이스 스타일 */
            .level-badge-metal {
                position: relative;
                overflow: hidden;
                text-shadow: 0 1px 2px rgba(0,0,0,0.4);
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.3),
                    inset 0 -1px 0 rgba(0,0,0,0.2),
                    0 2px 8px rgba(0,0,0,0.3);
                transition: all 0.3s ease;
            }

            .level-badge-metal::before {
                content: '';
                position: absolute;
                top: -50%;
                left: -100%;
                width: 300%;
                height: 200%;
                background: linear-gradient(45deg, transparent, rgba(255,255,255,0.4), transparent);
                animation: shine 3s infinite;
                pointer-events: none;
            }

            .level-badge-metal:hover::before {
                animation: shine-fast 1s infinite;
            }

            @keyframes shine {
                0% { transform: translateX(-100%) rotate(45deg); }
                100% { transform: translateX(300%) rotate(45deg); }
            }

            @keyframes shine-fast {
                0% { transform: translateX(-100%) rotate(45deg); }
                100% { transform: translateX(300%) rotate(45deg); }
            }

            /* 레벨업 애니메이션 */
            .level-up-animation {
                animation: levelUpPulse 2s ease-in-out;
            }

            @keyframes levelUpPulse {
                0%, 100% { transform: scale(1); }
                25% { transform: scale(1.1); box-shadow: 0 0 20px rgba(255,215,0,0.8); }
                50% { transform: scale(1.05); }
                75% { transform: scale(1.1); box-shadow: 0 0 25px rgba(255,215,0,1); }
            }

            /* YELLOW (옐로우) 효과 */
            .level-metal-yellow {
                background: linear-gradient(145deg, #FEF08A, #FDE047, #FACC15);
                border: 1px solid #EAB308;
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.4),
                    inset 0 -1px 0 rgba(0,0,0,0.2),
                    0 2px 8px rgba(250,204,21,0.4);
            }

            /* ORANGE (오렌지) 효과 */
            .level-metal-orange {
                background: linear-gradient(145deg, #FED7AA, #FB923C, #EA580C);
                border: 1px solid #DC2626;
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.4),
                    inset 0 -1px 0 rgba(0,0,0,0.2),
                    0 2px 8px rgba(234,88,12,0.4);
            }

            /* GREEN (그린) 효과 */
            .level-metal-green {
                background: linear-gradient(145deg, #BBF7D0, #34D399, #059669);
                border: 1px solid #047857;
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.4),
                    inset 0 -1px 0 rgba(0,0,0,0.2),
                    0 2px 8px rgba(5,150,105,0.4);
            }

            /* BLUE (블루) 효과 */
            .level-metal-blue {
                background: linear-gradient(145deg, #DBEAFE, #60A5FA, #2563EB);
                border: 1px solid #1D4ED8;
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.4),
                    inset 0 -1px 0 rgba(0,0,0,0.2),
                    0 2px 8px rgba(37,99,235,0.4);
            }

            /* BROWN (브라운) 효과 */
            .level-metal-brown {
                background: linear-gradient(145deg, #D6D3D1, #A8A29E, #78716C);
                border: 1px solid #57534E;
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.4),
                    inset 0 -1px 0 rgba(0,0,0,0.2),
                    0 2px 8px rgba(120,113,108,0.4);
            }

            /* BLACK (블랙) 효과 */
            .level-metal-black {
                background: linear-gradient(145deg, #6B7280, #374151, #1F2937);
                border: 1px solid #111827;
                color: #F9FAFB;
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.2),
                    inset 0 -1px 0 rgba(0,0,0,0.4),
                    0 2px 12px rgba(31,41,55,0.6);
            }

            /* 호버 효과 강화 */
            .level-badge-metal:hover {
                transform: translateY(-2px) scale(1.05);
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.4),
                    inset 0 -1px 0 rgba(0,0,0,0.2),
                    0 4px 16px rgba(0,0,0,0.4);
            }

            /* 등급별 특별 호버 효과 */
            .level-metal-yellow:hover {
                box-shadow: 0 0 20px rgba(250,204,21,0.6);
            }

            .level-metal-orange:hover {
                box-shadow: 0 0 20px rgba(234,88,12,0.6);
            }

            .level-metal-green:hover {
                box-shadow: 0 0 20px rgba(5,150,105,0.6);
            }

            .level-metal-blue:hover {
                box-shadow: 0 0 25px rgba(37,99,235,0.7);
            }

            .level-metal-brown:hover {
                box-shadow: 0 0 25px rgba(120,113,108,0.7);
            }

            .level-metal-black:hover {
                box-shadow: 0 0 30px rgba(31,41,55,0.8);
            }

            /* 승급 축하 애니메이션 */
            @keyframes levelUpCelebration {
                0% { 
                    transform: scale(1) rotate(0deg); 
                    opacity: 1; 
                }
                25% { 
                    transform: scale(1.2) rotate(5deg); 
                    opacity: 0.9; 
                }
                50% { 
                    transform: scale(1.1) rotate(-3deg); 
                    opacity: 1; 
                }
                75% { 
                    transform: scale(1.15) rotate(2deg); 
                    opacity: 0.95; 
                }
                100% { 
                    transform: scale(1) rotate(0deg); 
                    opacity: 1; 
                }
            }

            .level-celebration {
                animation: levelUpCelebration 1s ease-in-out;
            }
        `;
        document.head.appendChild(metallicStyles);
    }

    // 레벨 표시 업데이트 (공통 함수) - 금속 효과 포함
    updateLevelDisplay() {
        const level = this.getCurrentLevel();
        const exp = this.getCurrentExp();
        
        // 금속 효과 CSS 생성
        this.generateMetallicCSS();
        
        // 모든 레벨 배지 업데이트
        const levelElements = document.querySelectorAll('[id*="evelBadge"], [id*="serLevel"], .level-badge-nav, .level-badge-profile, .level-badge-nav-v2, .level-badge-profile-v2');
        
        levelElements.forEach(element => {
            if (element) {
                // 기존 level 클래스 제거
                element.className = element.className.replace(/level-\w+/g, '');
                
                // 새로운 클래스 적용
                if (element.className.includes('level-badge-profile-v2')) {
                    element.className = 'level-badge-profile-v2 level-badge-metal ' + level.class;
                } else if (element.className.includes('level-badge-profile')) {
                    element.className = 'level-badge-profile-v2 level-badge-metal ' + level.class;
                } else if (element.className.includes('level-badge-nav-v2')) {
                    element.className = 'level-badge-nav-v2 level-badge-metal ' + level.class;
                } else if (element.className.includes('level-badge-nav')) {
                    element.className = 'level-badge-nav-v2 level-badge-metal ' + level.class;
                } else {
                    element.className += ' level-badge-metal ' + level.class;
                }
                
                // 텍스트 업데이트 (새로운 등급명 사용)
                element.textContent = level.displayName;
            }
        });

        // 경험치 표시 업데이트
        const expElement = document.getElementById('userExp');
        if (expElement) {
            const currentLevelExp = exp - level.exp;
            const maxLevelExp = level.max - level.exp;
            expElement.textContent = `${currentLevelExp} / ${maxLevelExp} EXP`;
        }

        // 전체 경험치 표시 (있는 경우)
        const totalExpElement = document.getElementById('totalExp');
        if (totalExpElement) {
            totalExpElement.textContent = `총 ${exp} EXP`;
        }

        // 진행바 업데이트 (있는 경우)
        const progressBars = document.querySelectorAll('.exp-bar, .progress-bar');
        progressBars.forEach(bar => {
            if (bar) {
                const currentLevelExp = exp - level.exp;
                const maxLevelExp = level.max - level.exp;
                const progress = (currentLevelExp / maxLevelExp) * 100;
                bar.style.width = Math.min(Math.max(progress, 0), 100) + '%';
            }
        });
    }

    // 레벨업 애니메이션 표시
    showLevelUpAnimation(newLevel) {
        // 레벨 배지에 축하 애니메이션 효과 추가
        const levelBadges = document.querySelectorAll('.level-badge-nav, .level-badge-profile, .level-badge-nav-v2, .level-badge-profile-v2');
        levelBadges.forEach(badge => {
            badge.classList.add('level-celebration');
            setTimeout(() => {
                badge.classList.remove('level-celebration');
                badge.classList.add('level-up-animation');
                setTimeout(() => {
                    badge.classList.remove('level-up-animation');
                }, 2000);
            }, 1000);
        });

        // 레벨업 메시지 표시
        this.showLevelUpMessage(newLevel);

        // 페이지 전체에 축하 효과 추가
        this.showPageCelebrationEffect();
    }

    // 페이지 전체 축하 효과
    showPageCelebrationEffect() {
        // 임시 축하 오버레이 생성
        const overlay = document.createElement('div');
        overlay.className = 'celebration-overlay';
        overlay.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            right: 0;
            bottom: 0;
            background: linear-gradient(45deg, rgba(255,215,0,0.1), rgba(255,255,255,0.05), rgba(255,215,0,0.1));
            pointer-events: none;
            z-index: 1000;
            animation: celebrationPulse 2s ease-in-out;
        `;

        // 축하 CSS 애니메이션 추가
        if (!document.getElementById('celebrationStyles')) {
            const celebrationStyles = document.createElement('style');
            celebrationStyles.id = 'celebrationStyles';
            celebrationStyles.textContent = `
                @keyframes celebrationPulse {
                    0%, 100% { opacity: 0; }
                    50% { opacity: 1; }
                }
            `;
            document.head.appendChild(celebrationStyles);
        }

        document.body.appendChild(overlay);

        // 2초 후 제거
        setTimeout(() => {
            if (overlay.parentNode) {
                overlay.remove();
            }
        }, 2000);
    }

    // 레벨업 메시지 표시
    showLevelUpMessage(newLevel) {
        const levelData = LEVEL_SYSTEM[newLevel];
        if (!levelData) return;

        // 기존 메시지 제거
        const existingMessage = document.getElementById('levelUpMessage');
        if (existingMessage) {
            existingMessage.remove();
        }

        // 새로 해제된 투자 상품 확인
        const unlockedInvestments = this.getNewlyUnlockedInvestments(newLevel);
        const unlockedText = unlockedInvestments.length > 0 ? 
            `<div class="mt-2 text-sm text-green-600">🔓 새로 해제된 투자: ${unlockedInvestments.join(', ')}</div>` : 
            '<div class="mt-2 text-sm text-gray-500">💎 새로운 특별 혜택이 해제되었습니다!</div>';

        // 새 메시지 생성
        const message = document.createElement('div');
        message.id = 'levelUpMessage';
        message.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-6 shadow-2xl text-center max-w-sm mx-4';
        message.innerHTML = `
            <div class="text-6xl mb-4">🎉</div>
            <h3 class="text-2xl font-bold text-gray-800 mb-2">등급 승급!</h3>
            <div class="level-badge-profile-v2 level-badge-metal ${levelData.class} mx-auto mb-2" style="font-size: 14px; padding: 8px 16px;">${levelData.displayName}</div>
            <p class="text-gray-600">축하합니다! <strong>${levelData.displayName}</strong> 등급이 되었습니다!</p>
            ${unlockedText}
            <button onclick="this.parentElement.remove()" class="mt-4 bg-blue-500 text-white px-4 py-2 rounded-lg text-sm hover:bg-blue-600 transition-colors">확인</button>
        `;

        document.body.appendChild(message);

        // 투자 잠금 해제 알림 (페이지별 처리)
        this.notifyInvestmentUnlock(unlockedInvestments);

        // 10초 후 자동 제거
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 10000);
    }

    // 새로 해제된 투자 상품 목록 반환
    getNewlyUnlockedInvestments(newLevel) {
        const newLevelData = LEVEL_SYSTEM[newLevel];
        if (!newLevelData || !newLevelData.investmentUnlocks) return [];

        // 이전 레벨과 비교
        const levels = Object.keys(LEVEL_SYSTEM);
        const currentIndex = levels.indexOf(newLevel);
        if (currentIndex <= 0) return newLevelData.investmentUnlocks;

        const previousLevel = levels[currentIndex - 1];
        const previousLevelData = LEVEL_SYSTEM[previousLevel];
        const previousUnlocks = previousLevelData?.investmentUnlocks || [];

        const investmentNames = {
            deposit: '예적금',
            stock: '주식',
            bond: '채권',
            etf: 'ETF/펀드',
            crypto: '암호화폐',
            commodity: '귀금속/원자재'
        };

        return newLevelData.investmentUnlocks
            .filter(investment => !previousUnlocks.includes(investment))
            .map(investment => investmentNames[investment] || investment);
    }

    // 투자 잠금 해제 알림
    notifyInvestmentUnlock(unlockedInvestments) {
        if (unlockedInvestments.length === 0) return;

        // 등급 메뉴 페이지에 있는 경우 자산 상품 업데이트
        if (typeof updateAssetProducts === 'function') {
            setTimeout(() => {
                updateAssetProducts();
            }, 500);
        }
    }

    // 경험치 추가 편의 함수 (디버깅/테스트용)
    addExp(amount) {
        return this.addExperience(amount);
    }

    // 특정 레벨로 즉시 업그레이드 (테스트용)
    setLevel(targetLevel) {
        if (!this.currentUser) return false;
        
        const levelData = LEVEL_SYSTEM[targetLevel];
        if (!levelData) return false;
        
        this.currentUser.level = targetLevel;
        this.currentUser.exp = levelData.exp;
        
        localStorage.setItem('fineu_current_user', JSON.stringify(this.currentUser));
        
        // a5.html과의 호환성을 위해 currentUser도 업데이트
        const currentUser = JSON.parse(localStorage.getItem('currentUser') || '{}');
        if (currentUser && Object.keys(currentUser).length > 0) {
            currentUser.level = targetLevel;
            currentUser.exp = levelData.exp;
            localStorage.setItem('currentUser', JSON.stringify(currentUser));
        }
        
        this.updateLevelDisplay();
        this.notifyLevelChange();
        
        return true;
    }

    // 현재 등급 정보 출력 (디버깅용)
    debugInfo() {
        const level = this.getCurrentLevel();
        const exp = this.getCurrentExp();
        console.log('=== LEVEL DEBUG INFO ===');
        console.log('Current Level:', level.displayName);
        console.log('Current EXP:', exp);
        console.log('Level Range:', level.exp, '-', level.max);
        console.log('Progress:', ((exp - level.exp) / (level.max - level.exp) * 100).toFixed(1) + '%');
        console.log('Next Level EXP needed:', level.max - exp);
        console.log('========================');
        return { level, exp };
    }
}

// 전역 레벨 매니저 인스턴스 생성
window.levelManager = new LevelManager();

// 개발자 도구에서 사용할 수 있는 편의 함수들
window.testGrades = {
    // 모든 등급 순서대로 테스트
    testAllGrades: function() {
        const grades = ['yellow', 'orange', 'green', 'blue', 'brown', 'black', 'red'];
        let index = 0;
        
        const nextGrade = () => {
            if (index < grades.length) {
                window.levelManager.setLevel(grades[index]);
                console.log(`테스트: ${LEVEL_SYSTEM[grades[index]].displayName} 등급으로 변경`);
                index++;
                setTimeout(nextGrade, 2000); // 2초마다 다음 등급
            } else {
                console.log('모든 등급 테스트 완료!');
            }
        };
        
        nextGrade();
    },
    
    // 특정 등급으로 즉시 변경
    setGrade: function(gradeName) {
        const gradeKey = Object.keys(LEVEL_SYSTEM).find(key => 
            LEVEL_SYSTEM[key].displayName.toLowerCase() === gradeName.toLowerCase()
        );
        
        if (gradeKey) {
            window.levelManager.setLevel(gradeKey);
            console.log(`${LEVEL_SYSTEM[gradeKey].displayName} 등급으로 변경됨`);
        } else {
            console.log('사용 가능한 등급: BRONZE, SILVER, GOLD, PLATINUM, DIAMOND, BLACK DIAMOND, RUBY MASTER');
        }
    },
    
    // 경험치 추가
    addExp: function(amount) {
        const result = window.levelManager.addExperience(amount);
        if (result.levelUp) {
            console.log(`🎉 레벨업! ${result.oldLevel} → ${result.newLevel}`);
        } else {
            console.log(`경험치 +${amount} 추가됨 (총 ${result.newExp} EXP)`);
        }
        return result;
    },
    
    // 현재 상태 출력
    status: function() {
        return window.levelManager.debugInfo();
    }
};

// 페이지 로드 시 레벨 표시 업데이트
document.addEventListener('DOMContentLoaded', () => {
    // 약간의 지연을 두어 모든 DOM 요소가 로드되기를 기다림
    setTimeout(() => {
        if (window.levelManager.currentUser) {
            window.levelManager.updateLevelDisplay();
        } else {
            // 사용자 정보가 없으면 기본 등급으로 설정
            const defaultUser = {
                id: 'default_user',
                level: 'yellow',
                exp: 0
            };
            localStorage.setItem('fineu_current_user', JSON.stringify(defaultUser));
            window.levelManager.loadCurrentUser();
            window.levelManager.updateLevelDisplay();
        }
    }, 100);
});

// 내보내기 (모듈 시스템 사용 시)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LevelManager, LEVEL_SYSTEM };
}