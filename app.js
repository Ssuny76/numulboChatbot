'use strict'

const GREETING = '<GET_STARTED_PAYLOAD>';
const START_SEARCH_NO = 'START_SEARCH_NO';
const START_SEARCH_YES = 'START_SEARCH_YES';

const
  request = require('request'),
  express = require('express'),
  body_parser = require('body-parser'),
  mongoose = require('mongoose'),
  app = express().use(body_parser.json()); // creates express http server

 var db = mongoose.connect(MONGODB_URI);
 var ChatStatus = require("./models/chatstatus");


//작은 따옴표 사이에 본인이 받으신 token을 paste합니다.
//나중에 보안을 위해서 따로 setting을 하는 방법을 알려드리겠습니다.
//이 토큰이 포함된 파일을 절대 업로드하거나 github에 적용시키지 마세요.
var PAGE_ACCESS_TOKEN = 'EAAd7X8SEqH8BAOrCQdZCTrgofOvhQnlW5jWyQf0Jb8EOjj2gdGZCbcZA38FnSPy3zFtXRSdLEG9xCUHVzyOVBoybndBMESi0rH3yfY2rmXRUOfexthFZBrRPDVZBZA0bBdtWUcpRgEPXeKWQ2iXeGsKEiCdBdsrDbNhzNfb8WASwZDZD';

app.set('port', (process.env.PORT || 5000));


app.use(bodyParser.urlencoded({ extended: false }));

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
    const body = req.body;
    console.log(body);

    // Make sure this is a page subscription
    if (body.object == 'page') {
        // Iterate over each entry
        // There may be multiple if batched
        body.entry.forEach(function(pageEntry) {
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

        res.sendStatus(200);
    }
});


function handleMessage(sender_psid, message) {
  // check if it is a location message
  console.log('handleMEssage message:', JSON.stringify(message));

  const locationAttachment = message && message.attachments && message.attachments.find(a => a.type === 'location');
  const coordinates = locationAttachment && locationAttachment.payload && locationAttachment.payload.coordinates;

  /*
  if (coordinates && !isNaN(coordinates.lat) && !isNaN(coordinates.long)){
    handleMessageWithLocationCoordinates(sender_psid, coordinates.lat, coordinates.long);
    return;
  } else if (message.nlp && message.nlp.entities && message.nlp.entities.location && message.nlp.entities.location.find(g => g.confidence > 0.8 && g.suggested)){
    const locationName = message.nlp.entities.location.find(loc => loc.confidence > 0.8 && loc.suggested);
    if (locationName.value){
      const locationNameEncoded = encodeURIComponent(locationName.value);
      callGeocodingApi(locationNameEncoded, sender_psid, handleConfirmLocation);
    }
    return;
  } else if (message.nlp && message.nlp.entities && message.nlp.entities.greetings && message.nlp.entities.greetings.find(g => g.confidence > 0.8 && g.value === 'true')){
    handlePostback(sender_psid, {payload: GREETING});
    return;
  } else*/ {
    //var content = message.text;
    //var echo_message = "ECHO : " + content;
    handleGreetingPostback(sender_psid);
  }
}

function handleGreetingPostback(sender_psid){
  request({
    url: `${FACEBOOK_GRAPH_API_BASE_URL}${sender_psid}`,
    qs: {
      access_token: PAGE_ACCESS_TOKEN,
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
      greeting = "Hi " + name + ". ";
    }
    const message = greeting + "안녕하세요, 누물보를 이용해보신 적 있나요?";
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

function handlePostback(sender_psid, received_postback) {
  // Get the payload for the postback
  const payload = received_postback.payload;

  // Set the response and udpate db based on the postback payload
  switch (payload){
    case START_SEARCH_YES:
      //updateStatus(sender_psid, payload, handleStartSearchYesPostback);

      var content = received_postback.text;
      var echo_message = "ECHO : " + content;
      callSendAPI(sender_psid, echo_message);

      break;
    case START_SEARCH_NO:
      //updateStatus(sender_psid, payload, handleStartSearchNoPostback);

      var content = received_postback.text;
      var echo_message = "ECHO : " + content;
      callSendAPI(sender_psid, echo_message);

      break;
    case OTHER_HELP_YES:
      updateStatus(sender_psid, payload, handleOtherHelpPostback);
      break;
    case AUSTRALIA_YES:
      updateStatus(sender_psid, payload, handleAustraliaYesPostback);
      break;
    case AU_LOC_PROVIDED:
      updateStatus(sender_psid, payload, askForActivityPreference);
      break;
    case GREETING:
      updateStatus(sender_psid, payload, handleGreetingPostback);
      break;
    case PREF_CLEANUP:
    case PREF_REVEGETATION:
    case PREF_BIO_SURVEY:
    case PREF_CANVASSING:
      updatePreference(sender_psid, payload, handlePreferencePostback);
      break;
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
