/*
* function used to update user profile
*/

async function handle(cognito, dba, req, res) {
    try {
        let user = utils.extractUser(req);
        let handle = utils.generateHandle(req.body.data.name);
        let now = utils.getMysqlDateTime(new Date());
        const data = req.body && req.body.data;
        if (!user) {
            res.status(500).send({ result: 'error: no user' });
        }
        let user_data = await utils.readDbUser(dba, user);

        let isHandleExists = await utils.isHandleExists(dba, user_data, handle);

        if (isHandleExists != null) {
            return res.send({ error: 'User name already exists.' });
        }

        //if profile id exist then update profile otherwise insert profile data
        let result;
        if(user_data.profile_id){
            result = await utils.updateDbUser(dba, user_data, req, now);
        } else{
            result = await dba.user().updateProfile(user_data, data, now, user);
        }
        
        if (result) {
            let updatedData = await dba.user().getUserProfile(user);
            return res.json({ message: 'Profile updated successfully.', result: updatedData[0] });
        } else {
            throw 'error: profile update failed.';
        }


    } catch (e) {

        console.log('update user err ', e)
        res.status(500).send({ result: e.message });
    }
};

function putUser(cognito, dba) {
    return function (req, res) {
        handle(cognito, dba, req, res);
    };
}
module.exports = putUser;