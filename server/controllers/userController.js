import User from "../models/User.js";
import Stripe from "stripe";
import Course from "../models/Course.js";
import { Purchase } from "../models/Purchase.js";
import { CourseProgress } from "../models/CourseProgress.js";

// Get user data
export const getUserData = async(req,res)=>{
    try {
        const userId = req.auth.userId;
        const user = await User.findById(userId);

        if(!user){
            return res.json({success: false, message:'User Not Found'});
        }

        res.json({success: true, user});
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// user enrolled courses
export const userEnrolledCourses = async(req,res)=>{
    try {
        const userId = req.auth.userId;
        const userData = await User.findById(userId).populate("enrolledCourses");

        res.json({success: true, enrolledCourses: userData.enrolledCourses});
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const purchaseCourse = async(req,res)=>{
    try {
        const { courseId } = req.body;
        const { origin } = req.headers;
        const userId = req.auth.userId;
        const userData = await User.findById(userId);
        const courseData = await Course.findById(courseId);
        
        if(!userData || !courseData){
            res.json({success: false, message: 'Data Not Found'})
        }

        const purchaseData = {
            courseId: courseData._id,
            userId,
            amount: (courseData.coursePrice - courseData?.discount * courseData?.coursePrice / 100).toFixed(2),
        }
        const newPurchase = await Purchase.create(purchaseData)
        
        // stripe gateway initialize
        const stripInstance = new Stripe(process.env.STRIPE_SECRET_KEY);
        
        const currency = process.env.CURRENCY.toLowerCase();
        
        const line_items = [{
            price_data:{
                currency,
                product_data: {
                    name: courseData.courseTitle
                },
                unit_amount: Math.floor(newPurchase.amount) * 100
            },
            quantity: 1
        }]
        
        const session = await stripInstance.checkout.sessions.create({
            success_url: `${origin}/loading/my-enrollments`,
            cancel_url: `${origin}/`,
            line_items: line_items,
            mode: 'payment',
            metadata: {
                purchaseId: newPurchase._id.toString()
            }
        })

        res.json({success: true, session_url: session.url})

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

const stripInstance = new Stripe(process.env.STRIPE_SECRET_KEY);


export const stripeWebhooks = async(req,res)=>{
    const sig = req.headers['stripe-signature'];
    let event;

    try {
        event = Stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET);
  }
  catch (err) {
    res.status(400).send(`Webhook Error: ${err.message}`);
  }


  switch (event.type) {
    case 'payment_intent.succeeded':{
      const paymentIntent = event.data.object;
      const paymentIntentId = paymentIntent.id;

      const session = await stripInstance.checkout.sessions.list({
        payment_intent: paymentIntentId
      })

      const { purchaseId } = session.data[0].metadata;

      const purchaseData = await Purchase.findById(purchaseId);
      const userData = await User.findById(purchaseData.userId);
      const courseData = await Course.findById(purchaseData.courseId.toString());

      courseData.enrolledStudents.push(userData);
      await courseData.save();

      userData.enrolledCourses.push(courseData._id);
      await userData.save();

      purchaseData.status = 'completed'
      await purchaseData.save();

      break;
    }
    case 'payment_intent.payment_failed':{
        const paymentIntent = event.data.object;
        const paymentIntentId = paymentIntent.id;
        const session = await stripInstance.checkout.sessions.list({
        payment_intent: paymentIntentId
        })

        const { purchaseId } = session.data[0].metadata;
        const purchaseData = await Purchase.findById(purchaseId);
        purchaseData.status = 'failed'
        await purchaseData?.save();

    }
    // ... handle other event types
    default:
      console.log(`Unhandled event type ${event.type}`);
  }
  
  res.json({recieved: true});
}

// Update user course progress
export const updateUserCourseProgress = async (req,res)=>{
    try {
        const userId = req.auth.userId;
        const { courseId, lectureId } = req.body;

        const progressData = await CourseProgress.findOne({ userId, courseId});

        if(progressData){
            if(progressData.lectureCompleted.includes(lectureId)){
                res.json({success: true, message: 'Lectures Already Completed'})
            }
            progressData.lectureCompleted.push(lectureId)
            await progressData.save();
        }else {
            await CourseProgress.create({
                userId,
                courseId,
                lectureCompleted: [lectureId]
            })
        }

        res.json({success: true, message: 'Progress updated'})
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const getUserCourseProgress = async(req,res) =>{
    try {
        const userId = req.auth.userId;
        const { courseId } = req.body;
        const progressData = await CourseProgress.findOne({ userId, courseId});
        res.json({succese: true, progressData})

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const addUserRating = async(req,res)=>{
        const userId = req.auth.userId;
        const { courseId, rating }= req.body;

        if(!courseId || !userId || !rating || rating < 1 || rating > 5){
            res.json({ success: false, message: 'Invalid Details'});
        }

        try {
            const course = await Course.findById(courseId);

            if(!course){
                return res.json({ success: false, message: 'Course Not Found.'});
            }
            
            const user = await User.findById(userId);
            
            if(!user || !user.enrolledCourses.includes(courseId)){
                return res.json({ success: false, message: 'User has not purchased course'});
            }

            const exitingRatingIndex = course.courseRatings.findIndex(r => r.userId === userId)

            if(exitingRatingIndex > -1){
                course.courseRatings[exitingRatingIndex].rating = rating;
            }else{
                course.courseRatings.push({userId, rating});
            }

            await course.save();

            return res.json({success: true, message: 'Rating added'});
        } catch (error) {
            res.json({ success: false, message: error.message });
        }
}