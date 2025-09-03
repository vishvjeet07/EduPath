import express from "express";
import { getUserData, purchaseCourse, userEnrolledCourses } from "../controllers/userController.js";

const userRouter = express.Router();

userRouter.get('/data',getUserData);
userRouter.get('/enrolledCourses',userEnrolledCourses);
userRouter.post('/purchase',purchaseCourse);

export default userRouter;