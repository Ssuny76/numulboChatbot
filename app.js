'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

const cuImg = "http://cu.bgfretail.com/images/facebook.jpg";
const gs25Img = "http://img.wemep.co.kr/deal/7/521/2445217/9e9b234d572e260e9f38d6fc3131da3bb2b5b40c.jpg";
const emart24Img = "https://pds.joins.com/news/component/htmlphoto_mmdata/201709/18/htm_20170918164238563309.jpg";
const ministopImg = "https://www.bworldonline.com/wp-content/uploads/2018/09/ministop-logo.jpg";
const seven11Img = "https://cdn.nashvillepost.com/files/base/scomm/nvp/image/2017/11/1x1/640w/282715_10150304196888255_7461934_n.5a134ca8c3f4f.jpg";
const defaultImg = "http://www.bishnoiagro.com/Bish@dmin/assets/img/no-logo.jpg";

const greeting = 'GREETING';
const START_SEARCH_NO = 'START_SEARCH_NO';
const START_SEARCH_YES = 'START_SEARCH_YES';
const CVSinfo = 'CVSinfo';
const Help = 'Help';

const mysql = require('mysql2');

const connection = mysql.createConnection({
    host:"mysql.cm8nmhebfeax.ap-northeast-2.rds.amazonaws.com",
    port:3306,
    database:"mysql",
    user:"robotronic",
    password:"12341234",
    connectTimeout: 60000
});

connection.connect(function(err) {
  if (err) {
    console.error('error connecting: ', err);
    return;
  }
});

//이 토큰이 포함된 파일을 절대 업로드하거나 github에 적용시키지 마세요.
var PAGE_ACCESS_TOKEN = 'EAAd7X8SEqH8BAOrCQdZCTrgofOvhQnlW5jWyQf0Jb8EOjj2gdGZCbcZA38FnSPy3zFtXRSdLEG9xCUHVzyOVBoybndBMESi0rH3yfY2rmXRUOfexthFZBrRPDVZBZA0bBdtWUcpRgEPXeKWQ2iXeGsKEiCdBdsrDbNhzNfb8WASwZDZD';

app.set('port', (process.env.PORT || 5000));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

app.get('/', function(req, res) {
    res.send('Hello world');
})


app.get('/webhook', function(req, res) {
    if (req.query['hub.verify_token'] === 'VERIFY_TOKEN') {
        res.send(req.query['hub.challenge']);
    }
    res.send('Error, wrong token');
})

app.post("/webhook", function(req, res) {
    console.log("WEBHOOK GET IT WORKS");
    var data = req.body;
    console.log(data);

    // Make sure this is a page subscription
    if (data.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        data.entry.forEach(function(pageEntry) {
            var pageID = pageEntry.id;
            var timeOfEvent = pageEntry.time;


            var messagingEvent = pageEntry && pageEntry.messaging;

            // Iterate over each messaging event
            if(messagingEvent)
            pageEntry.messaging.forEach(function(messagingEvent) {
                console.log("forEach는 들어옴");
                if (messagingEvent.message) {
                    if (messagingEvent.message.quick_reply){
                      console.log("quick_reply를 인식함");
                      receivedPostback(messagingEvent.sender.id, messagingEvent.message.quick_reply);
                    } else {
                      if(messagingEvent.sender.id!=349086052585964){
                        console.log("message를 인식은함");
                        receivedMessage(messagingEvent);
                      }else{
                        console.log("메신저의 메시");
                      }
                    }
                }else if (messagingEvent.postback) {
                    console.log("postback으로 인식중");
                    console.log(messagingEvent.postback);
                    receivedPostback(messagingEvent.sender.id, messagingEvent.postback);
                }else {
                    console.log("Webhook received unknown messagingEvent: ", messagingEvent);
                }
            });
        });

        res.sendStatus(200);
    }
});









function receivedMessage(event) {
    var senderId = event.sender.id;
    var content = event.message.text;
    //var echo_message = "ECHO : " + content;

     // check if it is a location message
    console.log('handleMEssage message:', JSON.stringify(event));
    const locationAttachment = event && event.message.attachments && event.message.attachments.find(a => a.type === 'location');
    const coordinates = locationAttachment && locationAttachment.payload && locationAttachment.payload.coordinates;
    if (coordinates && !isNaN(coordinates.lat) && !isNaN(coordinates.long)){
        
        var locationSQL = 'INSERT INTO stores1.temp_data(user_id, lat, lng) VALUES(?,?,?);';
        connection.query(locationSQL, [senderId , coordinates.lat, coordinates.long], function (err, data) {
            if (err) {
                console.log("sql에 저장하지 못했다고합니다..");
            } else {
                console.log("sql에 들어갔당");
            }
        });

        var productAskMessage = "감사합니다, 찾고자 하는 제품명을 입력해주세요!";
        var productAskPayload = {
        "text": productAskMessage
        };
        sendTextMessage(senderId, productAskPayload);
    // 시작하기
    }else if(content && (event.message.sticker_id||content.includes("시작")){
      var greetingMessage = "누물보에 처음 오셨나요?";
      var greetingPayload = {
        "text": greetingMessage,
        "quick_replies":[
          {
            "content_type":"text",
            "title":"Yes!",
            "payload": START_SEARCH_YES
          },
          {
            "content_type":"text",
            "title":"No, thanks.",
            "payload": START_SEARCH_NO
          }
        ] 
      };
      sendTextMessage(senderId, greetingPayload);
    // 제품명을 입력했을 경우
   }else if(content){
    productSearchMessage(senderId, content);
  }
    return;
}


function productSearchMessage(recipientId, productName){
    var input_array = productName.split(' ');
    console.log(input_array);
    var input_concat = productName.replace(' ','');
    console.log(input_concat);
    var input_char = input_concat.split('');
    console.log(input_char);

    var sqlquery = 'select *, (score/char_length(item_name)) as accuracy from (select *, if((instr(item_name, "';
    for (var i=0; i<input_char.length-1; i++){
      sqlquery += input_char[i]+'"))=0, 0, 1)+if((instr(item_name, "';
    }
    sqlquery += input_char[input_char.length-1]+'"))=0, 0, 1) as score from stores1.item_table) as A order by score desc, accuracy desc limit 4;'

    console.log(sqlquery);

    var resultItem = [];

    var tempElement1 = {
        "buttons": [
              {
                type: "postback"
              }
            ]
      };

      var tempElement2 = {
        "buttons": [
              {
                type: "postback"
              }
            ]
      };

      var tempElement3 = {
        "buttons": [
              {
                type: "postback"
              }
            ]
      };

      var tempElement4 = {
        "buttons": [
              {
                type: "postback"
              }
            ]
      };

      var tempElements = [];
      tempElements.push(tempElement1);
      tempElements.push(tempElement2);
      tempElements.push(tempElement3);
      tempElements.push(tempElement4);
      var response = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "list",
            "top_element_style": "compact",
            "elements":[]
          }
        }
      };

    var getInformationFromDB = function(callback) {
       connection.query(
        sqlquery,
        function(err, results, fields){
          if(err) throw err;
          callback(results);

        }
     );
     };

      getInformationFromDB(function (results) {
          resultItem = results;
          for(var i=0; i<resultItem.length; i++){
            tempElements[i].title = resultItem[i].item_name;
            tempElements[i].image_url = resultItem[i].img_src;
            tempElements[i].buttons[0].title = resultItem[i].item_name;
            tempElements[i].buttons[0].payload = CVSinfo;
            response.attachment.payload.elements.push(tempElements[i]);
          };
          sendTextMessage(recipientId, response);
        }
      );
     return;
}



function cvsSearchMessage(recipientId, productName){
    var cvsquery = 'select ((stores1.convenient_stores201809_final.lng - user_data_a.lng) * (stores1.convenient_stores201809_final.lng - user_data_a.lng) + (stores1.convenient_stores201809_final.lat - user_data_a.lat) + (stores1.convenient_stores201809_final.lat - user_data_a.lat)) as distance, stores1.convenient_stores201809_final.lng, stores1.convenient_stores201809_final.lat, stores1.convenient_stores201809_final.cs_name, stores1.convenient_stores201809_final.cs_branch from stores1.convenient_stores201809_final, stores1.item_stock, (select * from stores1.user_data where user_id like "'+String(recipientId)+ '"order by time desc limit 1) as user_data_a, stores1.item_table where user_data_a.user_id like "'+String(recipientId)+ '"and user_data_a.item_name like stores1.item_table.item_name and stores1.item_table.item_id = stores1.item_stock.item_id and stores1.item_stock.cs_id = stores1.convenient_stores201809_final.cs_id and stores1.item_stock.amount > 0 order by distance asc limit 3;';
    var tempResult = [];

    var cvs1 = {
        "buttons": [
              {
                type: "postback"
              }
            ]
      };

      var cvs2 = {
        "buttons": [
              {
                type: "postback"
              }
            ]
      };

      var cvs3 = {
        "buttons": [
              {
                type: "postback"
              }
            ]
      };

      var cvs4 = {
        "buttons": [
              {
                type: "postback"
              }
            ]
      };

      var cvsList = [];
      cvsList.push(cvs1);
      cvsList.push(cvs2);
      cvsList.push(cvs3);
      cvsList.push(cvs4);



      var cvsResponse = {
        "attachment": {
          "type": "template",
          "payload": {
            "template_type": "list",
            "top_element_style": "compact",
            "elements":[]
          }
        }
      };

    var cvsDB = function(callback) {
       connection.query(
        cvsquery,
        function(err, results, fields){
          if(err) throw err;
          callback(results);

        }
     );
     };

      cvsDB(function (results) {
            console.log("cvsSearchMessage의 깊숙이..");
            console.log(results);

            tempResult = results;
            console.log(tempResult.length);
           
          for(var i=0; i<tempResult.length; i++){
            console.log("FOR문에 들어왔음");
            var cvsURL = 'https://www.google.com/maps?q='+String(tempResult[i].lat)+','+String(tempResult[i].lng);
            cvsList[i].title = tempResult[i].cs_name+" "+tempResult[i].cs_branch;
            if(tempResult[i].cs_name.includes("cu")||tempResult[i].cs_name.includes("CU")){
              cvsList[i].image_url = cuImg;
            }else if(tempResult[i].cs_name.includes("gs")||tempResult[i].cs_name.includes("GS")){
              cvsList[i].image_url = gs25Img;
            }else if(tempResult[i].cs_name.includes("emart")||tempResult[i].cs_name.includes("이마트")){
              cvsList[i].image_url = emart24Img;
            }else if(tempResult[i].cs_name.includes("mini")||tempResult[i].cs_name.includes("미니")){
              cvsList[i].image_url = ministopImg;
            }else if(tempResult[i].cs_name.includes("세븐")||tempResult[i].cs_name.includes("일레븐")){
              cvsList[i].image_url = seven11Img;
            }else{
              cvsList[i].image_url = defaultImg;
            }

            cvsList[i].buttons[0].title = "지도에서 열기";
            cvsList[i].buttons[0].type = "web_url";
            cvsList[i].buttons[0].url = cvsURL;
            cvsResponse.attachment.payload.elements.push(cvsList[i]);
          };
          console.log(cvsResponse.attachment.payload.elements);
          sendTextMessage(recipientId, cvsResponse);

        }
      );
     return;
}

function receivedPostback(sender_psid, received_postback) {

    // Get the payload for the postback
    const payload = received_postback.payload;

    console.log("RECEIVED POSTBACK IT WORKS :" +payload);
    var senderID = sender_psid;

    switch (payload){
    case START_SEARCH_YES:
      var yesmessage = "누물보는 제품명을 입력해주시면, 재고가 있는지 알아드리는 어플입니다. 현재 위치를 알려주세요!";
      var yesPayload = {
        "text": yesmessage,
        "quick_replies":[
        {
          "content_type":"location"
        }
      ] 
    }
      sendTextMessage(senderID, yesPayload);
      break;
    case START_SEARCH_NO:
      var nomessage = "현재 위치를 알려주세요!";
      var noPayload = {
        "text": nomessage,
        "quick_replies":[
        {
          "content_type":"location"
        }
        ]
    }
      sendTextMessage(senderID, noPayload);
      break;
    case CVSinfo:
      const selectedName = received_postback.title;  
      
      var QUERY1 = 'SELECT * FROM stores1.temp_data WHERE user_id ="'+String(senderID)+'";';     
      var DEALwithQUERY1 = function(callback) {
       connection.query(
        QUERY1,
        function(err, results, fields){
          if(err) throw err;
          callback(results);
        }
      )};
      DEALwithQUERY1(function(results) {
            var thisUserRecent = results;
            var recentLat = thisUserRecent[0].lat;
            var recentLng = thisUserRecent[0].lng;
            var QUERY2 = 'INSERT INTO stores1.user_data(user_id, lat, lng, item_name) VALUES(?,?,?,?);'
            connection.query(QUERY2, [senderID , recentLat, recentLng,selectedName], function (err, data) {
              if (err) {
                  console.log("제품이름 못드러감");
              } else {
                  console.log("제품이름까지도 모조리 들어갔다..");
                  cvsSearchMessage(sender_psid, selectedName);
              }
            });
        }
      );
      break;
    case Help:
      var helpMessage = "도움이 되셨나요?";
      var helpPayload = {
        "text": helpMessage
    }
      sendTextMessage(senderID, helpPayload);
    break;
    default:
      console.log('Cannot differentiate the payload type');
  }
  return;
}

function sendTextMessage(recipientId, response) {
    request({
        url: 'https://graph.facebook.com/v2.6/me/messages',
        qs: { access_token: PAGE_ACCESS_TOKEN },
        method: "POST",
        json: {
            recipient: { id: recipientId },
            message: response
        }
    }, function(error, response, body) {
        if (error) {
            console.log('Error sending message: ' + response.error);
        }else{
          console.log(response);
        }
    });
    return;
}

app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'));
})