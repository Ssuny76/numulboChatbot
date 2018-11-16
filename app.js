'use strict'

const express = require('express');
const bodyParser = require('body-parser');
const request = require('request');
const mongoose = require('mongoose');
const app = express().use(body_parser.json());

// DB연결 내가 따로 뭐 해줘야하는거 없나..?
var db = mongoose.connect(MONGODB_URI);
// 이것도..?
var ChatStatus = require("./models/chatstatus");

const greeting = 'GREETING';

const FACEBOOK_GRAPH_API_BASE_URL = 'https://graph.facebook.com/v2.6/';
//이 토큰이 포함된 파일을 절대 업로드하거나 github에 적용시키지 마세요.
const PAGE_ACCESS_TOKEN = 'EAAd7X8SEqH8BAOrCQdZCTrgofOvhQnlW5jWyQf0Jb8EOjj2gdGZCbcZA38FnSPy3zFtXRSdLEG9xCUHVzyOVBoybndBMESi0rH3yfY2rmXRUOfexthFZBrRPDVZBZA0bBdtWUcpRgEPXeKWQ2iXeGsKEiCdBdsrDbNhzNfb8WASwZDZD';

// Sets server port and logs message on success
app.listen(process.env.PORT || 5000, () => console.log('webhook is listening'));

// 요것은 무엇인가..
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/', function(req, res) {
    res.send('Hello world');
})

app.post("/webhook", function(req, res) {
  // Return a '200 OK' response to all events
  res.status(200).send('EVENT_RECEIVED');

  const body = req.body;

  if (body.object === 'page') {
      // Iterate over each entry
      // There may be multiple if batched
      if (body.entry && body.entry.length <= 0){
        return;
      }
      body.entry.forEach((pageEntry) => {
        // Iterate over each messaging event and handle accordingly
        pageEntry.messaging.forEach((messagingEvent) => {
          console.log({messagingEvent});

          if (messagingEvent.postback) {
            handlePostback(messagingEvent.sender.id, messagingEvent.postback);
          } else if (messagingEvent.message) {
            if (messagingEvent.message.quick_reply){
              handlePostback(messagingEvent.sender.id, messagingEvent.message.quick_reply);
            } else{
              handleMessage(messagingEvent.sender.id, messagingEvent.message);
            }
          } else {
            console.log(
              'Webhook received unknown messagingEvent: ',
              messagingEvent
            );
          }
        });
      });
    }
});

app.get('/webhook', function(req, res) {
    if (req.query['hub.verify_token'] === 'VERIFY_TOKEN') {
        res.send(req.query['hub.challenge']);
    }
    res.send('Error, wrong token');
})

function handleMessage(sender_psid, message) {
  // check if it is a location message
  console.log('handleMEssage message:', JSON.stringify(message));

  const locationAttachment = message && message.attachments && message.attachments.find(a => a.type === 'location');
  const coordinates = locationAttachment && locationAttachment.payload && locationAttachment.payload.coordinates;

  // message.nlp는 과연 무엇인가...!

  /*if (coordinates && !isNaN(coordinates.lat) && !isNaN(coordinates.long)){
    handleMessageWithLocationCoordinates(sender_psid, coordinates.lat, coordinates.long);
    return;
  } else if (message.nlp && message.nlp.entities && message.nlp.entities.location && message.nlp.entities.location.find(g => g.confidence > 0.8 && g.suggested)){
    const locationName = message.nlp.entities.location.find(loc => loc.confidence > 0.8 && loc.suggested);
    if (locationName.value){
      const locationNameEncoded = encodeURIComponent(locationName.value);
      callGeocodingApi(locationNameEncoded, sender_psid, handleConfirmLocation);
    }
    return;
  } else */if (message.nlp && message.nlp.entities && message.nlp.entities.greetings && message.nlp.entities.greetings.find(g => g.confidence > 0.8 && g.value === 'true')){
    handlePostback(sender_psid, {payload: GREETING});
    return;
  }
}

function handlePostback(sender_psid, received_postback) {
  // Get the payload for the postback
  const payload = received_postback.payload;

  // Set the response and udpate db based on the postback payload
  switch (payload){
    /*case START_SEARCH_YES:
      updateStatus(sender_psid, payload, handleStartSearchYesPostback);
      break;
    case START_SEARCH_NO:
      updateStatus(sender_psid, payload, handleStartSearchNoPostback);
      break;
    case OTHER_HELP_YES:
      updateStatus(sender_psid, payload, handleOtherHelpPostback);
      break;
    case AUSTRALIA_YES:
      updateStatus(sender_psid, payload, handleAustraliaYesPostback);
      break;
    case AU_LOC_PROVIDED:
      updateStatus(sender_psid, payload, askForActivityPreference);
      break;*/
    case GREETING:
      updateStatus(sender_psid, payload, handleGreetingPostback);
      break;
    /*case PREF_CLEANUP:
    case PREF_REVEGETATION:
    case PREF_BIO_SURVEY:
    case PREF_CANVASSING:
      updatePreference(sender_psid, payload, handlePreferencePostback);
      break;*/
    default:
      console.log('Cannot differentiate the payload type');
  }
}

function callSendAPI(sender_psid, response) {
  // Construct the message body
  console.log('message to be sent: ', response);
  let request_body = {
    "recipient": {
      "id": sender_psid
    },
    "message": response
  }

  // Send the HTTP request to the Messenger Platform
  request({
    "url": `${FACEBOOK_GRAPH_API_BASE_URL}me/messages`,
    "qs": { "access_token": PAGE_ACCESS_TOKEN },
    "method": "POST",
    "json": request_body
  }, (err, res, body) => {
    console.log("Message Sent Response body:", body);
    if (err) {
      console.error("Unable to send message:", err);
    }
  });
}


function handleGreetingPostback(sender_psid){
  request({
    url: `${FACEBOOK_GRAPH_API_BASE_URL}${sender_psid}`,
    qs: {
      access_token: process.env.PAGE_ACCESS_TOKEN,
      fields: "first_name"
    },
    method: "GET"
  }, function(error, response, body) {
    var greeting = "";
    if (error) {
      console.log("Error getting user's name: " +  error);
    } else {
      var bodyObj = JSON.parse(body);
      const name = bodyObj.first_name;
      greeting = "안녕하세요 " + name + "님 :D";
    }
    const message = greeting + "누물보를 처음 사용해보시나요?";
    const greetingPayload = {
      "text": message,
      "quick_replies":[
        {
          "content_type":"text",
          "title":"네!",
          "payload": START_SEARCH_YES
        },
        {
          "content_type":"text",
          "title":"아니요!",
          "payload": START_SEARCH_NO
        }
      ]
    };
    callSendAPI(sender_psid, greetingPayload);
  });
}

function updateStatus(sender_psid, status, callback){
  const query = {user_id: sender_psid};
  const update = {status: status};
  const options = {upsert: status === GREETING};

  ChatStatus.findOneAndUpdate(query, update, options).exec((err, cs) => {
    console.log('update status to db: ', cs);
    callback(sender_psid);
  });
}