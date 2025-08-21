import mongoose, { connect } from "mongoose";
import {DB_NAME} from "../constants.js";


const connectDB = async () => {
    try {
        const dbInstance = await connect(`${process.env.MONGODB_URI}/${DB_NAME}`)
        console.log("MONGODB Connected ----> ", dbInstance.connection.host);
    } catch (error) {
      console.log("MONGODB Failed ----> ", error)
      process.exit(1);  
    }
}

export default connectDB;