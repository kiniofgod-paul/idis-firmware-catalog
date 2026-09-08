# IDIS Firmware Catalog

IDIS 장비의 최신 펌웨어를 검색하고, IDIS Dashboard에서 내보낸 CSV와 비교하는 정적 웹사이트 MVP입니다. 서버나 데이터베이스 없이 GitHub Pages에서 실행되며 CSV는 사용자의 브라우저 밖으로 전송되지 않습니다.

## 로컬 실행

Node.js 22 이상이 필요합니다.

```bash
npm install
npm run dev
npm run check
```

## 카탈로그 운영과 검토

운영 데이터의 단일 원본은 `public/catalog/v1/firmware.json`입니다. 운영 사이트에서 직접 GitHub API를 호출하거나 토큰을 저장하지 않습니다.

1. 사이트의 **변경안 만들기**에서 검토용 JSON을 내려받습니다.
2. 저장소를 fork/clone하고 별도 branch에서 `firmware.json`을 수정합니다.
3. `npm run check`로 스키마, 중복 모델, 앱 빌드를 확인합니다.
4. pull request를 열고 제품 담당자 또는 릴리스 담당자의 검토를 받습니다.
5. 승인 후 `main`에 병합하면 GitHub Actions가 테스트하고 Pages에 배포합니다.

다운로드 URL과 버전은 가능하면 제조사 배포 원본과 대조하고, 보안 관련 릴리스는 `critical: true`로 표시합니다. 샘플 URL은 실제 제품별 URL로 교체해야 합니다.

## GitHub Pages 설정

저장소 **Settings → Pages → Source**를 **GitHub Actions**로 선택합니다. PR에서는 테스트와 빌드만 실행하고, `main` 병합에서만 배포합니다. Vite의 상대 base 설정 덕분에 사용자/프로젝트 Pages 양쪽에서 동작합니다.

## Dashboard 연동 계약

안정적인 공개 경로는 아래와 같습니다.

```text
https://<organization>.github.io/<repository>/catalog/v1/firmware.json
```

GitHub raw 원본이 필요한 내부 시스템은 다음 형태를 사용할 수 있습니다.

```text
https://raw.githubusercontent.com/<organization>/<repository>/main/public/catalog/v1/firmware.json
```

`v1` 계약은 다음 필드를 보장합니다.

- 루트: `schemaVersion` (`"1.0"`), `generatedAt` (ISO 8601), `products` (배열)
- 제품 필수: `model`, `family`, `category`, `version`, `releasedAt` (`YYYY-MM-DD`), `downloadUrl`, `releaseNotes`, `createdAt`, `updatedAt` (ISO 8601)
- 제품 선택: `releaseNotesUrl`, `sha256`, `critical`
- `model`은 대소문자를 무시했을 때 유일한 장비 식별자입니다.
- 버전은 점으로 구분한 숫자 형식을 권장합니다. 소비자는 숫자 세그먼트 단위로 비교해야 합니다.
- 기존 필드는 `v1`에서 제거하거나 의미를 바꾸지 않습니다. 파괴적 변경은 `/catalog/v2/`에 새 파일로 배포합니다.
- 소비자는 알 수 없는 추가 필드를 무시하고, 마지막으로 검증된 응답을 캐시해야 합니다.

Dashboard CSV에는 `model`/`Model Name`과 `currentVersion`/`Firmware Version` 열이 필요합니다. 모델이 카탈로그에 없으면 `미등록`으로 표시됩니다.

## 보안 및 접근성

- GitHub 토큰이나 쓰기 권한은 프런트엔드에 포함하지 않습니다.
- 외부 링크는 새 실행 컨텍스트를 신뢰하지 않도록 `noopener noreferrer`를 사용합니다.
- 키보드 탐색, 본문 건너뛰기, 명시적 레이블, 포커스 표시, 충분한 색 대비와 반응형 레이아웃을 제공합니다.
- 실제 배포 전 Content Security Policy와 조직의 다운로드 도메인 allowlist 적용을 권장합니다.
