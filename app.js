'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

require('dotenv').config();

const MONGODB_URI = process.env.MONGODB_URI;
console.log(MONGODB_URI);
const mongoose = require('mongoose');
var db = mongoose.connect(MONGODB_URI);



var ChatStatus = require("./models/chatstatus");

const greeting = 'GREETING';
const START_SEARCH_NO = 'START_SEARCH_NO';
const START_SEARCH_YES = 'START_SEARCH_YES';
const CVSinfo = 'CVSinfo';

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

        const query = {$and: [
          { 'user_id': sender_psid }
        ]};
        const update = {
          $set: { "location.lat": coordinates_lat, "location.long": coordinates_long}
        };
        const options = {upsert: false, new: true};

        ChatStatus.findOneAndUpdate(query, update, options, (err, cs) => {
          if (err){
            console.log('Error 위치저장못', err);
          } else if (cs){
            var productAskMessage = "감사합니다, 찾고자 하는 제품명을 입력해주세요!";
            var productAskPayload = {
            "text": productAskMessage
            };
            sendTextMessage(senderId, productAskPayload);
          }
        });


/*
        connection.query(
            'SELECT (lng-'+String(coordinates.long)+')*(lng-'+String(coordinates.long)+')+(lat-'+String(coordinates.lat)+')*(lat-'+String(coordinates.lat)+') as distance, lng, lat, id from stores1.convenient_stores201809_final order by distance asc limit 50;',
            function(err, results, fields){
                console.log(fields);
                console.log(results);
        }
      )
*/



    // 시작하기
    }else if(content && content.includes("시작")){
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



  // 님들 이거 아이템 하나 딱 뜰때 list처리해줘야함

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
      var CVSinfoPMESSAGE = "찾으시는 상품의 재고가 있는 매점은 다음과 같습니다.";
      var CVSinfoPAYLOAD = {
        "text": CVSinfoPMESSAGE
    }
      sendTextMessage(senderID, TEMPPAYLOAD);
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
        }
    });
    return;
}

app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'));
})