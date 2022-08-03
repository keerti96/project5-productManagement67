const userModel = require("../model/userModel")
const mongoose = require('mongoose');
const orderModel = require("../model/orderModel");
const cartModel = require("../model/cartModel");

let isValidObjectId = function (objectId) {
    return mongoose.Types.ObjectId.isValid(objectId)
}

const isValidRequestBody = function (requestBody) {
    return Object.keys(requestBody).length > 0;
}

let validStatus = ['pending', 'completed', 'cancelled']

const createOrder = async function (req, res) {
    try {

        let userId = req.params.userId


        userId = userId.trim()
        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: " provide a valid userId " });

        let findUser = await userModel.findOne({ _id: userId })
        if (!findUser) return res.status(404).send({ status: false, message: " user not found" })

        if (userId != req.decodedtoken.userId)
            return res.status(403).send({ status: false, msg: 'User unauthorized!' })

        let data = req.body
        if (!isValidRequestBody(data)) {
            return res.status(400).send({ status: false, message: "request Body cant be empty" });
        }

        let { cartId, cancellable, status } = data

        if (!cartId) return res.status(404).send({ status: false, message: "please provide cartId" })
        let checkCart = await cartModel.findById({ _id: cartId }).select({ _id: 0, userId: 1, items: 1, totalPrice: 1, totalItems: 1 })
        if (!checkCart) return res.status(404).send({ status: false, message: " cart not found" })

        let totalQuantity = 0
        for (i in checkCart.items) {
            totalQuantity += checkCart.items[i].quantity
        }


        let newObj = {
            userId: checkCart.userId,
            items: checkCart.items,
            totalPrice: checkCart.totalPrice,
            totalItems: checkCart.totalItems,
            totalQuantity: totalQuantity,
            // cancellable:data.cancellable,
            // status: data.status
        }

        //let newObj = {...checkCart, totalQuantity: totalQuantity}

        if (status) {
            if (typeof status != "string") return res.status(400).send({ status: false, message: "Status field Invalid format" })
            if (!validStatus.includes(status)) return res.status(400).send({ status: false, message: "Status field should be one of these values: ('pending', 'completed', 'cancelled')" })
            newObj.status = status
        }
        if (cancellable) {
            if (typeof cancellable != Boolean) return res.status(400).send({ status: false, message: "Cancellable should be of Boolean type" })
            newObj.cancellable = cancellable;
        }

        let order = await orderModel.create(newObj)
        res.status(201).send({ status: true, message: "order created", data: order })

    } catch (err) {
        console.log(err)
        res.status(500).send({ status: false, message: err.message })
    }
}

const updateOrder = async function (req, res) {
    try {
        let userId = req.params.userId
        userId = userId.trim()

        if (!isValidObjectId(userId)) return res.status(400).send({ status: false, message: " provide a valid userId " });

        let findUser = await userModel.findById({ _id: userId })
        if (!findUser) return res.status(404).send({ status: false, message: " user not found" })

        //<=========Authorization===========>

        //check if the logged-in user is requesting to modify their own profile 
        if (userId != req.decodedtoken.userId)
            return res.status(403).send({ status: false, msg: 'User unauthorized!! loggedin is not allowed to modify the requested data' })


        if (!isValidRequestBody(req.body)) {
            return res.status(400).send({ status: false, message: "request Body cant be empty" });
        }
        let { orderId } = req.body

        if (!orderId) return res.status(400).send({ status: false, msg: "plz provide orderId" })
        if (!isValidObjectId(orderId)) return res.status(400).send({ status: false, message: " provide a valid orderId " });

        let findOrder = await orderModel.findOne({ _id: orderId, isDeleted: false })
        if (!findOrder) return res.status(404).send({ status: false, message: "order not found for this user!!" })
        
        if (userId != findOrder.userId) return res.status(403).send({ status: false, message: "Unauthorized access!! trying to access someone else's order" })

        // if(status){

        // }

        if (findOrder.status == 'cancelled') return res.status(400).send({ status: false, message: "this order is already cancelled!!!" })

        if (findOrder.cancellable == false) return res.status(400).send({ status: false, message: "cancel request denied!!!" })

        findOrder.status = 'cancelled';
        findOrder.deletedAt = Date.now();
        findOrder.save();

        return res.status(200).send({ status: true, message: "Updated successfully", data: findOrder })

    } catch (err) {
        console.log(err)
        res.status(500).send({ status: false, message: err.message })
    }

}

module.exports = { createOrder, updateOrder }