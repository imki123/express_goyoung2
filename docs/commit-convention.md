# 커밋 컨벤션

[Conventional Commits](https://www.conventionalcommits.org/) 규칙을 따릅니다.

## 형식

```
<type>(<scope>): <subject>
```

- `scope`: 변경 대상 도메인 또는 레이어 (선택)
- `subject`: 명령형, 소문자 시작, 마침표 없음

### 주요 scope

| scope | 설명 |
| ----- | ---- |
| `memo` | 메모 앱 전반 |
| `memo/user` | 메모 앱 사용자 인증·잠금 |
| `memo/memos` | 메모 CRUD |
| `account-book` | 가계부 앱 전반 |
| `account-book/user` | 가계부 앱 사용자 인증 |
| `account-book/sheet` | 가계부 시트 관리 |
| `account-book/type` | 가계부 타입 관리 |
| `catbook` | 캣북 앱 (고양이 검색) |
| `infra` | 배포, 서버 설정 |

## 타입

| 타입 | 용도 |
| ---- | ---- |
| `feat` | 새 기능 |
| `fix` | 버그 수정 |
| `refactor` | 기능 변경 없는 코드 개선 |
| `docs` | 문서 변경 |
| `chore` | 빌드·설정·의존성 등 기타 |
| `test` | 테스트 추가·수정 |

## 예시

```
feat(memo/memos): 메모 태그 필터 추가
feat(memo/user): 잠금 화면 자동 표시 추가
fix(memo/user): removeLock 비밀번호 검증 누락 수정
fix(account-book/user): 로그인 토큰 만료 처리
refactor(account-book/sheet): 시트 조회 로직 분리
feat(catbook): 품종 목록 조회 추가
docs: 커밋 컨벤션 업데이트
chore: pnpm 버전 고정
```
