## KBSC_서다영소형석최정인

사용자가 지정한 위치 근방 편의점에 특정 제품의 재고가 남아있는지 확인할 수 있는 챗봇입니다.
위치 API를 사용하기 위해, 우선 페이스북 챗봇으로 구현했습니다.
(2018년 11월 기준 - 카카오톡은 관련 API를 제공하지 않고 이를 해결하기 위해서는 따로 지도 application에서 현재 위치를 찍은 후 주소를 카카오톡에 다시 입력해주는 번거로움이 존재하기 때문입니다.)

## 사용자 기준 UI

시작 (user가 '시작'이라는 단어를 포함하는 문장을 입력하거나, 우측 하단의 like 버튼을 누르면 시작)
->
위치 입력 (send location 버튼을 통해 현재 위치 또는 search한 위치 전송) 
->
검색 (상품 또는 서비스 선택 가능, 상품 선택 시 상품명 입력)
->
제품 선택 (입력된 상품명을 바탕으로 알고리즘 검색을 통해 상위 4개의 값 출력, user는 이 중 하나의 상품을 선택)
->
편의점 선택 (입력된 상품을 바탕으로 재고가 있는 편의점들을 거리가 제일 가까운 순서대로 출력)
-> 
지도 출력 (편의점의 위치 전송)

## 발전할 점

- 상품명 입력 후 오타를 잘 감지해 사용자가 원하는 제품을 출력하는 알고리즘 강화
- emart24를 제외한 편의점의 실질적인 영업 시간 및 atm, 복권 판매 유무 데이터 
- dummy data가 아닌 실제 편의점의 재고 데이터		


## 개발 과정에서의 memo

### 1) heroku
정인

### 2) AWS RDS
- rds 만드는 과정 : http://kay0426.tistory.com/3 의 b 파트 참고
- 서버 시간을 서울 또는 다른 지역으로 맞추기 : http://brtech.tistory.com/95 참고

### 3) node.js 설치
정인

### 4) 페이스북 페이지 생성 및 메신저 설정
정인

### 5) 편의점 위치 데이터 및 재고 데이터 생성

### 5-1) 데이터 수집 후 가공
- 대부분의 과정은 http://kay0426.tistory.com/3 을 따라했습니다.
#### raw data
- 공공데이터포털 https://www.data.go.kr/dataset/15012005/fileData.do 에서 2018년 09월 버젼으로 가져옴
- 다운로드 후 파일명 영어로 변환
#### 데이터 입력
- heidisql 이라는 프로그램 사용
- http://kay0426.tistory.com/3 참고해서 raw data를 stores201809 테이블에 입력 (넣는 데 시간 꽤 걸림)
#### 데이터 가공
1) 한정된 장소의 편의점 테이터 가져오기
- stores201809 테이블은 거대하므로 (약 1.2기가) 편의점 데이터만 가져와야 한다.
- 편의점 전부를 불러오기에 방대하므로 지역을 위도 경도 기준으로 한정시킴 
insert into convenient_stores201809
(
select st_name, st_branch, roadadd_name, lng, lat 
from stores201809
where cat3_name like '편의점' and lng >= 126.9001362000 and lng <= 127.0942112999 and lat >= 37.4652283 and lat <= 37.5218688
);

2) cs_name + cs_branch의 중복된 편의점명 제거
- cs_name이 CU영등포점, cs_branch가 영등포점이라 되어 있는 경우 cs_name + cs_branch를 출력하면 CU영등포점영등포점이라는 결과 도출됨
- 일부 데이터는 cs_name이 CU, cs_branch가 영등포점이라 cs_name만 출력하면 CU라는 결과 도출됨
- 겹치는 값 일부를 cs_name에서 제거
- 한글일 경우 length가 아닌 char_length를 써야 자신이 원하는 결과를 얻을 수 있음
update convenient_stores201809 set cs_name = left(cs_name, char_length(cs_name)-char_length(cs_branch)-0) where cs_name like concat('%', cs_branch);

3) 중복된 위도 경도 제거
- 정리한 값들을 살펴보니 위도 경도가 동일한데 가게 이름이 다른 경우가 존재함 (Ex] 서울대학교 앞 편의점)
insert into convenient_stores201809_final
(
	select * from convenient_stores201809 group by concat(lng, lat)
);

4) dummy data item_stock 생성
- 엑셀로 만들어서 csv 파일로 변환 후 이를 다시 heidisql 통해 넣어주는 과정이 귀찮아 찾아본 결과
- loopinsert라는 procedure을 만들어준 후 이를 실행해준다는 간단한 코드
- 직접 돌려본 결과 끔찍하게 시간이 오래 걸려 중간에 중단함
- 적은 양의 데이터를 랜덤으로 생성해야할 경우 사용하기 적당함, 데이터셋이 많을 경우 엑셀을 사용하는 것을 강력하게 추천함
DELIMITER $$
DROP PROCEDURE IF EXISTS loopInsert$$
CREATE PROCEDURE loopInsert()
BEGIN
	DECLARE i INT DEFAULT 1;
	DECLARE j INT DEFAULT 1;
	WHILE i <= 1720 DO
		SET j = 1;
		WHILE j <= 3932 DO
		INSERT INTO item_stock (cs_id, item_id, amount)
      VALUES (i, j, floor(rand()*4));
		SET j = j + 1;
		END WHILE;
		SET i = i + 1;
	END WHILE;
END$$
DELIMITER ;

CALL loopInsert;

4-1) item_stock 에 크롤링한 이마트24 데이터 입력
- 받아온 emart24 데이터 정보 중 일부만을 item_stock 형식에 맞게 변환해줘야 함
- 편의점이 emart24가 아닌 데이터는 amount를 0, 나머지는 emart24 테이블 내의 값(convenient_stores201809_emart24.delivery)을 입력  
DELIMITER $$
DROP PROCEDURE IF EXISTS loopInsert$$
CREATE PROCEDURE loopInsert()
BEGIN
	DECLARE i INT DEFAULT 1;
	DECLARE j INT DEFAULT 3933;
	WHILE j <= 3933 DO
		SET i = 1;
		WHILE i <= 1928 DO
		INSERT INTO item_stock (cs_id, item_id, amount)
      VALUES (i, j, (select if(i >= 1713 and i <= 1906, convenient_stores201809_emart24.delivery, 0) from convenient_stores201809_final, convenient_stores201809_emart24 where convenient_stores201809_final.cs_id = i and convenient_stores201809_final.cs_branch like convenient_stores201809_emart24.cs_branch) );
		SET i = i + 1;
		END WHILE;
		SET j = j + 1;
	END WHILE;
END$$
DELIMITER ;

CALL loopInsert;

5) 조건에 맞는 편의점 정보 출력
- 이 코드는 매우 길기 때문에 잘라서 설명하도록 하겠음

- 데이터는 stores1.convenient_stores201809_final (편의점 데이터), stores1.item_stock (cs_id에 따른 item의 개수 데이터),
stores1.item_table (아이템 데이터), 그리고 user_data_a 가 있음.
(select * from stores1.user_data where user_id like "2020975531301288" order by time desc limit 1) as user_data_a
는 user_id가 현재 메신저를 보낸 사람의 id와 같을 때, 보낸 시간이 가장 최신 데이터셋 1줄이라는 의미이다.

- 우리가 select한 데이터는 distance, stores1.convenient_stores201809_final.lng, stores1.convenient_stores201809_final.lat, 
stores1.convenient_stores201809_final.cs_name, stores1.convenient_stores201809_final.cs_branch 으로 위도 경도 편의점명과 거리임
((stores1.convenient_stores201809_final.lng - user_data_a.lng) * (stores1.convenient_stores201809_final.lng - user_data_a.lng) 
+ (stores1.convenient_stores201809_final.lat - user_data_a.lat)*(stores1.convenient_stores201809_final.lat - user_data_a.lat)) 
as distance
는 distance를 우리가 가져온 user_data_a의 위도 경도값과 편의점 전체의 위도 경도값 사이의 유클리드 거리의 제곱이다.

- 선택한 데이터 중
1) user_data_a.user_id like "2020975531301288"
user_id가 현재 메시지를 보낸 user이고
2) stores1.item_table.item_name like concat("%",user_data_a.item_name,"%")
item_table의 item_name이 user가 list template에서 선택한 item_name이며
3) stores1.item_table.item_id = stores1.item_stock.item_id and stores1.item_stock.cs_id = stores1.convenient_stores201809_final.cs_id and stores1.item_stock.amount > 0
item_stock 테이블 중 item_id와 cs_id가 일치하는 값의 amount(item 갯수) 가 0보다 커야 하고
4) ((stores1.convenient_stores201809_final.cs_start_time <= hour(user_data_a.time)*100+minute(user_data_a.time) and hour(user_data_a.time)*100+minute(user_data_a.time) <= stores1.convenient_stores201809_final.cs_end_time) or
(stores1.convenient_stores201809_final.cs_start_time <= hour(user_data_a.time)*100+minute(user_data_a.time) +2400 and hour(user_data_a.time)*100+minute(user_data_a.time) + 2400 <= stores1.convenient_stores201809_final.cs_end_time))
user_data_a의 시간을 int로 변환한 값 hour(user_data_a.time)*100+minute(user_data_a.time) (Ex] 17시 43분이면 1743) 이 편의점 오픈 시간과 편의점 종료 시간 사이에 있는가 (현재 시간이 01시일 경우 01시와 25시 두 번에 대해 검색함)
을 만족하는 편의점 정보를 출력함

- distance를 기준으로 오름차순으로 정렬한 후 3개의 데이터 셋만 출력하기 위해 order by distance asc limit 3 이라는 정보를 씀

- 결론 :
select ((stores1.convenient_stores201809_final.lng - user_data_a.lng) * (stores1.convenient_stores201809_final.lng - user_data_a.lng) 
+ (stores1.convenient_stores201809_final.lat - user_data_a.lat)*(stores1.convenient_stores201809_final.lat - user_data_a.lat)) 
as distance, stores1.convenient_stores201809_final.lng, stores1.convenient_stores201809_final.lat, 
stores1.convenient_stores201809_final.cs_name, stores1.convenient_stores201809_final.cs_branch 
from stores1.convenient_stores201809_final, stores1.item_stock, 
(select * from stores1.user_data where user_id like "2020975531301288" order by time desc limit 1) as user_data_a, stores1.item_table 
where user_data_a.user_id like "2020975531301288"
and stores1.item_table.item_name like concat("%",user_data_a.item_name,"%") 
and stores1.item_table.item_id = stores1.item_stock.item_id 
and stores1.item_stock.cs_id = stores1.convenient_stores201809_final.cs_id 
and stores1.item_stock.amount > 0
and ((stores1.convenient_stores201809_final.cs_start_time <= hour(user_data_a.time)*100+minute(user_data_a.time) and hour(user_data_a.time)*100+minute(user_data_a.time) <= stores1.convenient_stores201809_final.cs_end_time) or
(stores1.convenient_stores201809_final.cs_start_time <= hour(user_data_a.time)*100+minute(user_data_a.time) +2400 and hour(user_data_a.time)*100+minute(user_data_a.time) + 2400 <= stores1.convenient_stores201809_final.cs_end_time))
order by distance asc limit 3;

- 그 외에도 많은 sql 코드를 썼지만 이 정도만 이해하더라도 sql은 어느 정도 사용할 수 있음
- 만약 데이터가 있을 때는 update하고 데이터가 없을 때는 insert 하고 싶다면 if not exists 보다 replace 함수를 쓰기를  

### 5-2) CU 크롤링 (+이미지)
서다

### 6) app.js 함수 구현

productSearchMessage
cvsSearchMessage





git add --a .
git commit
git push heroku master 
