/*
* function used to add product
*/

async function postHandle(dba, req, res) { 
    try{
        let now = utils.getMysqlDateTime(new Date());
        let user = await utils.getRequestDbUser(req, dba);
        if (!user || !user.id) {
            throw 'error: no user in DB';
        }
        console.log(req);
        const data = req.body && req.body.data;
        if(!isDataValid(data)){
            throw 'Invalid data';
        }

        const handle = await generateUrlHandle(dba, data.name);
        console.log(handle);
        let result = await dba.product().insertProduct(data, handle, user, 'published', now);
        
        console.log(result);
        if (result && result[0] && result[0].insertId){
            let newProduct = await dba.product().getProductById(result[0].insertId);
            console.log("new product:");
            console.log(newProduct[0]);
            await dba.product().indexProduct(result[0].insertId, newProduct[0], 'true');
            return res.json({ message: 'Created the product successfully.', result: newProduct[0] });
        }else{
            throw 'error: Insert failed.';
        }
        
    }catch(e){
        console.log(e)
        res.status(500).send({error: e});
    }
}


function postProduct(dba) {
    return function (req, res) {
        postHandle(dba, req, res);
    };
}

module.exports = {
    postProduct: postProduct
};