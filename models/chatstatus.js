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