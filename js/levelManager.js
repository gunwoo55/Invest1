/**
 * FINE U - 전역 레벨 관리 시스템
 * 모든 페이지에서 사용자 등급 정보를 공유하는 중앙화된 관리 시스템
 */

// 레벨 시스템 정의 (금속 효과 포함)
const LEVEL_SYSTEM = {
    yellow: { 
        name: 'BRONZE', 
        exp: 0, 
        max: 3000, 
        class: 'level-bronze level-metal-bronze', 
        order: 1,
        metalType: 'bronze',
        displayName: 'BRONZE'
    },
    orange: { 
        name: 'SILVER', 
        exp: 3000, 
        max: 6000, 
        class: 'level-silver level-metal-silver', 
        order: 2,
        metalType: 'silver',
        displayName: 'SILVER'
    },
    green: { 
        name: 'GOLD', 
        exp: 6000, 
        max: 10000, 
        class: 'level-gold level-metal-gold', 
        order: 3,
        metalType: 'gold',
        displayName: 'GOLD'
    },
    blue: { 
        name: 'PLATINUM', 
        exp: 10000, 
        max: 15000, 
        class: 'level-platinum level-metal-platinum', 
        order: 4,
        metalType: 'platinum',
        displayName: 'PLATINUM'
    },
    brown: { 
        name: 'DIAMOND', 
        exp: 15000, 
        max: 25000, 
        class: 'level-diamond level-metal-diamond', 
        order: 5,
        metalType: 'diamond',
        displayName: 'DIAMOND'
    },
    black: { 
        name: 'BLACK DIAMOND', 
        exp: 25000, 
        max: 50000, 
        class: 'level-black-diamond level-metal-black-diamond', 
        order: 6,
        metalType: 'black-diamond',
        displayName: 'BLACK DIAMOND'
    },
    red: { 
        name: 'RUBY MASTER', 
        exp: 50000, 
        max: 100000, 
        class: 'level-ruby level-metal-ruby', 
        order: 7,
        metalType: 'ruby',
        displayName: 'RUBY MASTER'
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

    // 레벨별 접근 권한 체크
    hasLevelAccess(requiredLevel) {
        if (!this.currentUser) return false;
        
        const currentLevelOrder = LEVEL_SYSTEM[this.currentUser.level]?.order || 1;
        const requiredLevelOrder = LEVEL_SYSTEM[requiredLevel]?.order || 1;
        
        return currentLevelOrder >= requiredLevelOrder;
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

            /* BRONZE (브론즈) 효과 */
            .level-metal-bronze {
                background: linear-gradient(145deg, #CD7F32, #B8860B, #CD7F32);
                border: 1px solid #8B4513;
            }

            /* SILVER (실버) 효과 */
            .level-metal-silver {
                background: linear-gradient(145deg, #C0C0C0, #E5E5E5, #C0C0C0);
                border: 1px solid #A9A9A9;
            }

            /* GOLD (골드) 효과 */
            .level-metal-gold {
                background: linear-gradient(145deg, #FFD700, #FFF8DC, #FFD700);
                border: 1px solid #DAA520;
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.4),
                    inset 0 -1px 0 rgba(0,0,0,0.2),
                    0 2px 8px rgba(255,215,0,0.4);
            }

            /* PLATINUM (플래티넘) 효과 */
            .level-metal-platinum {
                background: linear-gradient(145deg, #E5E4E2, #F8F8FF, #E5E4E2);
                border: 1px solid #D3D3D3;
            }

            /* DIAMOND (다이아몬드) 효과 */
            .level-metal-diamond {
                background: linear-gradient(145deg, #B9F2FF, #E0FFFF, #B9F2FF);
                border: 1px solid #87CEEB;
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.6),
                    inset 0 -1px 0 rgba(0,0,0,0.1),
                    0 2px 12px rgba(185,242,255,0.5);
            }

            .level-metal-diamond::after {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                bottom: 0;
                background: 
                    radial-gradient(circle at 20% 20%, rgba(255,255,255,0.8) 2px, transparent 2px),
                    radial-gradient(circle at 80% 80%, rgba(255,255,255,0.6) 1px, transparent 1px);
                animation: sparkle 2s infinite;
                pointer-events: none;
            }

            @keyframes sparkle {
                0%, 100% { opacity: 0.8; }
                50% { opacity: 1; }
            }

            /* BLACK DIAMOND (블랙 다이아몬드) 효과 */
            .level-metal-black-diamond {
                background: linear-gradient(145deg, #2F2F2F, #4A4A4A, #2F2F2F);
                border: 1px solid #1C1C1C;
                color: #E0E0E0;
            }

            /* RUBY MASTER (루비 마스터) 효과 */
            .level-metal-ruby {
                background: linear-gradient(145deg, #E0115F, #FF6B6B, #E0115F);
                border: 1px solid #B22222;
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.3),
                    inset 0 -1px 0 rgba(0,0,0,0.3),
                    0 2px 12px rgba(224,17,95,0.4);
            }

            /* 호버 효과 강화 */
            .level-badge-metal:hover {
                transform: translateY(-2px) scale(1.05);
                box-shadow: 
                    inset 0 1px 0 rgba(255,255,255,0.4),
                    inset 0 -1px 0 rgba(0,0,0,0.2),
                    0 4px 16px rgba(0,0,0,0.4);
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
        const levelElements = document.querySelectorAll('[id*="evelBadge"], [id*="serLevel"], .level-badge-nav, .level-badge-profile');
        
        levelElements.forEach(element => {
            if (element) {
                // 기존 level 클래스 제거
                element.className = element.className.replace(/level-\w+/g, '');
                
                // 새로운 클래스 적용
                if (element.className.includes('level-badge-profile')) {
                    element.className = 'level-badge-profile level-badge-metal ' + level.class;
                } else if (element.className.includes('level-badge-nav')) {
                    element.className = 'level-badge-nav level-badge-metal ' + level.class;
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
            expElement.textContent = `${exp} / ${level.max} EXP`;
        }

        // 진행바 업데이트 (있는 경우)
        const progressBars = document.querySelectorAll('.exp-bar, .progress-bar');
        progressBars.forEach(bar => {
            if (bar) {
                const progress = ((exp - level.exp) / (level.max - level.exp)) * 100;
                bar.style.width = Math.min(progress, 100) + '%';
            }
        });
    }

    // 레벨업 애니메이션 표시
    showLevelUpAnimation(newLevel) {
        // 레벨 배지에 애니메이션 효과 추가
        const levelBadges = document.querySelectorAll('.level-badge-nav, .level-badge-profile');
        levelBadges.forEach(badge => {
            badge.classList.add('level-up-animation');
            setTimeout(() => {
                badge.classList.remove('level-up-animation');
            }, 2000);
        });

        // 레벨업 메시지 표시
        this.showLevelUpMessage(newLevel);
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

        // 새 메시지 생성
        const message = document.createElement('div');
        message.id = 'levelUpMessage';
        message.className = 'fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-50 bg-white rounded-2xl p-6 shadow-2xl text-center';
        message.innerHTML = `
            <div class="text-6xl mb-4">🎉</div>
            <h3 class="text-2xl font-bold text-gray-800 mb-2">등급 승급!</h3>
            <div class="level-badge-profile level-badge-metal ${levelData.class} mx-auto mb-2" style="font-size: 14px; padding: 8px 16px;">${levelData.displayName}</div>
            <p class="text-gray-600">축하합니다! <strong>${levelData.displayName}</strong> 등급이 되었습니다!</p>
            <div class="mt-4 text-sm text-gray-500">
                💎 새로운 특별 혜택이 해제되었습니다!
            </div>
        `;

        document.body.appendChild(message);

        // 5초 후 자동 제거
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 5000);
    }
}

// 전역 레벨 매니저 인스턴스 생성
window.levelManager = new LevelManager();

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