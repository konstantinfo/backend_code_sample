// Require fcm module
FCM = require("fcm-node");

// FCM configuration
let SERVER_API_KEY = "***********";
let validDeviceRegistrationToken = "***********";
let fcmCli = new FCM(SERVER_API_KEY);

// Set payload data
let payloadOK = {
  to: validDeviceRegistrationToken,
  data: {
    url: "***********",
    foo: "foo",
    bar: "bar",
  },
  priority: "high",
  content_available: true,
  notification: {
    title: "HELLO",
    body: "World!",
    sound: "default",
    badge: "1",
  },
};

// Set payload error data
let payloadError = {
  to: "***********",
  data: {
    url: "***********",
  },
  priority: "high",
  content_available: true,
  notification: {
    title: "Hello World",
    body: "123",
    sound: "default",
    badge: "1",
  },
};

// Set payload multicast data
let payloadMulticast = {
  registration_ids: [
    "***********",
    "***********",
    validDeviceRegistrationToken, //valid token among invalid tokens to see the error and ok response
    "***********",
  ],
  data: {
    url: "***********",
  },
  priority: "high",
  content_available: true,
  notification: {
    title: "Hello",
    body: "Multicast",
    sound: "default",
    badge: "1",
  },
};

/**
 * Back log
 * @param {*} sender 
 * @param {*} err 
 * @param {*} res 
 */
let callbackLog = function (sender, err, res) {
  console.log(sender, err, res);
};

/**
 * Send push notification
 */
function sendOK() {
  fcmCli.send(payloadOK, function (err, res) {
    callbackLog("sendOK", err, res);
  });
}

/**
 * Get error from fcm
 */
function sendError() {
  fcmCli.send(payloadError, function (err, res) {
    callbackLog("sendError", err, res);
  });
}

/**
 * Send multicast notification
 */
function sendMulticast() {
  fcmCli.send(payloadMulticast, function (err, res) {
    callbackLog("sendMulticast", err, res);
  });
}

sendOK();
sendMulticast();
sendError();
