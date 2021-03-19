const iap = require("in-app-purchase");
const mongoose = require("mongoose"),
  User = mongoose.model("User"),
  Subscription = mongoose.model("Subscription"),
  Setting = mongoose.model("Setting"),
  ObjectId = mongoose.Types.ObjectId;
iap.config({
  applePassword: "", // This comes from iTunes Connect
  googlePublicKeyStrLive: "",
});
let google = require("googleapis");
let OAuth2 = google.auth.OAuth2;

/**********************************START APP SUBSCRIBE ***********************/
exports.appSubscribe = function (req, res, next) {
  let subscribeUserData = {};
  let sid = req.headers.sid;
  let user_id = FUNCTIONS.crypto(sid, "decrypt");
  /************Check CheckIn data*******/
  if (sid == "") {
    res.status(400);
    res.json({
      type: false,
      reply: "Subscribe data is not empty",
    });
  } else {
    User.findById(new ObjectId(user_id), function (err, userRecord) {
      if (err) {
        res.status(400);
        res.json({
          type: false,
          reply: "Oops! Something went wrong. Please try again.",
        });
      } else {
        if (userRecord) {
          let created_timestamp = parseInt(new Date().getTime() / 1000);
          let now = new Date();
          now.setDate(now.getDate() + 365);
          let ended_timestamp = parseInt(now.getTime() / 1000);
          subscribeUserData["user_id"] = user_id;
          subscribeUserData["startdata"] = created_timestamp;
          subscribeUserData["enddata"] = ended_timestamp;
          if (req.body.ios_receipt != undefined && req.body.ios_receipt != "") {
            subscribeUserData["ios_receipt"] = req.body.ios_receipt;
          } else if (
            req.body.signature != undefined &&
            req.body.signature != ""
          ) {
            subscribeUserData["droid_receipt"] = {
              data: req.body.data,
              signature: req.body.signature,
            };
          }

          let SubscriptionModel = new Subscription(subscribeUserData);
          SubscriptionModel.save(function (err, subscribe) {
            if (err) {
              res.status(400);
              res.json({
                type: false,
                reply: "Oops! Something went wrong. Please try again.",
              });
            } else {
              res.status(200);
              res.json({
                type: true,
                reply: "Thank you, Enjoy!",
              });
            }
          });
        } else {
          res.status(400);
          res.json({
            type: false,
            reply: "User not found",
          });
        }
      }
    });
  }
};
/**********************************END APP SUBSCRIBE ***********************/

/**********************************START  CHECK SUBSCRIBE STATUS ***********************/
exports.checkSubscribeStatus = function (req, res, next) {
  let sid = req.headers.sid;
  let one_day = 1000 * 60 * 60 * 24;
  let user_id = FUNCTIONS.crypto(sid, "decrypt");
  /************Check CheckIn data*******/
  if (sid == "") {
    res.status(400);
    res.json({
      type: false,
      reply: "Check subscribe status data is not empty",
    });
  } else {
    User.findById(new ObjectId(user_id), function (err, userRecord) {
      if (err) {
        res.status(400);
        res.json({
          type: false,
          reply: "Could not Check subscribe status, please try again.",
        });
      } else {
        if (userRecord) {
          Subscription.findOne({ user_id: user_id })
            .sort({ created: -1 })
            .exec(function (err, subscribeData) {
              if (err) {
                res.status(400);
                res.json({
                  type: false,
                  reply: "Could not Check subscribe status, please try again.",
                });
              } else {
                if (subscribeData) {
                  let receipt = "",
                    serviceName = "";
                  userRecord.os = userRecord.os.trim();
                  if (
                    userRecord.os == undefined ||
                    userRecord.os == "" ||
                    userRecord.os === null
                  ) {
                    res.status(400);
                    res.json({
                      type: false,
                      reply:
                        "Could not Check subscribe status, please try again.",
                    });
                  } else if (userRecord.os == "ios") {
                    if (
                      subscribeData.ios_receipt == undefined ||
                      subscribeData.ios_receipt == ""
                    ) {
                      res.status(400);
                      res.json({
                        type: false,
                        reply:
                          "Could not Check subscribe status, please try again.",
                      });
                    }
                    receipt = subscribeData.ios_receipt;
                    serviceName = iap.APPLE;
                  } else if (userRecord.os == "android") {
                    if (
                      subscribeData.droid_receipt.data == undefined ||
                      subscribeData.droid_receipt.data == ""
                    ) {
                      res.status(400);
                      res.json({
                        type: false,
                        reply:
                          "Could not Check subscribe status, please try again.",
                      });
                    }
                    receipt = {
                      data: subscribeData.droid_receipt.data,
                      signature: subscribeData.droid_receipt.signature,
                    };
                    receipt = brokenReceipt;
                    serviceName = iap.GOOGLE;
                  }
                  iap.setup(function (error) {
                    if (error) {
                      res.status(400);
                      res.json({
                        type: false,
                        reply:
                          "Could not Check subscribe status, please try again.",
                      });
                    } else {
                      iap.validate(
                        serviceName,
                        receipt,
                        function (error, response) {
                          console.log("aip validate err ", error);
                          if (error) {
                            res.status(400);
                            res.json({
                              type: false,
                              reply:
                                "Could not Check subscribe status, please try again.",
                            });
                          }
                          let subscribeStatus = 1; // not expired
                          if (iap.isValidated(response)) {
                            let purchaseDataList = iap.getPurchaseData(
                              response
                            );

                            //new code as per subscription details from apple
                            let latestPurchase = _.maxBy(
                              purchaseDataList,
                              "purchaseDateMs"
                            );
                            let diff =
                              latestPurchase.expiresDateMs -
                              latestPurchase.purchaseDateMs;
                            let numDays = Math.round(diff / one_day);

                            if (iap.isExpired(latestPurchase)) {
                              //new code as per subscription details from apple
                              let subscribeStatus = 1; // 1 year trial expired
                              if (numDays == 30) {
                                subscribeStatus = 0; // 30 days trial expired
                              }
                              c.log("Item expired");
                            } else {
                              c.log("Item not expired");
                            }
                            res.status(200);
                            res.json({
                              type: true,
                              subscribeStatus: subscribeStatus,
                              remaining_days: subscribeData.enddata,
                              reply: "Check user app subscribe status",
                            });
                          } else {
                            res.status(400);
                            res.json({
                              type: false,
                              reply:
                                "Could not Check subscribe status, please try again89.",
                            });
                          }
                        }
                      );
                    }
                  });
                } else {
                  res.status(200);
                  res.json({
                    type: true,
                    subscribeStatus: 2, // never subscribed
                    remaining_days: 0,
                    reply: "Check user app subscribe status",
                  });
                }
              }
            });
        } else {
          /***********user not found then given error *************/
          res.status(400);
          res.json({
            type: false,
            reply: "User not found",
          });
        }
      }
    });
  }
};

/********************************** UPDATE SUBSCRIBER STATUS CRON JOB ***********************/
exports.updateSubscribeStatusCron = function (req, res, next) {
  let one_day = 1000 * 60 * 60 * 24;

  /***********get user record by user id *************/
  User.find(
    { role_id: 2, os: "ios" },
    { _id: 1, os: 1, email: 1 },
    function (err, userRecords) {
      async.eachSeries(
        userRecords,
        function (userRecord, outCb) {
          Subscription.findOne({ user_id: userRecord._id })
            .sort({ created: -1 })
            .exec(function (err, subscribeData) {
              if (subscribeData) {
                let receipt = "",
                  serviceName = "";
                userRecord.os = userRecord.os.trim();

                if (userRecord.os == "ios") {
                  receipt = subscribeData.ios_receipt;
                  serviceName = iap.APPLE;

                  iap.setup(function (error) {
                    if (error) {
                      outCb();
                    } else {
                      iap.validate(
                        serviceName,
                        receipt,
                        function (error, response) {
                          if (error) {
                            outCb();
                          } else if (iap.isValidated(response)) {
                            let subscribeStatus = 1; // not expired
                            let purchaseDataList = iap.getPurchaseData(
                              response
                            );
                            let latestPurchase = _.maxBy(
                              purchaseDataList,
                              "purchaseDateMs"
                            );

                            let diff =
                              latestPurchase.expiresDateMs -
                              latestPurchase.purchaseDateMs;

                            let numDays = Math.round(diff / one_day);

                            if (iap.isExpired(latestPurchase)) {
                              let is_subscribed = 1; // 1 year trial expired

                              if (numDays == 30) {
                                is_subscribed = 0; // 30 days trial expired
                              }

                              Subscription.update(
                                { user_id: userRecord._id },
                                { $set: { is_subscribed: is_subscribed } }
                              ).exec(function (err) {
                                outCb();
                              });
                            } else {
                              outCb();
                            }
                          } else {
                            outCb();
                          }
                        }
                      );
                    }
                  });
                } else {
                  outCb();
                }
              } else {
                outCb();
              }
            });
        },
        function (err) {
          res.status(200);
          res.json({
            reply: "Cron ran successfully !!!",
          });
          console.log("all done!!!");
        }
      );
    }
  );
};

/******************************** Get Token ***************************/
exports.getToken = function (req, res, next) {
  let oauth2Client = new OAuth2(
    "*************",
    "qwertyuiop[",
    "http://qwerty.com/getToken"
  );

  oauth2Client.getToken(req.query.code, function (err, tokens) {
    // Now tokens contains an access_token and an optional refresh_token. Save them.
    if (!err) {
      oauth2Client.setCredentials(tokens);
    }

    let tokesnData = {};
    tokesnData.google_token = tokens;
    Setting.update(
      { admin: true },
      { $set: tokesnData },
      function (err, settingData) {
        c.log("settingData", settingData);
      }
    );
  });
};

/******************************** Update subscribe status android cron ***************************/
exports.updateSubscribeStatusAndroidCron = function (req, res, next) {
  let one_day = 1000 * 60 * 60 * 24;
  let oauth2Client = new OAuth2(
    "*************",
    "qwertyuiop[",
    "http://qwerty.com/getToken"
  );

  Setting.findOne(
    { admin: true },
    { google_token: 1 },
    function (err, settingData) {
      oauth2Client.setCredentials(settingData.google_token);

      let andriodPub = google.androidpublisher({
        version: "v2",
        auth: oauth2Client,
      });

      /***********get user record by user id *************/
      User.find(
        { role_id: 2, os: "android" },
        { _id: 1, os: 1, email: 1 },
        function (err, userRecords) {
          async.eachSeries(
            userRecords,
            function (userRecord, outCb) {
              Subscription.findOne({ user_id: userRecord._id })
                .sort({ created: -1 })
                .exec(function (err, subscribeData) {
                  let created_timestamp = parseInt(new Date().getTime() / 1000);

                  if (subscribeData) {
                    let receipt = "",
                      serviceName = "";
                    userRecord.os = userRecord.os.trim();
                    let dataOrder = [
                      "orderId",
                      "packageName",
                      "productId",
                      "purchaseTime",
                      "purchaseState",
                      "purchaseToken",
                      "autoRenewing",
                    ];
                    let receiptData = subscribeData.droid_receipt.data;

                    if (receiptData == undefined) {
                      outCb();
                    } else {
                      let dataReciept = {
                        orderId: receiptData.mOrderId,
                        packageName: receiptData.mPackageName,
                        productId: receiptData.mSku,
                        purchaseTime: receiptData.mPurchaseTime,
                        purchaseState: receiptData.mPurchaseState,
                        purchaseToken: receiptData.mToken,
                      };
                      let brokenReceipt = {
                        data: JSON.stringify(dataReciept),
                        signature: subscribeData.droid_receipt.signature,
                      };
                      let objectReceipt = JSON.parse(brokenReceipt["data"]);
                      let newData = {};
                      dataOrder.forEach(function (k) {
                        newData[k] = objectReceipt[k];
                      });
                      brokenReceipt["data"] = JSON.stringify(newData);
                      receipt = brokenReceipt;
                      serviceName = iap.GOOGLE;

                      andriodPub.purchases.subscriptions.get(
                        {
                          token: receiptData.mToken,
                          subscriptionId: receiptData.mSku,
                          packageName: receiptData.mPackageName,
                        },
                        function (err, subsData) {
                          if (err) {
                            outCb();
                          } else {
                            let diff =
                              subsData.expiryTimeMillis -
                              subsData.startTimeMillis;

                            let numDays = Math.round(diff / one_day);
                            let is_subscribed = 2;
                            if (subsData.userCancellationTimeMillis) {
                              if (
                                subsData.paymentState == 1 &&
                                created_timestamp >
                                  parseInt(subsData.expiryTimeMillis)
                              ) {
                                is_subscribed = 1;
                              } else if (
                                created_timestamp >
                                parseInt(subsData.expiryTimeMillis)
                              ) {
                                is_subscribed = 0;
                              }
                            } else if (
                              numDays >= 364 &&
                              created_timestamp >=
                                parseInt(subsData.expiryTimeMillis)
                            ) {
                              is_subscribed = 1;
                            }
                            outCb();
                          }
                        }
                      );
                    }
                  } else {
                    outCb();
                  }
                });
            },
            function (err) {
              console.log("All done!!!");
            }
          );
        }
      );
    }
  );
};

/**********************************END  CHECK SUBSCRIBE STATUS ***********************/

/**********************************START  CHECK SUBSCRIBE STATUS AND RETURN DAYS LEFT***********************/
exports.checkUserSubscribe = function (req, res, next) {
  let sid = req.headers.sid;
  let user_id = FUNCTIONS.crypto(sid, "decrypt");
  /************Check CheckIn data*******/
  if (sid == "") {
    res.status(400);
    res.json({
      type: false,
      reply: "Check subscribe status data is not empty",
    });
  } else {
    let one_day = 1000 * 60 * 60 * 24;

    let oauth2Client = new OAuth2(
      "***********",
      "qwertyuiop[",
      "http://qwerty.com/getToken"
    );

    Setting.findOne(
      { admin: true },
      { google_token: 1 },
      function (err, settingData) {
        oauth2Client.setCredentials(settingData.google_token);
        let andriodPub = google.androidpublisher({
          version: "v2",
          auth: oauth2Client,
        });

        /***********get user record by user id *************/
        User.findById(new ObjectId(user_id), function (err, userRecord) {
          if (err) {
            res.status(400);
            res.json({
              type: false,
              reply: "Could not Check subscribe status, please try again.",
            });
          } else {
            if (userRecord) {
              Subscription.findOne({ user_id: user_id })
                .sort({ created: -1 })
                .exec(function (err, subscribeData) {
                  if (err) {
                    res.status(400);
                    res.json({
                      type: false,
                      reply:
                        "Could not Check subscribe status, please try again.",
                    });
                  } else {
                    if (subscribeData) {
                      userRecord.os = userRecord.os.trim();
                      if (
                        userRecord.os == undefined ||
                        userRecord.os == "" ||
                        userRecord.os === null
                      ) {
                        res.status(200);
                        res.json({
                          type: false,
                          subscribeStatus: false,
                          reply:
                            "Could not Check subscribe status, please try again4.",
                        });
                      } else if (userRecord.os == "android") {
                        if (
                          subscribeData.droid_receipt.data == undefined ||
                          subscribeData.droid_receipt.data == ""
                        ) {
                          res.status(200);
                          res.json({
                            type: false,
                            subscribeStatus: false,
                            reply:
                              "Could not Check subscribe status, please try again1.",
                          });
                        }
                        let dataOrder = [
                          "orderId",
                          "packageName",
                          "productId",
                          "purchaseTime",
                          "purchaseState",
                          "purchaseToken",
                          "autoRenewing",
                        ];
                        let receiptData = subscribeData.droid_receipt.data;
                        let dataReciept = {
                          orderId: receiptData.mOrderId,
                          packageName: receiptData.mPackageName,
                          productId: receiptData.mSku,
                          purchaseTime: receiptData.mPurchaseTime,
                          purchaseState: receiptData.mPurchaseState,
                          purchaseToken: receiptData.mToken,
                        };

                        let brokenReceipt = {
                          data: JSON.stringify(dataReciept),
                          signature: subscribeData.droid_receipt.signature,
                        };
                        let objectReceipt = JSON.parse(brokenReceipt["data"]);
                        let newData = {};
                        dataOrder.forEach(function (k) {
                          newData[k] = objectReceipt[k];
                        });
                        brokenReceipt["data"] = JSON.stringify(newData);
                        receipt = brokenReceipt;
                        serviceName = iap.GOOGLE;

                        andriodPub.purchases.subscriptions.get(
                          {
                            token: receiptData.mToken,
                            subscriptionId: receiptData.mSku,
                            packageName: receiptData.mPackageName,
                          },
                          function (err, subsData) {
                            if (err) {
                              res.status(200);
                              res.json({
                                type: false,
                                subscribeStatus: false,
                                reply:
                                  "Could not Check subscribe status, please try again.",
                                buttonTxt: "",
                              });
                            } else {
                              let diff =
                                subsData.expiryTimeMillis -
                                subsData.startTimeMillis;

                              let numDays = Math.round(diff / one_day);
                              let created_timestamp = parseInt(
                                new Date().getTime()
                              );

                              //if user cancels a subscription
                              if (
                                subsData.userCancellationTimeMillis &&
                                created_timestamp >
                                  parseInt(subsData.expiryTimeMillis)
                              ) {
                                if (subsData.paymentState == 1) {
                                  // user cancels a paid (yearly) subscription
                                  res.status(200);
                                  res.json({
                                    type: false,
                                    subscribeStatus: false,
                                    reply:
                                      "Turn on your auto renewal to continue using app for $0.99 a year. Your 1 year subscription will begin upon payment.",
                                    buttonTxt: "Continue yearly subscription",
                                  });
                                } else {
                                  // user cancels a trial subscription
                                  res.status(200);
                                  res.json({
                                    type: false,
                                    subscribeStatus: false,
                                    reply:
                                      "Continue using app for $0.99 a year. Your 1 year subscription will begin upon payment.",
                                    buttonTxt: "Start yearly subscription",
                                  });
                                }
                              } else if (
                                numDays >= 364 &&
                                created_timestamp >=
                                  parseInt(subsData.expiryTimeMillis)
                              ) {
                                //yearly subscription got expired

                                res.status(200);
                                res.json({
                                  type: false,
                                  subscribeStatus: false,
                                  reply:
                                    "Turn on your auto renewal to continue using app for $0.99 a year. Your 1 year subscription will begin upon payment.",
                                  buttonTxt: "Continue yearly subscription",
                                });
                              } else {
                                res.status(200);
                                res.json({
                                  type: true,
                                  subscribeStatus: true,
                                  remaining_days: parseInt(
                                    parseInt(subsData.expiryTimeMillis) / 1000
                                  ),
                                  reply: "Check user app subscribe status",
                                  buttonTxt: "",
                                });
                              }
                            }
                          }
                        );
                      }
                    } else {
                      res.status(200);
                      res.json({
                        type: true,
                        subscribeStatus: false,
                        reply: "Check user app subscribe status",
                        buttonTxt: "",
                      });
                    }
                  }
                });
            } else {
              /***********user not found then given error *************/
              res.status(400);
              res.json({
                type: false,
                reply: "User not found",
                buttonTxt: "",
              });
            }
          }
        });
      }
    );
  }
};

/********************************** UPDATE SUBSCRIBER STATUS CRON JOB ***********************/
exports.updateClientSubscribeStatus = function (req, res, next) {
  let one_day = 1000 * 60 * 60 * 24;

  /***********get user record by user id *************/
  User.find(
    { role_id: 2, os: "ios", email: "wqwqw@qwerty.com" },
    { _id: 1, os: 1, email: 1 },
    function (err, userRecords) {
      async.eachSeries(
        userRecords,
        function (userRecord, outCb) {
          Subscription.findOne({ user_id: userRecord._id })
            .sort({ created: -1 })
            .exec(function (err, subscribeData) {
              if (subscribeData) {
                let receipt = "",
                  serviceName = "";
                userRecord.os = userRecord.os.trim();

                if (userRecord.os == "ios") {
                  receipt = subscribeData.ios_receipt;
                  serviceName = iap.APPLE;

                  iap.setup(function (error) {
                    //console.log("aip setup err ", error)
                    if (error) {
                      outCb();
                    } else {
                      iap.validate(
                        serviceName,
                        receipt,
                        function (error, response) {
                          console.log("aip validate err ", error);
                          console.log("aip response ", response);
                          console.log(
                            "aip receipt---- ",
                            response.receipt.in_app
                          );
                          console.log(
                            "iap.isValidated(response)",
                            iap.isValidated(response)
                          );
                          if (error) {
                            outCb();
                          } else if (iap.isValidated(response)) {
                            let subscribeStatus = 1; // not expired
                            let purchaseDataList = iap.getPurchaseData(
                              response
                            );
                            console.log(
                              "purchaseDataList IOS",
                              purchaseDataList
                            );
                            let latestPurchase = _.maxBy(
                              purchaseDataList,
                              "purchaseDateMs"
                            );

                            let diff =
                              latestPurchase.expiresDateMs -
                              latestPurchase.purchaseDateMs;

                            let numDays = Math.round(diff / one_day);

                            c.log("numDays DIFF---\n", numDays);

                            if (iap.isExpired(latestPurchase)) {
                              let is_subscribed = 1; // 1 year trial expired

                              if (numDays == 30) {
                                is_subscribed = 0; // 30 days trial expired
                              }

                              Subscription.update(
                                { user_id: userRecord._id },
                                { $set: { is_subscribed: is_subscribed } }
                              ).exec(function (err) {
                                outCb();
                              });
                            } else {
                              outCb();
                            }
                          } else {
                            outCb();
                          }
                        }
                      );
                    }
                  });
                } else {
                  outCb();
                }
              } else {
                outCb();
              }
            });
        },
        function (err) {
          res.status(200);
          res.json({
            reply: "Cron ran successfully !!!",
          });
          console.log("all done!!!");
        }
      );
    }
  );
};

/**********************************END  CHECK SUBSCRIBE STATUS ***********************/
