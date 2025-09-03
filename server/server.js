import express, { application, json } from 'express'
import cors from 'cors'
import 'dotenv/config'
import connectDB from './configs/mongodb.js'
import { clerkWebhooks } from './controllers/webhooks.js'
import educatorRouter from './routes/educatorRoute.js'
import { clerkMiddleware } from '@clerk/express'
import connectCloudinary from './configs/cloudinary.js'
import courseRouter from './routes/courseRoute.js'
import userRouter from './routes/userRoute.js'
import { stripeWebhooks } from './controllers/userController.js'

const app = express();

await connectDB();
await connectCloudinary();

app.use(cors());
app.use(clerkMiddleware());

app.get('/',(req,res)=>{
    res.send("hey")
});

app.post('/clerk',express.json(), clerkWebhooks)
app.use('/api/educator',express.json(),educatorRouter);
app.use('/api/course',express.json(),courseRouter);
app.use('/api/user',express.json(),userRouter);
app.post('/stripe',express.raw({ type: 'application/json'}), stripeWebhooks);


const PORT = process.env.PORT || 3000;

app.listen(PORT,()=>{
    console.log(`server running on ${PORT} port`);
});