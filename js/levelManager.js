/**
 * FINE U - 전역 레벨 관리 시스템
 * 모든 페이지에서 사용자 등급 정보를 공유하는 중앙화된 관리 시스템
 */

// 레벨 시스템 정의
const LEVEL_SYSTEM = {
    yellow: { name: 'YELLOW', exp: 0, max: 3000, class: 'level-yellow', order: 1 },
    orange: { name: 'ORANGE', exp: 3000, max: 6000, class: 'level-orange', order: 2 },
    green: { name: 'GREEN', exp: 6000, max: 10000, class: 'level-green', order: 3 },
    blue: { name: 'BLUE', exp: 10000, max: 15000, class: 'level-blue', order: 4 },
    brown: { name: 'BROWN', exp: 15000, max: 25000, class: 'level-brown', order: 5 },
    black: { name: 'BLACK', exp: 25000, max: 50000, class: 'level-black', order: 6 },
    red: { name: 'RED', exp: 50000, max: 100000, class: 'level-red', order: 7 }
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

    // 레벨 표시 업데이트 (공통 함수)
    updateLevelDisplay() {
        const level = this.getCurrentLevel();
        const exp = this.getCurrentExp();
        
        // 모든 레벨 배지 업데이트
        const levelElements = document.querySelectorAll('[id*="evelBadge"], [id*="serLevel"], .level-badge-nav, .level-badge-profile');
        
        levelElements.forEach(element => {
            if (element) {
                // 클래스 업데이트
                element.className = element.className.replace(/level-\w+/, level.class);
                if (element.className.includes('level-badge-profile')) {
                    element.className = 'level-badge-profile ' + level.class;
                } else if (element.className.includes('level-badge-nav')) {
                    element.className = 'level-badge-nav ' + level.class;
                }
                
                // 텍스트 업데이트
                element.textContent = level.name;
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
            <h3 class="text-2xl font-bold text-gray-800 mb-2">레벨 업!</h3>
            <div class="level-badge-profile ${levelData.class} mx-auto mb-2">${levelData.name}</div>
            <p class="text-gray-600">축하합니다! ${levelData.name} 등급이 되었습니다!</p>
        `;

        document.body.appendChild(message);

        // 3초 후 자동 제거
        setTimeout(() => {
            if (message.parentNode) {
                message.remove();
            }
        }, 3000);
    }
}

// 전역 레벨 매니저 인스턴스 생성
window.levelManager = new LevelManager();

// 페이지 로드 시 레벨 표시 업데이트
document.addEventListener('DOMContentLoaded', () => {
    if (window.levelManager.currentUser) {
        window.levelManager.updateLevelDisplay();
    }
});

// 내보내기 (모듈 시스템 사용 시)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { LevelManager, LEVEL_SYSTEM };
}