import mongoose from "mongoose";

// connect to mongodb

const connectDB = async ()=>{
    mongoose.connection.on('connected',()=>{
        console.log('database connected');
    })
    await mongoose.connect(`${process.env.MONGODB_URI}/Edupath`);
}

export default connectDB