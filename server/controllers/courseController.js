import Stripe from "stripe";
import Course from "../models/Course.js";
import { Purchase } from "../models/Purchase.js";
import User from "../models/User.js";

// get All courses 
export const getAllCourse = async(req,res)=>{
    try {
        const course = await Course.find({isPublished: true}).select(['-courseContent','-enrolledStudents']).populate({path: 'educator'});

        res.json({success: true, course});
        
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

export const getCourseId = async(req,res)=>{
    const {id} = req.params;

    try {
        const courseData = await Course.findById(id).populate({path: 'educator'})

        // remove lacture url id isPreview is false
        courseData.courseContent.forEach(chapter =>{
            chapter.chapterContent.forEach(lecture =>{
                if(!lecture.isPreviewFree){
                    lecture.lectureUrl = "";
                }
            })
        })
        
        res.json({success: true, courseData});
    } catch (error) {
        res.json({ success: false, message: error.message });
    }
}

