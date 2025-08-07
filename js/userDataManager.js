/**
 * FINE U - 개인정보 분리 및 보안 시스템
 * 사용자별 데이터 격리 및 보안 강화를 위한 관리 시스템
 */

class UserDataManager {
    constructor() {
        this.currentUserId = null;
        this.encryptionKey = 'fineu_secure_key_2024';
        this.dataValidationRules = {
            assets: { type: 'object', required: true },
            totalAssets: { type: 'number', min: 0, required: true },
            cash: { type: 'number', min: 0, required: true },
            level: { type: 'string', enum: ['yellow', 'orange', 'green', 'blue', 'brown', 'black', 'red'], required: true },
            exp: { type: 'number', min: 0, required: true }
        };
        this.init();
    }

    init() {
        // 현재 로그인된 사용자 확인
        this.loadCurrentUser();
        
        // 주기적으로 데이터 무결성 검증
        setInterval(() => {
            this.validateUserData();
        }, 30000); // 30초마다 검증
    }

    // 현재 사용자 로드
    loadCurrentUser() {
        try {
            const savedUser = localStorage.getItem('fineu_current_user');
            if (savedUser) {
                const userData = JSON.parse(savedUser);
                this.currentUserId = userData.id;
                return userData;
            }
        } catch (error) {
            console.error('사용자 정보 로드 오류:', error);
            this.logout(); // 오류 시 자동 로그아웃
        }
        return null;
    }

    // 사용자 데이터 저장 (보안 강화)
    saveUserData(userId, data) {
        try {
            // 입력 검증
            if (!userId || typeof userId !== 'string') {
                throw new Error('유효하지 않은 사용자 ID');
            }

            // 현재 사용자 권한 확인
            if (this.currentUserId !== userId) {
                throw new Error('권한 없음: 다른 사용자의 데이터에 접근할 수 없습니다');
            }

            // 데이터 유효성 검증
            const validatedData = this.validateData(data);
            
            // 타임스탬프 추가
            validatedData.lastModified = new Date().toISOString();
            validatedData.checksum = this.generateChecksum(validatedData);

            // 암호화된 형태로 저장 (기본 보안)
            const encryptedData = this.encryptData(validatedData);
            localStorage.setItem(`user_${userId}`, JSON.stringify(encryptedData));

            console.log(`사용자 ${userId} 데이터 저장 완료`);
            return true;
            
        } catch (error) {
            console.error('데이터 저장 오류:', error);
            return false;
        }
    }

    // 사용자 데이터 로드 (보안 강화)
    loadUserData(userId) {
        try {
            // 권한 확인
            if (this.currentUserId !== userId) {
                throw new Error('권한 없음: 다른 사용자의 데이터에 접근할 수 없습니다');
            }

            const savedData = localStorage.getItem(`user_${userId}`);
            if (!savedData) {
                return this.createDefaultUserData();
            }

            const encryptedData = JSON.parse(savedData);
            const decryptedData = this.decryptData(encryptedData);

            // 체크섬 검증
            if (!this.verifyChecksum(decryptedData)) {
                console.warn('데이터 무결성 검증 실패, 기본값으로 복원');
                return this.createDefaultUserData();
            }

            return decryptedData;
            
        } catch (error) {
            console.error('데이터 로드 오류:', error);
            return this.createDefaultUserData();
        }
    }

    // 데이터 유효성 검증
    validateData(data) {
        const validatedData = {};
        
        for (const [key, rule] of Object.entries(this.dataValidationRules)) {
            const value = data[key];
            
            // 필수 필드 확인
            if (rule.required && (value === undefined || value === null)) {
                throw new Error(`필수 필드 누락: ${key}`);
            }

            if (value !== undefined) {
                // 타입 검증
                if (rule.type === 'number' && typeof value !== 'number') {
                    throw new Error(`잘못된 타입: ${key}는 숫자여야 합니다`);
                }
                if (rule.type === 'string' && typeof value !== 'string') {
                    throw new Error(`잘못된 타입: ${key}는 문자열이어야 합니다`);
                }
                if (rule.type === 'object' && typeof value !== 'object') {
                    throw new Error(`잘못된 타입: ${key}는 객체여야 합니다`);
                }

                // 범위 검증
                if (rule.min !== undefined && value < rule.min) {
                    throw new Error(`범위 오류: ${key}는 ${rule.min} 이상이어야 합니다`);
                }
                if (rule.max !== undefined && value > rule.max) {
                    throw new Error(`범위 오류: ${key}는 ${rule.max} 이하여야 합니다`);
                }

                // 열거형 검증
                if (rule.enum && !rule.enum.includes(value)) {
                    throw new Error(`잘못된 값: ${key}는 [${rule.enum.join(', ')}] 중 하나여야 합니다`);
                }

                validatedData[key] = value;
            }
        }

        return validatedData;
    }

    // 기본 사용자 데이터 생성
    createDefaultUserData() {
        return {
            assets: {},
            totalAssets: 10000000,
            cash: 10000000,
            level: 'yellow',
            exp: 0,
            lastModified: new Date().toISOString(),
            checksum: ''
        };
    }

    // 데이터 암호화 (기본 XOR 암호화)
    encryptData(data) {
        try {
            const jsonString = JSON.stringify(data);
            let encrypted = '';
            
            for (let i = 0; i < jsonString.length; i++) {
                const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                const dataChar = jsonString.charCodeAt(i);
                encrypted += String.fromCharCode(dataChar ^ keyChar);
            }
            
            return btoa(encrypted); // Base64 인코딩
        } catch (error) {
            console.error('암호화 오류:', error);
            return data; // 암호화 실패시 원본 반환
        }
    }

    // 데이터 복호화
    decryptData(encryptedData) {
        try {
            if (typeof encryptedData === 'object') {
                return encryptedData; // 이미 복호화된 데이터
            }

            const encrypted = atob(encryptedData); // Base64 디코딩
            let decrypted = '';
            
            for (let i = 0; i < encrypted.length; i++) {
                const keyChar = this.encryptionKey.charCodeAt(i % this.encryptionKey.length);
                const encChar = encrypted.charCodeAt(i);
                decrypted += String.fromCharCode(encChar ^ keyChar);
            }
            
            return JSON.parse(decrypted);
        } catch (error) {
            console.error('복호화 오류:', error);
            return encryptedData; // 복호화 실패시 원본 반환
        }
    }

    // 체크섬 생성
    generateChecksum(data) {
        try {
            const dataString = JSON.stringify(data);
            let hash = 0;
            
            for (let i = 0; i < dataString.length; i++) {
                const char = dataString.charCodeAt(i);
                hash = ((hash << 5) - hash) + char;
                hash = hash & hash; // 32비트 정수로 변환
            }
            
            return hash.toString();
        } catch (error) {
            console.error('체크섬 생성 오류:', error);
            return '';
        }
    }

    // 체크섬 검증
    verifyChecksum(data) {
        try {
            const savedChecksum = data.checksum;
            const tempData = { ...data };
            delete tempData.checksum;
            
            const calculatedChecksum = this.generateChecksum(tempData);
            return savedChecksum === calculatedChecksum;
        } catch (error) {
            console.error('체크섬 검증 오류:', error);
            return false;
        }
    }

    // 데이터 무결성 검증
    validateUserData() {
        if (!this.currentUserId) return;
        
        try {
            const userData = this.loadUserData(this.currentUserId);
            if (!userData) {
                console.warn('사용자 데이터가 없습니다');
                return;
            }

            // 기본 무결성 검증
            if (userData.totalAssets < 0 || userData.cash < 0) {
                console.warn('비정상적인 자산 데이터 감지');
                this.resetUserAssets();
            }

        } catch (error) {
            console.error('데이터 검증 오류:', error);
        }
    }

    // 자산 데이터 리셋
    resetUserAssets() {
        if (!this.currentUserId) return;
        
        const defaultData = this.createDefaultUserData();
        this.saveUserData(this.currentUserId, defaultData);
        
        alert('데이터 무결성 문제로 인해 자산이 초기화되었습니다.');
    }

    // 사용자별 데이터 접근 권한 확인
    hasDataAccess(userId, dataType = 'basic') {
        // 본인 데이터만 접근 가능
        if (this.currentUserId !== userId) {
            return false;
        }

        // 데이터 타입별 추가 권한 확인 가능
        switch (dataType) {
            case 'basic':
                return true;
            case 'financial':
                return this.verifyFinancialAccess();
            case 'admin':
                return false; // 일반 사용자는 관리자 데이터 접근 불가
            default:
                return false;
        }
    }

    // 금융 데이터 접근 권한 확인
    verifyFinancialAccess() {
        // 추가 보안 검증 로직 (예: 최근 로그인 시간 확인)
        const currentUser = this.loadCurrentUser();
        return currentUser && currentUser.id === this.currentUserId;
    }

    // 로그아웃 및 데이터 정리
    logout() {
        this.currentUserId = null;
        localStorage.removeItem('fineu_current_user');
        console.log('사용자 로그아웃 완료');
    }

    // 사용자 데이터 완전 삭제 (GDPR 대응)
    deleteUserData(userId) {
        if (this.currentUserId !== userId) {
            throw new Error('권한 없음: 다른 사용자의 데이터를 삭제할 수 없습니다');
        }

        localStorage.removeItem(`user_${userId}`);
        console.log(`사용자 ${userId} 데이터 삭제 완료`);
    }
}

// 전역 사용자 데이터 매니저 인스턴스 생성
window.userDataManager = new UserDataManager();

// 내보내기 (모듈 시스템 사용 시)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = UserDataManager;
}