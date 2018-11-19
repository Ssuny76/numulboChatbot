'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const app = express();

const greeting = 'GREETING';
const START_SEARCH_NO = 'START_SEARCH_NO';
const START_SEARCH_YES = 'START_SEARCH_YES';

const mysql = require('mysql2');
const connection = mysql.createConnection({
    host:"mysql.cm8nmhebfeax.ap-northeast-2.rds.amazonaws.com",
    //port:3306,
    database:"mysql",
    user:"robotronic",
    password:"12341234"
});



//작은 따옴표 사이에 본인이 받으신 token을 paste합니다.
//나중에 보안을 위해서 따로 setting을 하는 방법을 알려드리겠습니다.
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

            // Iterate over each messaging event
            pageEntry.messaging.forEach(function(messagingEvent) {
                console.log("forEach는 들어옴");
                if (messagingEvent.optin) {
                    console.log("뭔지모르겠는거에 들어옴 (큰일)");
                    receivedAuthentication(messagingEvent);
                } else if (messagingEvent.message) {
                    if (messagingEvent.message.quick_reply){
                      console.log("quick_reply를 인식은함");
                      receivedPostback(messagingEvent.sender.id, messagingEvent.message.quick_reply);
                    } else{
                    console.log("message를 인식은함");
                      receivedMessage(messagingEvent);
                    }
                }else if (messagingEvent.postback) {
                    console.log("postback으로 인식중");
                    receivedPostback(messagingEvent.sender.id, messagingEvent.message.quick_reply);
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
        connection.query(
            'SELECT (lng-'+String(coordinates.long)+')*(lng-'+String(cordinates.long)+')+(lat-'+String(coordinates.lat)+')*(lat-'+String(coordinates.lat)+') as distance, lng, lat, id from stores1.convenient_stores201809 order by distance asc limit 50;',
            function(err, results, fields){
                console.log(fields);
                console.log(results);
            }
        );
        //var locationMessage = coordinates.lat+"latitude"+coordinates.long+"longitude";
        
        //sendTextMessage(senderId, greetingPayload);
        //handleMessageWithLocationCoordinates(sender_psid, coordinates.lat, coordinates.long);
        return;
    }
    else{
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
    return;
   }

}





function receivedPostback(sender_psid, received_postback) {

    // Get the payload for the postback
    const payload = received_postback.payload;

    console.log("RECEIVED POSTBACK IT WORKS");
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
      console.log("yes라구요CONSOLE");
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
    default:
      console.log('Cannot differentiate the payload type');
  }
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
}

app.listen(app.get('port'), function() {
    console.log('running on port', app.get('port'));
})