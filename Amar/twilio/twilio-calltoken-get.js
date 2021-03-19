/*
* function used to generate an Access Token for Twilio Video, and Voice using Twilio Functions
*
*/
Router.post('/getCallToken', auth.required,FUNC.authRequired, async function (req, res) {
    const params = _.extend(req.query || {}, req.params || {}, req.body || {});
    var headers = _.extend(req.headers || {});
    const identity = params.userId;
    const outgoingApplicationSid = process.env.TWILIO_APP_SID;
    const userData = await User.findOne({ _id: ObjectId(req.payload.id), isActive: true, userRole: 0 });

    if (!userData) {
        return res.status(400).json({
            status: false,
            success: false,
            message: i18n.__('INVALID_USER'),
            data: ''
        });
    }

    let pushCredentialSid = req.headers['device-os'] == "android" ? process.env.ANDROID_PUSH_SID : process.env.IOS_PUSH_SID;
    const voiceGrant = new VoiceGrant({ outgoingApplicationSid, pushCredentialSid });

    let token = new AccessToken(twilioAccountSid, twilioApiKey, twilioApiSecret);
    token.addGrant(voiceGrant);
    token.identity = identity;

    let resObj = {};
    resObj.identity = identity;
    resObj.token = token.toJwt();
    return res.status(200).json({
        status: true,
        success: true,
        message: i18n.__('CALL_TOKEN_SUCCESS'),
        data: resObj
    });
});