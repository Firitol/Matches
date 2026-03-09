// routes/like.js
const express = require("express")
const router = express.Router()
const Like = require("../models/Like")
const Match = require("../models/Match")

router.post("/", async(req,res)=>{
  const { fromUser, toUser, type } = req.body

  // Save the swipe
  await Like.create({ fromUser, toUser, type })

  if(type==="like") {
    // Check if toUser already liked fromUser
    const reciprocal = await Like.findOne({ fromUser: toUser, toUser: fromUser, type:"like" })
    if(reciprocal){
      // Create a match
      await Match.create({ users: [fromUser, toUser] })
      return res.json({ message: "It's a match!" })
    }
  }

  res.json({ message: "Swipe recorded" })
})

module.exports = router
