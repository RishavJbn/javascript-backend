import "dotenv/config"; // this automatically runs dotenv.config()
import { app } from "./app.js";
// import express from "express";
import connectDB from "./db/index.js";

// const app = express();
const port = process.env.PORT || 3000;


connectDB()
.then(()=> {
  app.listen(port, () => {
      console.log(`Server running at http://localhost:${port}  \n Jai Bhole Nath`);
  });
})
.catch((error) => {
    console.log("MONGODB CONNECTION ERROR:", error);
});
 