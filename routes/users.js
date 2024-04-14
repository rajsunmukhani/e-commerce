const mongoose = require('mongoose');

const plm = require('passport-local-mongoose');

mongoose.connect("mongodb://127.0.0.1:27017/e-com");

const userSchema = mongoose.Schema({
  username : String,
  email : String,
  name : String,
  password : String,
  isSeller : {
    type : Boolean,
    default : false
  },
  cartItems : {
    type : Map,
    of : Number,
    default : {}
  },
  productsUploadedAsSeller : [{
    type : mongoose.Schema.Types.ObjectId,
    ref : 'product'
  }],
  wishlist : [{
    type : mongoose.Schema.Types.ObjectId,
    ref : 'product'
  }]
});


userSchema.plugin(plm)

module.exports = mongoose.model("user",userSchema);