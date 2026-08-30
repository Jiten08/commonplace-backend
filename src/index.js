import dotenv from "dotenv"
import connectDB from "./db/index.js";
import dns from 'node:dns';
dns.setServers(['8.8.8.8', '8.8.4.4']); // Google DNS server

dotenv.config({
  path: './env'
})

connectDB()
  .then(()=>{
    app.on("error", (error)=>{
      console.errror(error)
      process.exit(1)
    })
    app.listen(process.env.PORT || 8000, () => {
      console.log(`Server is running at port: ${process.env.PORT}`)
    })
  })
  .catch((err)=>{
    console.log('MONGO DB connection failed.', err)
  })