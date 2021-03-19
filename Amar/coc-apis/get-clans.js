/*
* function used to store active clans in to database
*/
const clanCron = function (page, callback) {
    getClansTag(page, (err, isNextPage) => {
        console.log("isNextPage==>", page, isNextPage)
        let nextPage = isNextPage;
        page++;
        if (!nextPage) {
            callback(null)
        } else {
            console.log("pageeee", page)
            clanCron(page, callback)
        }
    })
}
const getClansTag = function (page, callback) {
    console.log("page==>", page)
    let limit = 20000;
    let skip = 0;
    if (page != 0) {
        skip = page * limit;
    }
    let allTags = []
    Clan.find({})
        .select({ tag: 1 })
        .skip(skip)
        .limit(limit)
        .lean()
        .exec((err, allClans) => {
            if (err) { console.log("err", err) }
            if (allClans && allClans.length > 0) {
                async.forEach(
                    allClans,
                    function (clan, cb) {
                        allTags.push(clan.tag);
                        cb();
                    },
                    function (err) {
                        if (err) { console.log("err", err) }
                        let nextPage = true
                        if (allTags.length < limit) {
                            nextPage = false
                        }
                        console.log("allTagsClans==>", allTags)

                        //callback(null, nextPage)

                        insertClans(allTags, false, () => {
                            callback(null, nextPage)
                        })

                    }
                )
            } else {
                let nextPage = false
                callback(null, nextPage)
            }
        })

}

const insertClans = function (listTags, isArchive, callback) {
    let unsuccessFullTag = [];
    async.eachSeries(
        listTags,
        function (tag, cb) {
            let v1 = moment.now();
            if (tag) {
                insertClan(tag, isArchive, (err) => {
                    let v2 = moment.now();
                    if (err) {
                        unsuccessFullTag.push(tag);
                        cb();
                    } else {
                        let timeTaken = (v2 - v1) / 1000;
                        if (timeTaken > 1) {
                            cb()
                        } else {
                            setTimeout(() => {
                                cb();
                            }, 1000)
                        }
                    }
                })
            } else {
                cb()
            }
        },
        function (err) {
            callback(null, unsuccessFullTag);
        }
    )

}