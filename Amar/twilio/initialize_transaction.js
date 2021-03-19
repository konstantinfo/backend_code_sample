/*
* function used to recharge user wallet
* paystack payment gateway used to debit amount from user saved card
*/

Router.post('initialize_transaction', async (req, res) => {
    const sessionUser = req.session.user;
    const params = req.body;
    const valError = Validation.validate(params, Validation.initialize_transaction);
    if (valError) { return res.badRequest('VALIDATION_ERROR', valError) }

    try{
        const user = User.findOne({ id: sessionUser.id }).exec();
        var email = user.email && user.email != "" ? user.email : `${user.formatted_number}`;

        const obj = {
          "email": email,
          "amount": parseFloat(params.amount)*100
        }

        request.post({
            url:"https://api.paystack.co/transaction/initialize",
            headers : {
                "authorization" : `Bearer ${process.env.PAYSTACK_SECRET}`,
                "content-type": "application/json"
            },
            form: obj
        }, function(err, httpResponse, body) {
          if(err){
            return res.serverError(err);
          }else if (body) {
            body = JSON.parse(body);
            Transaction.newTransaction({
              user: sessionUser.id,
              amount: 0,
              type: "credit",
              remarks: "wallet recharge through paystack",
              payment_gateway: "paystack",
              from: user.device_os,
              transaction_status: "pending",
              payment_description: "Wallet Recharge",
              order_id: body.data.reference,
              status: 0,
              user_type: sessionUser.role == 74 ? "doctor" : "patient"
            }, function (err) {
              return res.ok(body);
  
            })
          } else{
            return res.serverError("Unable to initilize");
          }
        })
    } catch(e) {
        res.status(500).send({ result: e.message });
    }
});