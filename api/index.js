const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");

const app = express();

app.use(cors());
app.use(express.json());

const SECRET = process.env.JWT_SECRET || "demo_secret";

let users = [
{
id:"1",
name:"Demo One",
email:"demo1@ethiomatch.com",
password:bcrypt.hashSync("123456")
},
{
id:"2",
name:"Demo Two",
email:"demo2@ethiomatch.com",
password:bcrypt.hashSync("123456")
}
];

app.get("/api/test",(req,res)=>{

res.json({
status:"OK",
message:"EthioMatch API Running"
})

})

app.post("/api/auth/login",(req,res)=>{

const {email,password}=req.body;

const user=users.find(u=>u.email===email);

if(!user){

return res.status(401).json({
success:false
})

}

const valid=bcrypt.compareSync(password,user.password);

if(!valid){

return res.status(401).json({
success:false
})

}

const token=jwt.sign({
id:user.id,
email:user.email
},SECRET);

res.json({

success:true,
user:{
id:user.id,
name:user.name
},
token

})

})

module.exports=app;
