import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";

const app = express();
//we use app.use for middlewares only so whenever there is app.use(cors) so cors is middleware
app.use(
    cors({
        origin: process.env.CORS_ORIGIN,
        credentials: true,
    })
);

app.use(express.json({ limit: "16kb" }));
app.use(express.urlencoded({ limit: "16kb" }));
app.use(cookieParser());

export { app };
