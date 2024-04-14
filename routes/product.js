const mongoose = require('mongoose');

const productSchema = mongoose.Schema ({
    productName : String,
    productDescription : String,
    productPrice : Number,
    productImage : [{
        type : String,
        ref : 'product'
    }],
});

module.exports = mongoose.model("product" , productSchema);