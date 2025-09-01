import express from 'express';
import cors from 'cors';
import 'dotenv/config'
import connectDB from './configs/mongodb.js';
import { clerkWebhooks } from './controllers/webhooks.js';

const app = express();

await connectDB();

app.use(cors());

app.get('/',(req,res)=>{
    res.send("hey")
});

app.post('/clerk', express.json(), clerkWebhooks)

const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
    console.log(`server running on ${PORT} port`);
});