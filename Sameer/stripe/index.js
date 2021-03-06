const express = require("express");
const router = express.Router();
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY);

/**
 * Set product data for stripe payment
 */
const products = [
  {
    uuid: 1,
    productName: "**********",
    productDescription: "**********",
    productPrice: 10.99,
  },
];

/**
 * Get index page
 */
router.get("/", (req, res, next) => {
  res.render("index", { title: "Express" });
});

/**
 * Product page
 */
router.get("/products/:uuid", (req, res, next) => {
  const productID = req.params.uuid;
  const product = products.filter((product) => {
    return parseInt(productID) === product.uuid;
  });
  if (product[0]) {
    return res.render("product", { productInfo: product[0] });
  }
  return res.send("Product does not exist.");
});

/**
 * Charge from stripe
 */
router.post("/charge", (req, res, next) => {
  const stripeToken = req.body.stripeToken;
  const price = req.body.price;
  const amount = req.body.price * 100;
  const productName = req.body.name;
  const product = products.filter((product) => {
    return (
      productName === product.productName &&
      parseFloat(price) === parseFloat(product.productPrice)
    );
  });

  if (product[0]) {
    stripe.charges.create(
      {
        card: stripeToken,
        currency: "usd",
        amount: amount,
      },
      (err, charge) => {
        if (err) {
          res.send("error");
        } else {
          res.send("success");
        }
      }
    );
  } else {
    console.log("Product name or price mismatch");
    res.send("error");
  }
});

module.exports = router;
