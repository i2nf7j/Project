# 목업 테스트 실행

이 폴더는 정적 목업의 모델·브라우저 회귀 검증용이다. 실제 React 앱의 pnpm 설정이나 서버·DB 빌드를 대신하지 않는다. 저장소 루트(`ict-maintenance-share-system`)에서 다음 명령을 실행한다.

## 설치와 전체 검사

검증 기준은 Node.js **24.19.0**, npm **11.17.0**이다. 루트 `.node-version`과 이 폴더의 `package.json`에 런타임 기준을 기록했고, Playwright **1.63.0**과 하위 의존성은 `package-lock.json`으로 고정했다.

```powershell
npm --prefix tests ci
npm --prefix tests run browser:install
npm --prefix tests test
```

`ci`는 lockfile 기준으로 `tests/node_modules`를 설치한다. 브라우저 설치 명령은 고정된 Playwright 버전에 대응하는 Chromium을 사용자 캐시에 설치한다. 최초 설치에는 npm 레지스트리와 Playwright 다운로드 서버 접근이 필요하다. 브라우저 실행은 화면을 띄우지 않는 headless 방식이며 임시 프로필을 사용한다.

기본 검증에는 `NODE_PATH`, `.tmp-off-tools`, 별도 Edge 경로가 필요하지 않다. 기존 환경에 `TEST_BROWSER_PATH` 또는 `PLAYWRIGHT_CHANNEL`을 설정했다면 고정 Chromium 검증 전에 해제한다. 실제 테스트는 외부 날씨 호출을 차단하거나 테스트 응답으로 바꾸므로 날씨 서비스 가용성을 검증하지 않는다.

## 범위별 실행

```powershell
npm --prefix tests run test:model
npm --prefix tests run test:browser
npm --prefix tests run test:browser -- workflow.browser.cjs operation-completion.browser.cjs
```

모델 검사는 `*.test.cjs`를 Node 테스트 러너로 실행한다. 브라우저 검사는 각 `*.browser.cjs`를 별도 프로세스에서 순서대로 실행한다. `staffing.browser.cjs`는 `operations.browser.cjs`를 호출하는 호환 경로라 전체 검사에서는 중복 실행하지 않는다. 개별 파일도 루트에서 `node tests/workflow.browser.cjs`로 실행할 수 있다.

모델 명령은 60초, 개별 브라우저 파일은 120초 제한을 둔다. 실패한 파일이 있어도 나머지를 실행하고 전체 명령은 0이 아닌 종료 코드를 반환한다. 지정한 파일명이 없으면 오류로 종료한다.

## 설치된 다른 브라우저로 보조 확인

기본 Chromium과 별도로 설치된 Edge 등을 확인할 때만 사용한다. 이 경우 브라우저 자체 버전은 lockfile로 고정되지 않는다.

```powershell
$env:PLAYWRIGHT_CHANNEL = 'msedge'
npm --prefix tests run test:browser -- workflow.browser.cjs
Remove-Item Env:PLAYWRIGHT_CHANNEL
```

`TEST_BROWSER_PATH`에 실행 파일의 절대 경로를 지정할 수도 있다. 둘 다 있으면 `TEST_BROWSER_PATH`가 우선한다. 기본 선택과 환경변수 처리는 `browser.cjs` 한 곳에 모았다.

## 생성 파일과 변경 관리

- 테스트 캡처는 `tmp/test-results/`에 저장한다. 문서의 기존 `preview-*.png`를 덮어쓰지 않는다.
- 설치 파일, 캡처, 이전 임시 도구 폴더는 `.gitignore`로 제외한다. 기존 파일을 삭제하는 작업은 하지 않는다.
- 소스·테스트와 함께 `tests/package.json`, `tests/package-lock.json`, `tests/browser.cjs`, `tests/run.cjs`, `.node-version`, `.gitignore`를 버전 관리한다.
- 버전을 변경할 때만 이 폴더의 의존성 및 lockfile을 갱신하고 브라우저를 다시 설치한 뒤 전체 검사를 실행한다. 일상적인 설치는 `npm ci`를 사용한다.

## 검증의 한계

2026-10-06 Windows 검증: 위 버전의 Chromium 기본 실행으로 모델·환경 49건과 브라우저 파일 18개가 모두 통과했다. 기존 설치 폴더와 `.tmp-off-tools`를 제외한 별도 소스 복사본에서 `npm ci`로 재설치하고 `NODE_PATH`·브라우저 선택 환경변수를 해제한 뒤 전체 검사를 통과했다. 브라우저는 설치 단계에서 받은 사용자 캐시를 재사용했다. 문서용 PNG 변경은 없었다. 이는 실제 원격 Git clone 또는 다른 OS에서 실행한 결과는 아니다.

테스트의 역할 전환과 localStorage는 목업 동작 검증이다. 실제 인증·부대별 서버 권한·DB 트랜잭션·동시 사용자·배포 환경은 별도로 검증해야 한다. Linux·macOS는 실행 결과를 확보하기 전까지 검증 완료로 표시하지 않는다.
