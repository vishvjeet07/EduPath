import { clerkClient } from '@clerk/express';
import Course from '../models/Course.js';
import { v2 as cloudinary } from 'cloudinary'
import { Purchase } from '../models/Purchase.js';
import User from '../models/User.js';


export const updateRoleToEducator = async (req,res) =>{
    try {
        const userId = req.auth.userId;

        await clerkClient.users.updateUserMetadata(userId, {
            publicMetadata: {
                role: 'educator'
            }
        });
        res.json({ success: true, message: "You can publish a course now"});

    } catch (error) {
        res.json({ success: false, message: error.message })
    }
}

// Add New Course

export const addCourse = async(req,res) =>{
    try {
        const { courseData } = req.body;
        const imageFile = req.file;
        const educatorId = req.auth.userId;

        if(!imageFile){
            return res.json({ success: false, message: 'Thumbnai  Not Attached'});
        }
        const parseCourseData = await JSON.parse(courseData);
        parseCourseData.educator = educatorId;
        const newCourse = await Course.create(parseCourseData);
        const imageUpload = await cloudinary.uploader.upload(imageFile.path);
        newCourse.courseThumbnail = imageUpload.secure_url
        await newCourse.save();

        res.json({ success: true, message: 'Course Added '});

    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Get Educator Courses

export const getEducatorCourses = async(req,res)=>{
    try {
        const educator = req.auth.userId;

        const courses = await Course.find({educator});
        res.json({success: true, courses})
        
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

// Get Educator Data
export const educatorDashboardData = async(req,res)=>{
    try {
        const educator = req.auth.userId;
        const courses = await Course.find({educator});
        const totalCourses = courses.length;

        const courseIds = courses.map(course => course._id);

        // calculate total earning
        const purchases = await Purchase.find({
            courseId: {$in: courseIds},
            status: 'completed'
        });

        const totalEarnings = purchases.reduce((sum,purchase)=> sum + purchase.amount, 0)
        
        // collect unique enrolled student id with their course title
        const enrolledStudentsData = [];
        for(const course of courses){
            const students = await User.find({
                _id: {$in: course.enrolledStudents}
            }, 'name imageUrl');

            students.forEach(student => {
                enrolledStudentsData.push({
                    courseTitle: course.courseTitle,
                    student
                })
            });
        }

        res.json({success: true, dashboardData: {
            totalEarnings, enrolledStudentsData, totalCourses
        }})
    } catch (error) {
        res.json({ success: false, message: error.message });
        
    }
}

// get enrolled students data with purchase
export const getEnrolledStudentsData = async(req,res)=>{
    try {
        const educator = req.auth.userId;
        const courses = await Course.find({educator});
        const courseIds = courses.map(course => course._id);

        const purchases = await Purchase.find({
            courseId: {$in: courseIds},
            status: 'completed' 
        }).populate('userId', 'name imageUrl').populate('courseId', 'courseTitle');

        const enrolledStudents = purchases.map(purchase => ({
            student: purchase.userId,
            courseTitle: purchase.courseId.courseTitle,
            purchaseDate: purchase.createdAt
        }));
        res.json({success: true, enrolledStudents});
        
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}