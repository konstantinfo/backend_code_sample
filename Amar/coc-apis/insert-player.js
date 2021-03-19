/*
* function used to store COC player profile in to database
*/
const insertPlayers = function (listTags, isArchive, callback) {
    let unsuccessFullTag = [];
    listTags = _.uniq(listTags);
    let allClans = [];
    async.forEach(
        listTags,
        function (tag, cb) {
            if (tag) {
                let mainTag = tag;
                tag = tag.replace("#", "%23");
                tag = tag.trim()
                let url = `${apiUrl}players/${tag}`
                callApi(url, (err, data) => {
                    if (err) {
                        unsuccessFullTag.push(mainTag)
                        cb();
                    } else {
                        if (data.clan && data.clan.tag) {
                            allClans.push(data.clan.tag);
                        }
                        Player.findOneAndUpdate(
                            {
                                tag: data.tag
                            }, {
                            $set: data
                        }, {
                            new: true,
                            upsert: true
                        }
                        ).exec((err) => {
                            if (err) {
                                console.log(err)
                            }
                        });
                        cb();
                    }
                })

            } else {
                cb()
            }
        },
        function (err) {
            allClans = _.uniq(allClans);
            if (allClans.length > 0) {
                findAndInsertNewClans(allClans, (err, success) => {
                    callback(null, unsuccessFullTag);
                })
            } else {
                callback(null, unsuccessFullTag);
            }
        }
    )
}

const callApi = async function (url, callback) {
    axios.get(
        url, 
        {
        headers: {
            'Accept': 'application/json',
            'authorization': `Bearer ${cocToken}`,
        }
    }
    ).then(function (response) {
        if (response.status == 200) {
            let data = response.data;
            callback(null, data)
        } else {
            callback(true)
        }
    }).catch(function (error) {
        callback(true)
    })
}