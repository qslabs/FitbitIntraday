// This script will pull down your fitbit data
// and push it into a spreadsheet
// Units are metric (kg, km) unless otherwise noted
// Suggestions/comments/improvements?  Let me know ernesto@quantifiedself.com
//
//
/**
 * Desired date for the fitbit data (has to follow the format: yyyy-mm-dd).
 Note the sheet downloades in reverse chronological order (by date) starting with the dateEnd. 
*/
var dateBegin = "2014-09-20";
var dateEnd = "2014-09-24";

/**
 * Options for running script: interday means getting the daily data
   intraday means getting minute-by-minute data
 */
var DataTypes = {"interday":0, "intraday":1};
var dataType = DataTypes.intraday;
/**
 * Options for finding sedentary bouts. This will attempt to locate bouts of 0 steps that last at least 15min. 
   It functions best when sleep/awake time is recorded by fitbit. If no sleep stime is recorded it defaults to 8 hours. 
   See "findSedentaryBouts" function below.
 */
var sedentaryThresholdInMinutes = 15;
var daysToProcess = 1;
/**
 * Sleep and wake time
 */
var sleepTime, wakeTime;
// end [wwu]

/**** Length of time to look at.
 * From fitbit documentation values are 
 * 1d, 7d, 30d, 1w, 1m, 3m, 6m, 1y, max.
*/
var period = "30d";
/**
 * Key of ScriptProperty for Firtbit consumer key.
 * @type {String}
 * @const
 */
var CONSUMER_KEY_PROPERTY_NAME = "fitbitConsumerKey";

/**
 * Key of ScriptProperty for Fitbit consumer secret.
 * @type {String}
 * @const
 */
var CONSUMER_SECRET_PROPERTY_NAME = "fitbitConsumerSecret";


function refreshTimeSeries() {

	// if the user has never configured ask him to do it here
    if (!isConfigured()) {
        renderFitbitConfigurationDialog();
        return;
    }

    var user = authorize();
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    doc.setFrozenRows(2);
    // two header rows
    doc.getRange("a1").setValue(user.fullName);
    doc.getRange("a1").setComment("DOB:" + user.dateOfBirth)
    doc.getRange("b1").setValue(user.country + "/" + user.state + "/" + user.city);

    var options =
    {
        "oAuthServiceName": "fitbit",
        "oAuthUseToken": "always",
        "method": "GET",
    };
  	// [wwu]
  	if (dataType == DataTypes.interday) {
  		// get inspired here http://wiki.fitbit.com/display/API/API-Get-Time-Series
   		var activities = ["activities/log/steps", "activities/log/distance", "activities/log/activeScore", "activities/log/calories",
    	"activities/log/minutesSedentary", "activities/log/minutesLightlyActive", "activities/log/minutesFairlyActive", "activities/log/minutesVeryActive",
    	"sleep/timeInBed", "sleep/minutesAsleep", "sleep/awakeningsCount",
    	"foods/log/caloriesIn"];
           var interdays = ['activities-log-steps', 'activities-log-distance', 'activities-log-activeScore', 
                            'activities-log-calories', 'activities-log-minutesSedentary', 'activities-log-minutesLightlyActive', 
                            'activities-log-minutesFairlyActive', 'activities-log-minutesVeryActive', 
                            'sleep-timeInBed', 'sleep-minutesAsleep', 'sleep-awakeningsCount',
                           'foods-log-caloriesIn'];
      
  	}
  	// begin[wwu]
  	else if (dataType == DataTypes.intraday) {
    	var activities = ["activities/log/steps", "activities/log/calories"];
    	var intradays = ["activities-log-steps-intraday", "activities-log-calories-intraday"];

  	}
	var lastIndex = 0;
    for (var activity in activities) {
    	var index = 0;
	 	var dateString = dateEnd;
	 	date = parseDate(dateString);
	    while (1) {
  			// end[wwu]
        	//[wwu] var dateString = Utilities.formatDate(new Date(), "GMT", "yyyy-MM-dd");
        	//[wwu] dateString = "today";
        	var currentActivity = activities[activity];
        	try {
         		// [wwu]
         	 	if (dataType == DataTypes.interday) {
            		var result = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/" + currentActivity + "/date/" + dateString
                                           + "/" + period + ".json", options); 
        		}
          		else if (dataType == DataTypes.intraday) {
            		var result = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/" + currentActivity + "/date/" + dateString+ "/" + dateString + ".json", options);
          		}
        	} catch(exception) {
            	Logger.log(exception);
        	}
        	var o = Utilities.jsonParse(result.getContentText());
              Logger.log(o);
        	var cell = doc.getRange('a3');
        	var titleCell = doc.getRange("a2");
        	titleCell.setValue("Date");
        	var title = currentActivity.split("/");
        	title = title[title.length - 1];
        	titleCell.offset(0, 1 + activity * 1.0).setValue(title);
        	// [wwu] var index = 0;
		
        	//[wwu] for (var i in o) {
            // [wwu] var row = o[i];
          	// begin [wwu]
    		if (dataType == DataTypes.intraday) {
            	var row = o[intradays[activity]]["dataset"];
        	}
        	else if (dataType == DataTypes.interday) {
            	var row = o[interdays[activity]];
        	}
          	// end [wwu]
    	  	for (var j in row) {
            	var val = row[j];
                var col = 0;
                // [wwu]
                if (dataType == DataTypes.interday) {
                    cell.offset(index, 0).setValue(val["dateTime"]);
              	}
              else if (dataType == DataTypes.intraday) {
                    cell.offset(index, 0).setValue(dateString + ' ' + val["time"]);
              }
        		// set the date index
              cell.offset(index, 1 + activity * 1.0).setValue(val["value"]);
              // set the value index index
              index++;
            }
            if (dateBegin == dateEnd) {
            	break;
            }
            else {
	  			date.setDate(date.getDate()-1);
  				dateString = Utilities.formatDate(date, "GMT", "yyyy-MM-dd");
  				if (dateString < dateBegin) {
  					break;
  				}
  				Logger.log(dateString);
			}

        }
        // [wwu]}
	}
}

function isConfigured() {
    return getConsumerKey() != "" && getConsumerSecret() != "";
}

/**
 * @return String OAuth consumer key to use when tweeting.
 */
function getConsumerKey() {
    var key = ScriptProperties.getProperty(CONSUMER_KEY_PROPERTY_NAME);
    if (key == null) {
        key = "";
    }
    return key;
}

/**
 * @param String OAuth consumer key to use when tweeting.
 */
function setConsumerKey(key) {
    ScriptProperties.setProperty(CONSUMER_KEY_PROPERTY_NAME, key);
}

/**
 * @return String OAuth consumer secret to use when tweeting.
 */
function getConsumerSecret() {
    var secret = ScriptProperties.getProperty(CONSUMER_SECRET_PROPERTY_NAME);
    if (secret == null) {
        secret = "";
    }
    return secret;
}

/**
 * @param String OAuth consumer secret to use when tweeting.
 */
function setConsumerSecret(secret) {
    ScriptProperties.setProperty(CONSUMER_SECRET_PROPERTY_NAME, secret);
}

/** Retrieve config params from the UI and store them. */
function saveConfiguration(e) {

    setConsumerKey(e.parameter.consumerKey);
    setConsumerSecret(e.parameter.consumerSecret);
    var app = UiApp.getActiveApplication();
    app.close();
    return app;
}
/**
 * Configure all UI components and display a dialog to allow the user to 
 * configure approvers.
 */
function renderFitbitConfigurationDialog() {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var app = UiApp.createApplication().setTitle(
    "Configure Fitbit");
    app.setStyleAttribute("padding", "10px");

    var helpLabel = app.createLabel(
    "From here you will configure access to fitbit -- Just supply your own"
    + "consumer key and secret \n\n"
    + "Important:  To authroize this app you need to load the script in the script editor"
    + " (tools->Script Manager) and then run the 'authorize' script.");
    helpLabel.setStyleAttribute("text-align", "justify");
    helpLabel.setWidth("95%");
    var consumerKeyLabel = app.createLabel(
    "Fitbit OAuth Consumer Key:");
    var consumerKey = app.createTextBox();
    consumerKey.setName("consumerKey");
    consumerKey.setWidth("100%");
    consumerKey.setText(getConsumerKey());
    var consumerSecretLabel = app.createLabel(
    "Fitbit OAuth Consumer Secret:");
    var consumerSecret = app.createTextBox();
    consumerSecret.setName("consumerSecret");
    consumerSecret.setWidth("100%");
    consumerSecret.setText(getConsumerSecret());



    var saveHandler = app.createServerClickHandler("saveConfiguration");
    var saveButton = app.createButton("Save Configuration", saveHandler);

    var listPanel = app.createGrid(4, 2);
    listPanel.setStyleAttribute("margin-top", "10px")
    listPanel.setWidth("90%");
    listPanel.setWidget(1, 0, consumerKeyLabel);
    listPanel.setWidget(1, 1, consumerKey);
    listPanel.setWidget(2, 0, consumerSecretLabel);
    listPanel.setWidget(2, 1, consumerSecret);

    // Ensure that all form fields get sent along to the handler
    saveHandler.addCallbackElement(listPanel);

    var dialogPanel = app.createFlowPanel();
    dialogPanel.add(helpLabel);
    dialogPanel.add(listPanel);
    dialogPanel.add(saveButton);
    app.add(dialogPanel);
    doc.show(app);
}

function authorize() {
    var oAuthConfig = UrlFetchApp.addOAuthService("fitbit");
    oAuthConfig.setAccessTokenUrl("https://api.fitbit.com/oauth/access_token");
    oAuthConfig.setRequestTokenUrl("https://api.fitbit.com/oauth/request_token");
    oAuthConfig.setAuthorizationUrl("https://api.fitbit.com/oauth/authorize");
    oAuthConfig.setConsumerKey(getConsumerKey());
    oAuthConfig.setConsumerSecret(getConsumerSecret());

    var options =
    {
        "oAuthServiceName": "fitbit",
        "oAuthUseToken": "always",
    };

    // get The profile but don't do anything with it -- just to force authentication
    var result = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/profile.json", options);
    //
    var o = Utilities.jsonParse(result.getContentText());

    return o.user;
    // options are dateOfBirth, nickname, state, city, fullName, etc.  see http://wiki.fitbit.com/display/API/API-Get-User-Info
}


/** When the spreadsheet is opened, add a Fitbit menu. */
function onOpen() {
    var ss = SpreadsheetApp.getActiveSpreadsheet();
  var menuEntries = [{
        name: "Configure",
        functionName: "renderFitbitConfigurationDialog"
  },
    {
        name: "Authorize",
        functionName: "authorize"
    },
      {
        name: "Download Data",
        functionName: "refreshTimeSeries"
    },
    { 
      name: "Find Sedendtary Time",
        functionName: "findSedentaryBouts"
                      
    }];
    ss.addMenu("Fitbit", menuEntries);
}

function onInstall() {
    onOpen();
    // put the menu when script is installed
}

// parse a date in yyyy-mm-dd format
function parseDate(input) {
  var parts = input.match(/(\d+)/g);
  // new Date(year, month [, date [, hours[, minutes[, seconds[, ms]]]]])
  return new Date(parts[0], parts[1]-1, parts[2]); // months are 0-based
}

// parse a date in 2011-10-25T23:57:00.000 format
function parseDate2(input) {
  var parts = input.match(/(\d+)/g);
  return new Date(parts[0], parts[1]-1, parts[2], parts[3], parts[4]);
}

// get the wake-up time and sleeping time on a given date
function getAwakeTime(dateString) {
  Logger.log(dateString);
  if (!isConfigured()) {
    renderFitbitConfigurationDialog();
    return;
  }
  var user = authorize();
  var options =
    {
        "oAuthServiceName": "fitbit",
        "oAuthUseToken": "always",
        "method": "GET",
    };
  var date = new Date(parseDate(dateString));
  for (var i=0; i<2; i++) {
    result = UrlFetchApp.fetch("https://api.fitbit.com/1/user/-/sleep/date/" + dateString + ".json", options); 
    var o = Utilities.jsonParse(result.getContentText());
    sleepLogs = o["sleep"];
    for (var j in sleepLogs) {
      var sleepLog = sleepLogs[j];
      if (sleepLog["isMainSleep"] == true) {
        Logger.log(sleepLog);
        if (i == 0) { // get wake time
          sleepTimePreviousDay = parseDate2(sleepLog["startTime"]);
          Logger.log(sleepTimePreviousDay);
          wakeTime = new Date(sleepTimePreviousDay);
          wakeTime.setMinutes (sleepTimePreviousDay.getMinutes() + sleepLog["timeInBed"]);
          Logger.log(wakeTime);
        }
        if (i == 1) { // get sleep time
          sleepTime = parseDate2(sleepLog["startTime"]);
        }
        break;
      }      
    }
    // given a date, fitbit returns the sleep time the previous day
    // so we need to increment the date to get sleep time the current day
    date.setDate(date.getDate()+1);
    dateString = Utilities.formatDate(date, "GMT", "yyyy-MM-dd");  
  }
  return {
        'sleepTime': sleepTime,
        'wakeTime': wakeTime
  }; 
}

function getMinutesFromMidnight(date) {
  return date.getHours()*60+date.getMinutes();
}

function findSedentaryBouts() {
  
  var sedentaryTimeRanges = new Array();
  var k = 0;
  var start_row = 0;
  var doc = SpreadsheetApp.getActiveSpreadsheet();
  var cell = doc.getRange('b4'); // after waking up (8AM)
  var outputCell = doc.getRange('e3');
  for (var day=0; day < daysToProcess; day++) {
    var zero_count = 0;
    currentDate = cell.offset(0,-1).getValue();
    awakeTimes = getAwakeTime(Utilities.formatDate(currentDate, "GMT", "yyyy-MM-dd"));
    Logger.log(awakeTimes);
    if (awakeTimes.wakeTime != null) {
      startMinutes = getMinutesFromMidnight(awakeTimes.wakeTime);
    }
    else {
      startMinutes = 8*60;
    }
    if (awakeTimes.sleepTime != null) {
      endMinutes = getMinutesFromMidnight(awakeTimes.sleepTime);
    }
    else {
      endMinutes = 22*60;
    }
    Logger.log(startMinutes);
    Logger.log(endMinutes);
    for (var i = startMinutes+day*24*60; i <= endMinutes+day*24*60; i++) { // before sleeping (10PM)
      if (cell.offset(i, 0).getValue() == 0) {
        zero_count++;
        if (zero_count == 1) {
          var sedentary_start_time = cell.offset(i, -1).getValue();
          start_row = i;
        }
      }
      else {
        if (zero_count > sedentaryThresholdInMinutes) {
          // x: "start time--end time", y: "number of minutes inactive"
          sedentaryTimeRanges[k] = new Array(2);
          sedentaryTimeRanges[k][0] = sedentary_start_time;
          outputCell.offset(k,0).setValue(sedentaryTimeRanges[k][0]);
          sedentaryTimeRanges[k][1] = zero_count;
          outputCell.offset(k,1).setValue(sedentaryTimeRanges[k][1]);
          k++;
        }
        zero_count = 0;
      }
    }
  }
}