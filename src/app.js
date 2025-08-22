import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
//we use app.use for middlewares only so whenever there is app.use(cors) so cors is middleware
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })  //cors is used to enable Cross-Origin Resource Sharing which is a mechanism that allows restricted resources on a web page to be requested from another domain outside the domain from which the first resource was served.
);

app.use(express.json({ limit: "16kb" })); //express.json is used to parse incoming JSON requests in more simple words it means it takes the JSON data from the request body and makes it available in req.body
app.use(express.static("public")); //express.static is used to serve static files such as images, CSS files, and JavaScript files
app.use(express.urlencoded({ limit: "16kb" })); //express.urlencoded is used to parse incoming requests with urlencoded payloads in simple terms it means it takes the URL-encoded data from the request body and makes it available in req.body
app.use(cookieParser()); //cookieParser is used to parse cookies attached to the client request object


//routes import 

import userRouter from './routes/user.routes.js'

//routes declaration 
app.use("/api/v1/users",userRouter);


//https://localhost:8000/api/v1/users
export { app };
