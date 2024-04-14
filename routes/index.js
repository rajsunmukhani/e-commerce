var express = require('express');
var router = express.Router();
const localStrategy = require('passport-local');
const passport = require('passport');

const userModel = require('./users');
const productModel = require('./product');

const upload = require('./multer');
const Razorpay = require('razorpay');

var instance = new Razorpay({
  key_id: 'rzp_test_X2MjN8xhAZRBX8',
  key_secret: 'l4OYnvNAvu22ujl8VslOuGAt',
});

passport.use(new localStrategy(userModel.authenticate()));

//  GET
router.get('/login', function(req, res, next) {
  res.render('index');
});

router.get('/register', function(req, res, next) {
  res.render('register');
});


router.get('/', async function(req, res, next) {
  const products = await productModel.find();

  if (req.isAuthenticated()) {
      var total = 0;

      const user = await userModel.findOne({ username: req.user.username });
      
      user.cartItems.forEach(function(value){
        total += value
      })
      
      
      
      res.render('home', { user,products,total });
    } else {
      res.render('home', { user: null, products });
    }
});
  
  
  router.get('/adminDashboard', isSeller ,async function(req, res, next) {
    const user = await userModel.findOne({username : req.session.passport.user})
    res.render('adminDashboard',{user});
  });
  
  router.get('/logout', function(req,res,next){
    req.logout(function(err){
      if(err){
        return next(err);
      }else{
        res.redirect('/')
      }
    })
  });

  
  router.get('/viewCart',isLoggedIn ,async function(req, res, next){
    const user = await userModel.findOne({ username: req.session.passport.user });

    const cart = [];
    var totalPrice = 0;
    
    for (const [key, value] of user.cartItems) {
      const product = await productModel.findOne({ _id: key });
      cart.push({product,value});
    }

    cart.forEach(function (cartItem) {
      totalPrice += (cartItem.product.productPrice * cartItem.value);
    })

    res.render('viewCart',{user,cart,totalPrice});
  })

  
router.get('/view/:product', isLoggedIn, async function(req,res,next){
  const user = await userModel.findOne({username : req.session.passport.user})

  var total = 0;
  user.cartItems.forEach(function(value){
    total += value
  })

  const theProduct = await productModel.findOne({
    _id : req.params.product
  })

  res.render('particularProduct',{user,total,theProduct})
})


router.get('/addinwishlist/:id', isLoggedIn,async function(req,res,next){
    const user = await userModel.findOne({username : req.session.passport.user})

    user.wishlist.push(req.params.id);
    await user.save();
    
    res.json(user)
})



//POST
router.post('/register', function(req, res) {


  var userData = new userModel({
    name : req.body.name,
    username : req.body.username,
    email : req.body.email,
    isSeller : req.body.isSeller === 'seller' ? true : false
  })

  
  userModel.register(userData,req.body.password)
  .then(function(registeredUser){
    passport.authenticate("local")(req, res, function(){
      if(userData.isSeller === true){
        res.redirect('/adminDashboard')
      }else{
        res.redirect('/');
      }
    })
  })

});


router.post('/login', passport.authenticate('local', { 
  failureRedirect: '/' 
}), async function(req, res, next) {

      const loggedInUser = await userModel.findOne({ _id: req.user._id });

      if (loggedInUser && loggedInUser.isSeller === true) {
          return res.redirect('/adminDashboard');
      } else {
          return res.redirect('/');
      }
});


router.post('/productUpload', isSeller, upload.array("image",3) ,async function(req,res,next){

  const imageFilenames = req.files.map(file => file.filename)

  const product = await productModel.create({
    productName : req.body.name,
    productPrice : req.body.price,
    productDescription : req.body.description,
    productImage : imageFilenames
  })

  const user = await userModel.findOne({username : req.session.passport.user});
  user.productsUploadedAsSeller.push(product._id);

  await user.save();
  res.redirect('/adminDashboard')
})


router.post('/addItemsInCart',async function(req,res,next){
  
  const user = await userModel.findOne({username : req.body.loggedInUser});

  if(user.cartItems.has(req.body.productId)){
    var value = user.cartItems.get(req.body.productId);
    value = value + 1;
    user.cartItems.set(req.body.productId,value);

  }else{
    user.cartItems.set(req.body.productId,1);
  }

  await user.save();

  res.json(user)
});


router.post('/increaseItemQty', isLoggedIn ,async function(req,res){
    const user = await userModel.findOne({username : req.session.passport.user})
    
    if(user.cartItems.has(req.body.productId)){
      var value = user.cartItems.get(req.body.productId);
      value = value + 1;
      user.cartItems.set(req.body.productId,value);
    }
    
    await user.save();

    res.json(user)
});

router.post('/decreaseItemQty', isLoggedIn ,async function(req,res){
    const user = await userModel.findOne({username : req.session.passport.user})
    
    if(user.cartItems.has(req.body.productId)){
      var value = user.cartItems.get(req.body.productId);
      value = value - 1;
      user.cartItems.set(req.body.productId,value);
    }
    
    await user.save();

    res.json(user)
});


router.post('/create/orderId',function(req, res, next){
  var options = {
    amount: req.body.amount * 100,
    currency: "INR",
  };
  instance.orders.create(options, function(err, order) {
    res.send(order)
  });  
});


router.post('/api/payment/verify',function(req, res, next){
  var { validatePaymentVerification, validateWebhookSignature } = require('../node_modules/razorpay/dist/utils/razorpay-utils');

  const razorpayOrderId = req.body.response.razorpay_order_id;
  const razorpayPaymentId = req.body.response.razorpay_payment_id;
  const signature = req.body.response.razorpay_signature;
  const secret = 'l4OYnvNAvu22ujl8VslOuGAt'

  const result = validatePaymentVerification({"order_id": razorpayOrderId, "payment_id": razorpayPaymentId }, signature, secret);
  res.send(result);
});


router.post('/remove/:productId', isLoggedIn, async function(req, res, next){
  const user = await userModel.findOne({ username: req.session.passport.user });

  if(user.cartItems.has(req.params.productId)){
    user.cartItems.delete(req.params.productId);
  }

  await user.save();
  res.send(user)
});







// MIDDELWARE

function isLoggedIn(req,res,next){
  if(req.isAuthenticated()){
    return next();
  }
  res.redirect('/login')
}


async function isSeller(req, res, next) {
  if (!req.isAuthenticated()) {
      return res.redirect('/');
  }

  const user = await userModel.findOne({_id: req.user._id});

  if(user.isSeller) {
    return next();
  }else{
    return res.send('<script>alert("You are not a seller"); window.location.href = "/";</script>');
  }
}



module.exports = router;
