## KBSC_서다영소형석최정인

내 근처 편의점에, 특정 제품의 재고가 남아있는지 확인할 수 있게 해주는 챗봇입니다.
위치 API를 사용하기 위해, 우선 페이스북 챗봇으로 구현했습니다.
(2018년 11월 기준 - 카카오톡은 관련 API를 제공하지 않기 때문입니다.)

## 사용자 기준 UI
시작

위치 입력

제품 입력

제품 선택

편의점 선택


// 해야할 것

- 편의점 : 네이버 지도 url
- 재고 데이터베이스에서 키워드 추가해주기 (manually)
- 오타 잘 감지할 수 있는 NLP

- 편의점 영업 시간 데이터도 긁어오면 좋을거같지않음?
- 몇시까지 하는지 이런거 개중요 개각인데
- atm있는지랑 ㅋㅋ
- atm 존나 각인데?

## 개발 과정에서의 memo

### 1) heroku
정인

### 2) AWS RDS
형석

### 3) node.js 설치
정인

### 4) 페이스북 페이지 생성 및 메신저 설정
정인

### 5) 편의점 위치 데이터 및 재고 데이터 생성

### 5-1) 그..어디더라 사이트에서.. 가져와서 mysql에 가공해넣는부분
형석
### 5-2) CU 크롤링 (+이미지)
서다

### 6) app.js 함수 구현

productSearchMessage
cvsSearchMessage





git add --a .
git commit
git push heroku master 					