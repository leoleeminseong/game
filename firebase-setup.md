# Firebase Realtime Database 설정 가이드

## 1. Firebase 프로젝트 생성

1. [Firebase Console](https://console.firebase.google.com/) 접속
2. "프로젝트 추가" 클릭
3. 프로젝트 이름 입력 (예: pixel-shooter-game)
4. Google Analytics 설정 (선택사항)
5. 프로젝트 생성 완료

## 2. Realtime Database 설정

1. Firebase Console에서 "빌드" → "Realtime Database" 선택
2. "데이터베이스 만들기" 클릭
3. 위치 선택 (asia-northeast3 - Seoul 권장)
4. 보안 규칙 선택:
   - **테스트 모드**: 30일 동안 누구나 읽기/쓰기 가능 (개발용)
   - **잠금 모드**: 모든 액세스 차단 (나중에 규칙 설정)

### 권장 보안 규칙 (나중에 설정):

```json
{
  "rules": {
    "leaderboard": {
      ".read": true,
      ".write": true,
      ".indexOn": ["level", "timestamp"],
      "$recordId": {
        ".validate": "newData.hasChildren(['name', 'level', 'aircraft', 'mode', 'date', 'timestamp'])"
      }
    }
  }
}
```

## 3. Firebase 구성 정보 가져오기

1. Firebase Console에서 프로젝트 설정 (⚙️ 아이콘) 클릭
2. "일반" 탭에서 "내 앱" 섹션으로 스크롤
3. 웹 앱 추가 (</> 아이콘)
4. 앱 닉네임 입력 (예: Pixel Shooter Web)
5. "Firebase SDK 추가" 단계에서 구성 객체 복사

구성 정보 예시:
```javascript
{
  apiKey: "AIzaSyC...",
  authDomain: "pixel-shooter-game.firebaseapp.com",
  databaseURL: "https://pixel-shooter-game-default-rtdb.firebaseio.com",
  projectId: "pixel-shooter-game",
  storageBucket: "pixel-shooter-game.appspot.com",
  messagingSenderId: "123456789012",
  appId: "1:123456789012:web:abcdef123456"
}
```

## 4. 게임 코드에 적용

`pixel_shooting.js` 파일 상단의 `firebaseConfig` 객체를 자신의 Firebase 구성으로 교체:

```javascript
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "YOUR_PROJECT.firebaseapp.com",
  databaseURL: "https://YOUR_PROJECT-default-rtdb.firebaseio.com",
  projectId: "YOUR_PROJECT",
  storageBucket: "YOUR_PROJECT.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};
```

## 5. 테스트

1. 게임 실행 (`index.html` 열기)
2. 브라우저 개발자 도구 (F12) → Console 탭 확인
3. "Firebase initialized successfully" 메시지 확인
4. 게임 플레이 후 게임 오버
5. Firebase Console → Realtime Database에서 데이터 확인

## 6. 데이터 구조

Firebase에 저장되는 리더보드 데이터 구조:

```
leaderboard/
  ├─ -N1234abcd/
  │   ├─ name: "Player1"
  │   ├─ level: 150
  │   ├─ aircraft: "PHOENIX X-99"
  │   ├─ mode: "Normal"
  │   ├─ date: "2025-11-02T12:34:56.789Z"
  │   └─ timestamp: 1730548496789
  ├─ -N1234efgh/
  │   ├─ name: "Player2"
  │   ├─ level: 250
  │   └─ ...
  └─ ...
```

## 7. 문제 해결

### Firebase가 연결되지 않는 경우:
- 브라우저 콘솔에서 에러 메시지 확인
- Firebase 구성 정보가 정확한지 확인
- Realtime Database가 생성되었는지 확인
- 보안 규칙이 읽기/쓰기를 허용하는지 확인

### 리더보드가 표시되지 않는 경우:
- 리더보드 화면에서 "Firebase Connected" 상태 확인
- Firebase Console에서 데이터가 저장되었는지 확인
- 브라우저 콘솔에서 에러 로그 확인

### Local Only로 표시되는 경우:
- Firebase 초기화 실패
- `firebaseConfig`가 올바르게 설정되지 않음
- 네트워크 연결 문제

## 8. 보안 고려사항

⚠️ **중요**: 프로덕션 환경에서는 반드시 적절한 보안 규칙을 설정하세요!

- API 키는 공개되어도 괜찮지만, 보안 규칙은 반드시 설정
- 테스트 모드는 30일 후 자동으로 차단됨
- 스팸 방지를 위해 쓰기 제한 추가 권장

## 9. 비용

Firebase Realtime Database 무료 플랜:
- 동시 연결: 100명
- 저장 용량: 1GB
- 다운로드: 10GB/월

일반적인 게임 사용량으로는 무료 플랜으로 충분합니다.

## 10. 백업

Firebase Console에서 데이터 백업:
1. Realtime Database → 데이터 탭
2. ⋮ 메뉴 → "JSON 내보내기"
3. JSON 파일로 저장

게임 내 백업:
- 리더보드 화면에서 "Export" 버튼 사용
- JSON 파일로 백업 가능
