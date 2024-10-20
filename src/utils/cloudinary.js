import { v2 as cloudinary } from "cloudinary";
import fs from "fs"
import dotenv from "dotenv";
dotenv.config();

// console.log(process.env.CLOUDINARY_API_SECRET)
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME, 
    api_key: process.env.CLOUDINARY_API_KEY,                 //624534957449732, 
    api_secret: process.env.CLOUDINARY_API_SECRET
})

const uploadOnCloudinary = async (localFilePath)=>{
    try{
        // console.log(process.env.CLOUDINARY_API_KEY);
        if(!localFilePath)return null;
        //upload
        const response = await cloudinary.uploader.upload(localFilePath, {
            resource_type:"auto"
        })
        //uploaded
        console.log("file is uploaded on cloudinary here", response)
        if (fs.existsSync(localFilePath))
          fs.unlinkSync(localFilePath)
        return response;

    }
    catch(error){
        fs.unlinkSync(localFilePath);
        // console.log("here")
        console.log("error while uploading file on cloudinary", error);
        return null;
    }
}
const deleteFromCloudinary = async(url) =>{
    try {
        if (!url) {
          return null;
        }
        //url -  http://res.cloudinary.com/govindd/image/upload/v1714807250/qsam76bowwz9gnzwmkch.jpg
        // Extract public ID from the URL
        const publicId = url.split("/").pop().split(".")[0];
        console.log("public ID:", publicId);
    
        // Determine the resource type based on the file extension
        const fileType = url.split(".").pop(); // Get the file extension
        let resourceType;
        if (fileType === "mp4" || fileType === "mov" || fileType === "avi") {
          resourceType = "video";
        } else {
          resourceType = "image";
        }
    
        // Delete the file on Cloudinary
        const response = await cloudinary.uploader.destroy(publicId, {
          type: "upload",
          resource_type: resourceType,
        });
    
        console.log("Cloudinary response for delete:", response);
        return response;
      } catch (error) {
        console.log("Error in deleting file on Cloudinary:", error);
        return null;
      }
}

export {
    uploadOnCloudinary,
    deleteFromCloudinary
}